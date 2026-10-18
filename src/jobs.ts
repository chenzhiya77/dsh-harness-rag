import type { Context } from 'cordis'
import { api } from './http.ts'
import type { Config } from './settings.ts'

/**
 * T4 摄取通道（spec 2026-10-19）：把「上传文档」「重建索引」两条长任务注册成
 * 宿主后台任务（`ctx.jobs`），在会话头部的任务名册里呈现进度与失败，并允许
 * 用户停止跟踪。后端（Harness RAG 服务）照旧干摄取的重活——这里只是观察者：
 * 轮询既有 REST 面、按阶段发布 progress/log、到终态结算；任何一步失败都软着陆
 * （没有 jobs 服务、启动被拒、轮询出错都不影响面板既有行为）。
 */

const POLL_MS = 3000
const MAX_POLL_FAILURES = 5
const WATCH_LIMIT_MS = 2 * 60 * 60 * 1000
const REINDEX_START_GRACE_POLLS = 3
/** 静默结算 wait 的时长：覆盖整个观察上限；结算时若有等待者，宿主侧就不向
 * 拥有者 agent 播报该 job 的完成（契约明说「无论哪个插件在等待」），所以摄取
 * 完成不会注入对话、也不会唤醒空闲会话。 */
const SILENT_WAIT_MS = WATCH_LIMIT_MS + 60 * 60 * 1000

interface JobOutcome {
  status: 'completed' | 'killed' | 'failed'
  detail?: string
}

interface JobHandle {
  id: string
  append(text: string, options?: { channel?: 'stdout' | 'stderr' | 'log' }): void
  updateProgress(line: string): void
}

interface JobSpec {
  kind: string
  label: string
  owner?: string
  run(handle: JobHandle): { done: Promise<JobOutcome>; cancel?: (reason: string) => void }
}

interface JobView {
  status?: string
}

interface JobsRegistry {
  start(spec: JobSpec): string
  wait(id: string, timeoutMs: number, caller?: string, signal?: AbortSignal): Promise<JobView>
}

interface Watch {
  done: Promise<JobOutcome>
  cancel(reason: string): void
}

export interface DocumentNotice {
  sessionId: string
  kbId: string
  doc: Record<string, unknown>
}

export interface ReindexNotice {
  sessionId: string
  kbId: string
  kbLabel: string
}

export interface IngestJobs {
  noteDocument(notice: DocumentNotice): void
  noteReindex(notice: ReindexNotice): void
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const asNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

const stageLine = (status: string): string => (status === 'uploaded' ? 'queued' : status)

const progressLine = (status: string, doc: Record<string, unknown>): string => {
  if (status === 'indexing') {
    const percent = asNumber(doc.progress_percent)
    return percent > 0 ? `indexing ${percent}%` : 'indexing'
  }
  return stageLine(status)
}

const documentReadyOutcome = (doc: Record<string, unknown>): JobOutcome => {
  const slices = typeof doc.chunk_count === 'number' ? ` · ${doc.chunk_count} slices` : ''
  const legs = asRecord(doc.path_status)
  const degraded = legs !== null && Object.values(legs).some((state) => state === 'degraded')
  return { status: 'completed', detail: `ready${slices}${degraded ? ' · some paths degraded' : ''}` }
}

const documentFailedOutcome = (doc: Record<string, unknown>): JobOutcome => {
  const legs = asRecord(doc.path_status)
  const failed = legs === null ? [] : Object.entries(legs).filter(([, state]) => state === 'failed').map(([leg]) => leg)
  return { status: 'failed', detail: failed.length > 0 ? `failed · ${failed.join(', ')}` : 'failed' }
}

const reindexOutcome = (lastRun: string | null): JobOutcome => {
  if (lastRun === 'failed') return { status: 'failed', detail: 'rebuild failed' }
  if (lastRun === 'succeeded') return { status: 'completed', detail: 'rebuild succeeded' }
  return { status: 'completed', detail: 'rebuild finished' }
}

const reindexProgressLine = (state: Record<string, unknown>): string => {
  const progress = asRecord(state.progress)
  if (progress === null) return 'rebuilding'
  const vectors =
    asNumber(progress.chunks_indexed) +
    asNumber(progress.entities_indexed) +
    asNumber(progress.wiki_entries_indexed) +
    asNumber(progress.cards_indexed)
  return `rebuilding ${asNumber(progress.documents_done)}/${asNumber(progress.documents_total)} · ${vectors} vectors`
}

/** 文档清单是裸数组（面板同一取数面）；兼容对象包数组以防服务端形状回归。 */
const findDocument = (payload: unknown, docId: string): Record<string, unknown> | null => {
  const boxed = asRecord(payload)
  const items = Array.isArray(payload) ? payload : boxed !== null && Array.isArray(boxed.documents) ? (boxed.documents as unknown[]) : null
  if (items === null) return null
  for (const item of items) {
    const doc = asRecord(item)
    if (doc !== null && doc.id === docId) return doc
  }
  return null
}

/** 观察循环骨架：一次采样返回 JobOutcome 即幂等结算，返回 'poll' 则 POLL_MS 后再采样；
 * cancel 立即结算 killed。骨架的 catch 是安全网（观察器自身不抛）。 */
type TickResult = JobOutcome | 'poll'

const makeWatch = (tick: () => Promise<TickResult> | TickResult): Watch => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  let settle: ((outcome: JobOutcome) => void) | null = null
  const finish = (outcome: JobOutcome): void => {
    if (stopped) return
    stopped = true
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    if (settle !== null) {
      const resolve = settle
      settle = null
      resolve(outcome)
    }
  }
  const step = async (): Promise<void> => {
    if (stopped) return
    let result: TickResult
    try {
      result = await tick()
    } catch (error) {
      finish({ status: 'failed', detail: `watch failed: ${error instanceof Error ? error.message : String(error)}` })
      return
    }
    if (stopped) return
    if (result === 'poll') {
      timer = setTimeout(() => void step(), POLL_MS)
      return
    }
    finish(result)
  }
  const done = new Promise<JobOutcome>((resolve) => {
    settle = resolve
    void step()
  })
  return {
    done,
    cancel: () => finish({ status: 'killed', detail: 'tracking stopped; the ingest continues on the server' }),
  }
}

const watchDocument = (config: Config, handle: JobHandle, kbId: string, docId: string, initialStatus: string): Watch => {
  let failures = 0
  let lastStage = ''
  const startedAt = Date.now()
  handle.updateProgress(progressLine(initialStatus, {}))
  return makeWatch(async () => {
    if (Date.now() - startedAt > WATCH_LIMIT_MS) return { status: 'failed', detail: 'watch timed out' }
    let payload: unknown
    try {
      payload = await api(config, `/api/knowledge-bases/${encodeURIComponent(kbId)}/documents`)
      failures = 0
    } catch {
      failures += 1
      return failures >= MAX_POLL_FAILURES ? { status: 'failed', detail: 'knowledge service unreachable' } : 'poll'
    }
    const doc = findDocument(payload, docId)
    if (doc === null) return { status: 'failed', detail: 'document was removed' }
    const status = typeof doc.status === 'string' ? doc.status : ''
    if (!status) return 'poll'
    // 输出环按阶段粒度记（百分比只走实时 progress 行，防每片一行的噪声）。
    const stage = stageLine(status)
    if (stage !== lastStage) {
      lastStage = stage
      handle.append(`${stage}\n`, { channel: 'log' })
    }
    if (status === 'ready') return documentReadyOutcome(doc)
    if (status === 'failed') return documentFailedOutcome(doc)
    handle.updateProgress(progressLine(status, doc))
    return 'poll'
  })
}

const watchReindex = (config: Config, handle: JobHandle, kbId: string): Watch => {
  let failures = 0
  let sawRunning = false
  let polls = 0
  let loggedStart = false
  const startedAt = Date.now()
  handle.updateProgress('rebuilding')
  return makeWatch(async () => {
    if (Date.now() - startedAt > WATCH_LIMIT_MS) return { status: 'failed', detail: 'watch timed out' }
    let payload: unknown
    try {
      payload = await api(config, `/api/knowledge-bases/${encodeURIComponent(kbId)}/reindex/status`)
      failures = 0
    } catch {
      failures += 1
      return failures >= MAX_POLL_FAILURES ? { status: 'failed', detail: 'knowledge service unreachable' } : 'poll'
    }
    const state = asRecord(payload) ?? {}
    const lastRun = typeof state.last_run === 'string' ? state.last_run : null
    if (state.in_progress === true) {
      sawRunning = true
      if (!loggedStart) {
        loggedStart = true
        handle.append('rebuilding\n', { channel: 'log' })
      }
      handle.updateProgress(reindexProgressLine(state))
      return 'poll'
    }
    if (sawRunning) return reindexOutcome(lastRun)
    // 未见过 in_progress：派发在毫秒级、6s 宽限内仍未见，就按 last_run 判
    //（陈旧值理论窗不可达，见 spec §6 残差②）。
    polls += 1
    if (polls >= REINDEX_START_GRACE_POLLS) {
      return lastRun === 'succeeded' || lastRun === 'failed' ? reindexOutcome(lastRun) : { status: 'failed', detail: 'the rebuild did not start' }
    }
    return 'poll'
  })
}

export function registerIngestJobs(ctx: Context, config: Config): IngestJobs {
  let warned = false
  const warnOnce = (error: unknown): void => {
    if (warned) return
    warned = true
    const message = `harness-rag: background ingest jobs unavailable (${error instanceof Error ? error.message : String(error)})`
    const logger = (ctx as unknown as { logger?: { warn?: (text: string) => void } }).logger
    if (logger && typeof logger.warn === 'function') logger.warn(message)
    else console.warn(message)
  }
  const registry = (): JobsRegistry | null => {
    try {
      const service = (ctx as unknown as { get?: (name: string) => unknown }).get?.('jobs')
      return service !== null && service !== undefined && typeof (service as JobsRegistry).start === 'function'
        ? (service as JobsRegistry)
        : null
    } catch (error) {
      warnOnce(error)
      return null
    }
  }
  /** 结算不被宿主播报：发起一次覆盖全程的 wait（超时未结算＝观察上限内不可达，续一拍收尾）。 */
  const suppressSettledNotice = (jobs: JobsRegistry, id: string, owner: string | undefined): void => {
    const arm = (): void => {
      void jobs.wait(id, SILENT_WAIT_MS, owner).then(
        (view) => {
          if (view && (view.status === 'running' || view.status === 'stopping')) arm()
        },
        () => {},
      )
    }
    arm()
  }
  /** 启动回退链：会话归属（进本会话名册）→ 无主（全局名册）→ 静默跳过。 */
  const launch = (input: { kind: string; label: string; owner: string; start: (handle: JobHandle) => Watch }): void => {
    const jobs = registry()
    if (jobs === null) return
    const owners: Array<string | undefined> = input.owner ? [input.owner, undefined] : [undefined]
    let failure: unknown = null
    for (const owner of owners) {
      try {
        const id = jobs.start({
          kind: input.kind,
          label: input.label,
          ...(owner === undefined ? {} : { owner }),
          run: (handle) => {
            const watch = input.start(handle)
            return { done: watch.done, cancel: (reason: string) => watch.cancel(reason) }
          },
        })
        suppressSettledNotice(jobs, id, owner)
        return
      } catch (error) {
        failure = error
      }
    }
    warnOnce(failure)
  }
  return {
    noteDocument: (notice) => {
      const docId = typeof notice.doc.id === 'string' ? notice.doc.id : ''
      if (!docId || !notice.kbId) return
      const name = typeof notice.doc.name === 'string' && notice.doc.name ? notice.doc.name : 'document'
      const initialStatus = typeof notice.doc.status === 'string' ? notice.doc.status : 'uploaded'
      launch({
        kind: 'hrag-ingest',
        label: name,
        owner: notice.sessionId,
        start: (handle) => watchDocument(config, handle, notice.kbId, docId, initialStatus),
      })
    },
    noteReindex: (notice) => {
      if (!notice.kbId) return
      const label = notice.kbLabel.trim() ? notice.kbLabel.trim() : notice.kbId
      launch({
        kind: 'hrag-reindex',
        label,
        owner: notice.sessionId,
        start: (handle) => watchReindex(config, handle, notice.kbId),
      })
    },
  }
}
