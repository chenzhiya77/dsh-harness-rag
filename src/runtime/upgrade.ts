import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DownloadProgress } from './download.ts'
import {
  readCurrent,
  sanitizeFailed,
  sanitizeUpgrade,
  writeCurrent,
  type FailedRecord,
  type RuntimePack,
  type UpgradeRecord,
  type UpgradeState,
} from './manifest.ts'
import { runtimeDir, stateDir } from './paths.ts'
import { sanitizeService, type ServiceRecord } from './process.ts'
import {
  forgetSupervisor,
  leaseHeldByOther,
  type EnsureStep,
  type RuntimeStatusView,
  type RuntimeUpgradeView,
  type Supervisor,
} from './supervisor.ts'
import { RUNTIME_MANIFEST } from './zip.ts'

export interface UpgradeTarget {
  version: string
  pack: RuntimePack
  configVersion: number
}

export interface UpgradeProvisionHooks {
  signal: AbortSignal
  onProgress: (progress: DownloadProgress) => void
}

export interface UpgradeCoordinatorOptions {
  root: string
  target: UpgradeTarget | null
  targetError?: { code: string; detail?: string }
  headless: boolean
  supervisorFor: (version: string) => Supervisor
  provision: (version: string, hooks: UpgradeProvisionHooks) => Promise<EnsureStep>
  /** Task 3 supplies the switch and rollback; until then the decision is kept. */
  activate?: (target: Supervisor, fromVersion: string) => Promise<RuntimeStatusView>
  now?: () => string
  isAlive?: (pid: number) => boolean
  log?: (message: string) => void
}

export interface UpgradeCoordinator {
  status(): RuntimeStatusView
  ensure(): Promise<RuntimeStatusView>
  retry(): Promise<RuntimeStatusView>
  confirm(): RuntimeStatusView
  /** Release this coordinator's supervisors. `forget` also drops the registry
   * entries: only a root change wants that; a reload must find them again. */
  dispose(forget?: boolean): void
}

export class UpgradeOpError extends Error {
  readonly kind: string

  constructor(kind: string, detail: string) {
    super(detail)
    this.kind = kind
  }
}

const upgradePath = (root: string): string => join(stateDir(root), 'upgrade.json')

const failedPath = (root: string, version: string): string => join(stateDir(root), `failed-${version}.json`)

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.tmp-${process.pid}`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(temp, path)
}

function readUpgradeRecord(root: string): UpgradeRecord | null {
  return sanitizeUpgrade(readJson(upgradePath(root)))
}

function readFailedRecord(root: string, version: string): FailedRecord | null {
  return sanitizeFailed(readJson(failedPath(root, version)))
}

function readServiceRecord(root: string): ServiceRecord | null {
  return sanitizeService(readJson(join(stateDir(root), 'service.json')))
}

function installed(root: string, version: string): boolean {
  return existsSync(join(runtimeDir(root, version), RUNTIME_MANIFEST))
}

function configVersionOf(root: string, version: string): number | null {
  const raw = readJson(join(runtimeDir(root, version), RUNTIME_MANIFEST)) as { configVersion?: unknown } | null
  const value = raw?.configVersion
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

export function createUpgradeCoordinator(options: UpgradeCoordinatorOptions): UpgradeCoordinator {
  const root = options.root
  const target = options.target
  const now = options.now ?? (() => new Date().toISOString())
  const created = new Map<string, Supervisor>()

  const initialCurrent = readCurrent(root)
  let view: RuntimeStatusView = {
    phase: 'idle',
    adopted: false,
    runtimeVersion: initialCurrent?.runtimeVersion ?? '',
    root,
    logTail: '',
  }
  let upgrade = initialUpgrade()
  let running: Supervisor | null = null
  let ensuring: Promise<RuntimeStatusView> | null = null
  let preparing: Promise<void> | null = null
  let abortController: AbortController | null = null
  let prepError: { phase: string; code: string; detail?: string } | undefined
  let prepared = target ? installed(root, target.version) : false
  let foreignLease = false
  let needsConfirm = false
  let disposed = false

  function initialUpgrade(): RuntimeUpgradeView | undefined {
    if (!target) return undefined
    const record = readUpgradeRecord(root)
    if (!record || record.targetVersion !== target.version) return undefined
    return {
      state: record.state,
      fromVersion: record.fromVersion,
      targetVersion: record.targetVersion,
      configVersionChanged: record.configVersion !== target.configVersion,
      requiresConfirmation: record.state === 'needs_confirmation',
      error: record.error,
    }
  }

  const status = (): RuntimeStatusView => ({ ...view, upgrade })

  const supervisorFor = (version: string): Supervisor => {
    let supervisor = created.get(version)
    if (!supervisor) {
      supervisor = options.supervisorFor(version)
      created.set(version, supervisor)
    }
    return supervisor
  }

  const publishView = (next: RuntimeStatusView): void => {
    view = { ...next }
  }

  const removeUpgrade = (): void => {
    rmSync(upgradePath(root), { force: true })
  }

  const baseUpgrade = (fromVersion: string, configChanged: boolean, confirm: boolean): RuntimeUpgradeView => ({
    state: 'pending',
    fromVersion,
    targetVersion: target?.version ?? '',
    configVersionChanged: configChanged,
    requiresConfirmation: confirm,
  })

  const persist = (fromVersion: string, state: UpgradeState, error?: RuntimeUpgradeView['error']): void => {
    if (!target) return
    const existing = readUpgradeRecord(root)
    const record: UpgradeRecord = {
      version: 1,
      targetVersion: target.version,
      fromVersion,
      configVersion: target.configVersion,
      state,
      requestedAt: existing?.targetVersion === target.version ? existing.requestedAt : now(),
      updatedAt: now(),
    }
    if (existing?.targetVersion === target.version && existing.confirmedConfigVersion !== undefined) {
      record.confirmedConfigVersion = existing.confirmedConfigVersion
    }
    if (error) record.error = error
    writeJson(upgradePath(root), record)
  }

  /** Background provisioning for a healthy old service: the old stack keeps
   * answering while the next version's pack lands. */
  const startPrepare = (fromVersion: string, configChanged: boolean, confirm: boolean): void => {
    if (!target || prepared || preparing || prepError) return
    const base = baseUpgrade(fromVersion, configChanged, confirm)
    const controller = new AbortController()
    abortController = controller
    preparing = (async () => {
      const outcome = await options.provision(target.version, {
        signal: controller.signal,
        onProgress: (progress) => {
          upgrade = { ...(upgrade ?? base), progress }
        },
      })
      if (outcome.kind !== 'ok') {
        prepError = {
          phase: 'prepare',
          code: outcome.kind === 'aborted' ? 'aborted' : outcome.code,
          detail: outcome.kind === 'aborted' ? undefined : outcome.detail,
        }
        upgrade = { ...base, state: 'blocked', error: prepError }
        persist(fromVersion, 'blocked', prepError)
        return
      }
      prepared = true
      const state: UpgradeState = foreignLease ? 'blocked' : confirm ? 'needs_confirmation' : 'ready'
      const error = foreignLease
        ? { phase: 'lease', code: 'upgrade_blocked_by_instance' }
        : undefined
      upgrade = { ...base, state, error }
      persist(fromVersion, state, error)
    })()
      .catch((error) => {
        prepError = {
          phase: 'prepare',
          code: 'provision_failed',
          detail: error instanceof Error ? error.message : String(error),
        }
        upgrade = { ...base, state: 'blocked', error: prepError }
        persist(fromVersion, 'blocked', prepError)
      })
      .finally(() => {
        preparing = null
        if (abortController === controller) abortController = null
      })
  }

  const run = async (): Promise<RuntimeStatusView> => {
    if (disposed) return status()
    const current = readCurrent(root)
    const service = readServiceRecord(root)
    let currentVersion = current?.runtimeVersion ?? service?.runtimeVersion ?? null

    // A healthy service is the authority on what runs (the service/current
    // write order leaves a window where current lags behind).
    if (current && service && service.runtimeVersion !== current.runtimeVersion) {
      const serviceSupervisor = supervisorFor(service.runtimeVersion)
      if (await serviceSupervisor.probe()) {
        if (installed(root, service.runtimeVersion)) {
          writeCurrent(
            root,
            { runtimeVersion: service.runtimeVersion, previousVersion: current.runtimeVersion },
            now,
          )
          currentVersion = service.runtimeVersion
        } else {
          running = serviceSupervisor
          publishView(await serviceSupervisor.ensure())
          upgrade = {
            state: 'blocked',
            fromVersion: current.runtimeVersion,
            targetVersion: service.runtimeVersion,
            configVersionChanged: false,
            requiresConfirmation: false,
            error: { phase: 'current', code: 'state_version_conflict', detail: service.runtimeVersion },
          }
          return status()
        }
      }
    }

    if (!target) {
      if (currentVersion) {
        const old = supervisorFor(currentVersion)
        running = old
        const healthy = await old.probe()
        publishView(
          healthy
            ? await old.ensure()
            : { phase: 'idle', adopted: false, runtimeVersion: currentVersion, root, logTail: '' },
        )
        upgrade = {
          state: 'blocked',
          fromVersion: currentVersion,
          targetVersion: currentVersion,
          configVersionChanged: false,
          requiresConfirmation: false,
          error: { phase: 'prepare', code: options.targetError?.code ?? 'pack_missing', detail: options.targetError?.detail },
        }
        return status()
      }
      upgrade = undefined
      publishView({
        phase: 'error',
        adopted: false,
        runtimeVersion: '',
        root,
        logTail: '',
        error: { phase: 'prepare', code: options.targetError?.code ?? 'pack_missing', detail: options.targetError?.detail },
      })
      return status()
    }

    const failed = readFailedRecord(root, target.version)
    if (target.version === currentVersion || (!currentVersion && !failed)) {
      removeUpgrade()
      if (target.version === currentVersion) rmSync(failedPath(root, target.version), { force: true })
      const supervisor = supervisorFor(target.version)
      running = supervisor
      publishView(await supervisor.ensure())
      upgrade = undefined
      return status()
    }

    const old = currentVersion ? supervisorFor(currentVersion) : null
    const oldHealthy = old ? Boolean(await old.probe()) : false
    foreignLease = leaseHeldByOther(root, options.isAlive)
    const oldConfig = currentVersion ? configVersionOf(root, currentVersion) : null
    const configChanged = oldConfig !== target.configVersion
    const record = readUpgradeRecord(root)
    const confirmed =
      record?.targetVersion === target.version && record.confirmedConfigVersion === target.configVersion
    needsConfirm = configChanged && !confirmed
    prepared = prepared || installed(root, target.version)
    const fromVersion = currentVersion ?? failed?.fromVersion ?? ''
    const base = baseUpgrade(fromVersion, configChanged, needsConfirm)

    if (failed) {
      removeUpgrade()
      upgrade = { ...base, state: 'failed', error: failed.error }
      if (!currentVersion) {
        publishView({
          phase: 'error',
          adopted: false,
          runtimeVersion: '',
          root,
          logTail: '',
          error: { phase: 'switch', code: 'upgrade_failed', detail: failed.error.detail },
        })
        return status()
      }
      running = old
      publishView(await old!.ensure())
      return status()
    }

    if (needsConfirm) {
      options.log?.(
        `runtime upgrade to ${target.version} needs confirmation (config ${oldConfig ?? 'unknown'} -> ${target.configVersion})`,
      )
    }

    if (oldHealthy) {
      // Adopt only: the decision table must never start a healthy old version
      // through ensure(), so a probe/claim race cannot spawn a second stack.
      const adopted = await old!.adopt()
      if (adopted) {
        running = old
        publishView(adopted)
        if (foreignLease) {
          upgrade = {
            ...base,
            state: 'blocked',
            error: { phase: 'lease', code: 'upgrade_blocked_by_instance', detail: currentVersion ?? '' },
          }
          persist(fromVersion, 'blocked', upgrade.error)
          startPrepare(fromVersion, configChanged, needsConfirm)
        } else if (prepared) {
          const state: UpgradeState = needsConfirm ? 'needs_confirmation' : 'ready'
          upgrade = { ...base, state }
          persist(fromVersion, state)
        } else if (prepError) {
          upgrade = { ...base, state: 'blocked', error: prepError }
          persist(fromVersion, 'blocked', prepError)
        } else {
          upgrade = { ...base, state: 'pending' }
          persist(fromVersion, 'pending')
          startPrepare(fromVersion, configChanged, needsConfirm)
        }
        return status()
      }
    }

    if (foreignLease) {
      upgrade = {
        ...base,
        state: 'blocked',
        error: { phase: 'lease', code: 'upgrade_blocked_by_instance', detail: currentVersion ?? '' },
      }
      persist(fromVersion, 'blocked', upgrade.error)
      publishView({ phase: 'idle', adopted: false, runtimeVersion: currentVersion ?? '', root, logTail: '' })
      return status()
    }

    if (needsConfirm) {
      upgrade = { ...base, state: 'needs_confirmation' }
      persist(fromVersion, 'needs_confirmation')
      publishView({ phase: 'idle', adopted: false, runtimeVersion: currentVersion ?? '', root, logTail: '' })
      return status()
    }

    if (!prepared && prepError) {
      upgrade = { ...base, state: 'blocked', error: prepError }
      publishView({ phase: 'idle', adopted: false, runtimeVersion: currentVersion ?? '', root, logTail: '' })
      return status()
    }

    if (!prepared) {
      upgrade = { ...base, state: 'pending' }
      persist(fromVersion, 'pending')
      publishView({
        phase: 'preparing',
        adopted: false,
        runtimeVersion: currentVersion ?? target.version,
        root,
        logTail: '',
      })
      const controller = new AbortController()
      abortController = controller
      const outcome = await options.provision(target.version, {
        signal: controller.signal,
        onProgress: (progress) => {
          upgrade = { ...(upgrade ?? base), progress }
        },
      })
      if (abortController === controller) abortController = null
      if (outcome.kind !== 'ok') {
        prepError = {
          phase: 'prepare',
          code: outcome.kind === 'aborted' ? 'aborted' : outcome.code,
          detail: outcome.kind === 'aborted' ? undefined : outcome.detail,
        }
        upgrade = { ...base, state: 'blocked', error: prepError }
        persist(fromVersion, 'blocked', prepError)
        publishView({ phase: 'idle', adopted: false, runtimeVersion: currentVersion ?? '', root, logTail: '' })
        return status()
      }
      prepared = true
    }

    const targetSupervisor = supervisorFor(target.version)
    running = targetSupervisor
    if (!options.activate) {
      upgrade = { ...base, state: 'ready' }
      persist(fromVersion, 'ready')
      publishView({
        phase: 'idle',
        adopted: false,
        runtimeVersion: currentVersion ?? target.version,
        root,
        logTail: '',
      })
      return status()
    }

    publishView({
      phase: 'switching',
      adopted: false,
      runtimeVersion: currentVersion ?? target.version,
      root,
      logTail: '',
    })
    const result = await options.activate(targetSupervisor, fromVersion)
    publishView(result)
    if (result.phase === 'ready' && result.upgrade?.state !== 'failed') {
      removeUpgrade()
      upgrade = undefined
      prepared = true
    } else {
      upgrade = result.upgrade ?? { ...base, state: 'pending', error: result.error }
    }
    return status()
  }

  const ensure = (): Promise<RuntimeStatusView> => {
    if (ensuring) return ensuring
    ensuring = run().finally(() => {
      ensuring = null
    })
    return ensuring
  }

  // Own the target supervisor from the start so a plugin reload disposes the
  // singleton that is already running, exactly like the old bridge did.
  if (target) supervisorFor(target.version)

  return {
    status,
    ensure,
    retry: async () => {
      if (target) rmSync(failedPath(root, target.version), { force: true })
      removeUpgrade()
      upgrade = undefined
      prepError = undefined
      if (running) return running.retry()
      return ensure()
    },
    confirm: () => {
      if (!target) throw new UpgradeOpError('upgrade_state', 'no target version')
      const record = readUpgradeRecord(root)
      if (!record || record.targetVersion !== target.version || record.state !== 'needs_confirmation') {
        throw new UpgradeOpError('upgrade_state', 'no confirmation is pending')
      }
      writeJson(upgradePath(root), {
        ...record,
        confirmedConfigVersion: target.configVersion,
        updatedAt: now(),
      })
      upgrade = upgrade
        ? { ...upgrade, state: prepared ? 'ready' : 'pending', requiresConfirmation: false, error: undefined }
        : undefined
      persist(record.fromVersion, prepared ? 'ready' : 'pending')
      return status()
    },
    dispose: (forget = false) => {
      disposed = true
      abortController?.abort()
      abortController = null
      for (const version of created.keys()) {
        created.get(version)?.dispose()
        if (forget) forgetSupervisor(root, version)
      }
      created.clear()
      running = null
    },
  }
}
