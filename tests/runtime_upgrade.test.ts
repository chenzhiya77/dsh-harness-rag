import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { RuntimePack } from '../src/runtime/manifest.ts'
import type { EnsureStep, RuntimeStatusView, Supervisor } from '../src/runtime/supervisor.ts'
import {
  cleanOldVersions,
  createUpgradeCoordinator,
  UpgradeOpError,
  type UpgradeCoordinatorOptions,
  type UpgradeTarget,
} from '../src/runtime/upgrade.ts'

const OLD = '2.1.0-1'
const NEW = '2.1.0-2'
const STAMP = '2026-10-25T00:00:00.000Z'
const FOREIGN_PID = 4242

function pack(version: string, configVersion: number): RuntimePack {
  return {
    runtimeVersion: version,
    engineVersion: '2.1.0',
    engineCommit: 'abc1234',
    pythonVersion: '3.12.13',
    qdrantVersion: '1.20.0',
    configVersion,
    urls: ['https://example.com/runtime.zip'],
    size: 10,
    unpackedSize: 20,
    sha256: 'a'.repeat(64),
  }
}

interface FakeSupervisor extends Supervisor {
  calls: { ensure: number; retry: number; probe: number; adopt: number; lastBudget?: number }
}

function fakeSupervisor(version: string, healthy: boolean): FakeSupervisor {
  const calls = { ensure: 0, retry: 0, probe: 0, adopt: 0, lastBudget: undefined as number | undefined }
  const ready: RuntimeStatusView = {
    phase: 'ready',
    adopted: true,
    runtimeVersion: version,
    root: '',
    logTail: '',
  }
  return {
    root: '',
    calls,
    ensure: async (request?: { readyTimeoutMs?: number }) => {
      calls.ensure += 1
      calls.lastBudget = request?.readyTimeoutMs
      return ready
    },
    probe: async () => {
      calls.probe += 1
      if (!healthy) return null
      return {
        version: 1,
        pid: null,
        qdrantPid: null,
        runtimeVersion: version,
        token: 'test-token',
        ports: { qdrantHttp: 1, qdrantGrpc: 2, knowledge: 3 },
        startedAt: STAMP,
      }
    },
    adopt: async () => {
      calls.adopt += 1
      return healthy ? ready : null
    },
    status: () => ready,
    retry: async () => {
      calls.retry += 1
      return ready
    },
    rebind: () => {},
    dispose: () => {},
  }
}

interface Fixture {
  root: string
  calls: { provision: number; activate: number }
  signals: AbortSignal[]
  supervisors: Map<string, FakeSupervisor>
  coordinator: ReturnType<typeof createUpgradeCoordinator>
  target: UpgradeTarget
}

interface FixtureOptions {
  oldHealthy?: boolean
  targetInstalled?: boolean
  oldConfig?: number
  targetConfig?: number
  provisionResult?: EnsureStep
  activate?: boolean
  isAlive?: (pid: number) => boolean
  target?: UpgradeTarget | null
  targetError?: { code: string; detail?: string }
  log?: (message: string) => void
  holdProvision?: boolean
  oldEnsureError?: { phase: string; code: string; detail?: string }
}

function install(root: string, version: string, configVersion: number): void {
  mkdirSync(join(root, 'runtime', version), { recursive: true })
  writeFileSync(
    join(root, 'runtime', version, 'runtime-manifest.json'),
    JSON.stringify({ version: 1, runtimeVersion: version, configVersion }),
  )
}

function writeState(root: string, name: string, value: unknown): void {
  mkdirSync(join(root, 'state'), { recursive: true })
  writeFileSync(join(root, 'state', name), JSON.stringify(value))
}

function fixture(options: FixtureOptions = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'hrag-upgrade-'))
  const target: UpgradeTarget = {
    version: NEW,
    pack: pack(NEW, options.targetConfig ?? 44),
    configVersion: options.targetConfig ?? 44,
  }
  install(root, OLD, options.oldConfig ?? 44)
  if (options.targetInstalled) install(root, NEW, options.targetConfig ?? 44)
  writeState(root, 'current.json', { version: 1, runtimeVersion: OLD, updatedAt: STAMP })

  const calls = { provision: 0, activate: 0 }
  const signals: AbortSignal[] = []
  const supervisors = new Map<string, FakeSupervisor>()
  const supervisorFor = (version: string): FakeSupervisor => {
    let supervisor = supervisors.get(version)
    if (!supervisor) {
      const healthy = version === OLD ? options.oldHealthy === true : true
      supervisor = fakeSupervisor(version, healthy)
      if (version === OLD && options.oldEnsureError) {
        const error = options.oldEnsureError
        supervisor.ensure = async () => ({
          phase: 'error',
          adopted: false,
          runtimeVersion: OLD,
          root,
          logTail: '',
          error,
        })
      }
      supervisors.set(version, supervisor)
    }
    return supervisor
  }

  const coordinatorOptions: UpgradeCoordinatorOptions = {
    root,
    target: options.target === undefined ? target : options.target,
    targetError: options.targetError,
    headless: true,
    isAlive: options.isAlive ?? (() => false),
    supervisorFor,
    provision: async (_version, hooks) => {
      calls.provision += 1
      signals.push(hooks.signal)
      hooks.onProgress({ phase: 'download', received: 1, total: 2 })
      if (options.holdProvision) {
        return new Promise((resolve) => {
          hooks.signal.addEventListener('abort', () => resolve({ kind: 'aborted' }))
        })
      }
      if (options.provisionResult && options.provisionResult.kind !== 'ok') return options.provisionResult
      install(root, NEW, options.targetConfig ?? 44)
      return { kind: 'ok' }
    },
    activate: options.activate
      ? async () => {
          calls.activate += 1
          return { phase: 'ready', adopted: false, runtimeVersion: NEW, root, logTail: '' }
        }
      : undefined,
    now: () => STAMP,
    log: options.log,
  }

  return { root, calls, signals, supervisors, coordinator: createUpgradeCoordinator(coordinatorOptions), target }
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

function current(root: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(root, 'state', 'current.json'), 'utf8'))
}

test('upgrade: the same version delegates to the existing supervisor', async () => {
  const f = fixture()
  writeState(f.root, 'current.json', { version: 1, runtimeVersion: NEW, updatedAt: STAMP })

  const status = await f.coordinator.ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(f.supervisors.get(NEW)?.calls.ensure, 1)
  assert.equal(status.upgrade, undefined)
})

test('upgrade: a current.json that lags behind a healthy service is rewritten', async () => {
  const f = fixture({ targetInstalled: true })
  writeState(f.root, 'service.json', {
    version: 1,
    pid: null,
    qdrantPid: null,
    runtimeVersion: NEW,
    token: 'test-token',
    ports: { qdrantHttp: 1, qdrantGrpc: 2, knowledge: 3 },
    startedAt: STAMP,
  })

  const status = await f.coordinator.ensure()

  assert.equal(status.runtimeVersion, NEW)
  assert.deepEqual(current(f.root), {
    version: 1,
    runtimeVersion: NEW,
    previousVersion: OLD,
    updatedAt: STAMP,
  })
})

test('upgrade: a failed target keeps the healthy old version without preparing again', async () => {
  const f = fixture({ oldHealthy: true, targetInstalled: true })
  writeState(f.root, `failed-${NEW}.json`, {
    version: 1,
    runtimeVersion: NEW,
    fromVersion: OLD,
    failedAt: STAMP,
    error: { phase: 'engine', code: 'engine_not_ready' },
    rolledBack: true,
  })

  const status = await f.coordinator.ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(status.upgrade?.state, 'failed')
  assert.equal(status.upgrade?.error?.code, 'engine_not_ready')
  assert.equal(f.supervisors.get(OLD)?.calls.ensure, 1)
  assert.equal(f.calls.provision, 0)
})

test('upgrade: a failed target without any current version reports upgrade_failed', async () => {
  const f = fixture({ targetInstalled: true })
  writeState(f.root, `failed-${NEW}.json`, {
    version: 1,
    runtimeVersion: NEW,
    fromVersion: '',
    failedAt: STAMP,
    error: { phase: 'engine', code: 'engine_not_ready' },
    rolledBack: false,
  })
  const { rmSync } = await import('node:fs')
  rmSync(join(f.root, 'state', 'current.json'))

  const status = await f.coordinator.ensure()

  assert.equal(status.phase, 'error')
  assert.equal(status.error?.code, 'upgrade_failed')
})

test('upgrade: a healthy old version with a foreign lease is blocked and never switched', async () => {
  const f = fixture({ oldHealthy: true, isAlive: (pid) => pid === FOREIGN_PID })
  writeState(f.root, 'lease.json', { version: 1, owner: 'other-host', pid: FOREIGN_PID, startedAt: STAMP })

  const status = await f.coordinator.ensure()
  await settle()

  assert.equal(status.phase, 'ready')
  assert.equal(status.upgrade?.state, 'blocked')
  assert.equal(status.upgrade?.error?.code, 'upgrade_blocked_by_instance')
  assert.equal(f.supervisors.get(OLD)?.calls.adopt, 1)
  assert.equal(f.calls.activate, 0)
  assert.equal(f.calls.provision, 1)
})

test('upgrade: a healthy old version prepares the target without switching', async () => {
  const f = fixture({ oldHealthy: true })

  const first = await f.coordinator.ensure()
  assert.equal(first.phase, 'ready')
  assert.equal(first.upgrade?.state, 'pending')
  assert.equal(f.calls.activate, 0)
  assert.equal(f.calls.provision, 1)

  await settle()
  const next = await f.coordinator.ensure()
  assert.equal(next.upgrade?.state, 'ready')
  assert.equal(current(f.root).runtimeVersion, OLD)
  assert.equal(f.calls.activate, 0)
})

test('upgrade: a healthy old version with a changed config version waits for confirmation', async () => {
  const messages: string[] = []
  const f = fixture({ oldHealthy: true, targetConfig: 45, log: (message) => messages.push(message) })

  const status = await f.coordinator.ensure()
  await settle()
  const next = await f.coordinator.ensure()

  assert.equal(status.upgrade?.state, 'pending')
  assert.equal(next.upgrade?.state, 'needs_confirmation')
  assert.equal(next.upgrade?.configVersionChanged, true)
  assert.equal(f.calls.activate, 0)
  assert.equal(messages.some((message) => message.includes('needs confirmation')), true)
})

test('upgrade: an unhealthy old version with a foreign lease is blocked without starting anything', async () => {
  const f = fixture({ oldHealthy: false, isAlive: (pid) => pid === FOREIGN_PID })
  writeState(f.root, 'lease.json', { version: 1, owner: 'other-host', pid: FOREIGN_PID, startedAt: STAMP })

  const status = await f.coordinator.ensure()

  assert.equal(status.phase, 'idle')
  assert.equal(status.upgrade?.state, 'blocked')
  assert.equal(f.calls.provision, 0)
  assert.equal(f.calls.activate, 0)
  assert.equal(f.supervisors.get(OLD)?.calls.ensure, 0)
})

test('upgrade: an unhealthy old version with a changed config version stops at confirmation', async () => {
  const f = fixture({ oldHealthy: false, targetConfig: 45 })

  const status = await f.coordinator.ensure()

  assert.equal(status.upgrade?.state, 'needs_confirmation')
  assert.equal(f.calls.provision, 0)
  assert.equal(f.calls.activate, 0)
})

test('upgrade: an unhealthy old version starts the prepared target when the lease is free', async () => {
  const f = fixture({ oldHealthy: false, targetInstalled: true, activate: true })

  const status = await f.coordinator.ensure()

  assert.equal(f.calls.activate, 1)
  assert.equal(f.calls.provision, 0)
  assert.equal(status.phase, 'ready')
  assert.equal(status.upgrade, undefined)
})

test('upgrade: no target pack keeps the current version and reports pack_missing', async () => {
  const f = fixture({ oldHealthy: true, target: null, targetError: { code: 'pack_missing' } })

  const status = await f.coordinator.ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(status.upgrade?.state, 'blocked')
  assert.equal(status.upgrade?.error?.code, 'pack_missing')
  assert.equal(f.calls.provision, 0)
})

test('upgrade: dispose aborts a background preparation', async () => {
  const f = fixture({ oldHealthy: true, holdProvision: true })
  await f.coordinator.ensure()
  assert.equal(f.signals.length, 1)
  assert.equal(f.signals[0].aborted, false)

  f.coordinator.dispose()

  assert.equal(f.signals[0].aborted, true)
})

test('upgrade: a prepared target switches with the 90 s budget and records the previous version', async () => {
  const f = fixture({ oldHealthy: false, targetInstalled: true })

  const status = await f.coordinator.ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(status.runtimeVersion, NEW)
  assert.deepEqual(current(f.root), {
    version: 1,
    runtimeVersion: NEW,
    previousVersion: OLD,
    updatedAt: STAMP,
  })
  assert.equal(existsSync(join(f.root, 'state', `failed-${NEW}.json`)), false)
  assert.equal(existsSync(join(f.root, 'state', 'upgrade.json')), false)
  assert.equal(f.supervisors.get(NEW)?.calls.lastBudget, 90_000)
})

test('upgrade: a failed switch writes the failure record and rolls back', async () => {
  const f = fixture({ oldHealthy: false, targetInstalled: true })
  f.supervisors.get(NEW)!.ensure = async () => ({
    phase: 'error',
    adopted: false,
    runtimeVersion: NEW,
    root: f.root,
    logTail: '',
    error: { phase: 'engine', code: 'engine_not_ready', detail: 'exit 1' },
  })

  const status = await f.coordinator.ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(status.runtimeVersion, OLD)
  assert.equal(status.upgrade?.state, 'failed')
  const failed = JSON.parse(readFileSync(join(f.root, 'state', `failed-${NEW}.json`), 'utf8'))
  assert.equal(failed.runtimeVersion, NEW)
  assert.equal(failed.fromVersion, OLD)
  assert.equal(failed.error.code, 'engine_not_ready')
  assert.equal(failed.rolledBack, true)
  assert.equal(existsSync(join(f.root, 'state', 'upgrade.json')), false)
  assert.equal(current(f.root).runtimeVersion, OLD)
})

test('upgrade: a failed rollback reports rollback_failed and keeps rolledBack false', async () => {
  const f = fixture({
    oldHealthy: false,
    targetInstalled: true,
    oldEnsureError: { phase: 'engine', code: 'engine_exited' },
  })
  f.supervisors.get(NEW)!.ensure = async () => ({
    phase: 'error',
    adopted: false,
    runtimeVersion: NEW,
    root: f.root,
    logTail: '',
    error: { phase: 'qdrant', code: 'qdrant_not_ready' },
  })

  const status = await f.coordinator.ensure()

  assert.equal(status.phase, 'error')
  assert.equal(status.error?.code, 'rollback_failed')
  assert.equal(status.upgrade?.state, 'failed')
  const failed = JSON.parse(readFileSync(join(f.root, 'state', `failed-${NEW}.json`), 'utf8'))
  assert.equal(failed.error.code, 'qdrant_not_ready')
  assert.equal(failed.rolledBack, false)
})

test('upgrade: a provision lock held by another host stays pending and retries later', async () => {
  const f = fixture({
    oldHealthy: true,
    provisionResult: { kind: 'failed', code: 'provision_held' },
  })

  const first = await f.coordinator.ensure()
  await settle()
  const second = await f.coordinator.ensure()

  assert.equal(first.upgrade?.state, 'pending')
  assert.equal(second.upgrade?.state, 'pending')
  assert.equal(f.calls.provision, 2)
})

test('upgrade: a target change drops failure files for older targets', async () => {
  const f = fixture({ oldHealthy: true, targetInstalled: true })
  writeState(f.root, `failed-${OLD}.json`, {
    version: 1,
    runtimeVersion: OLD,
    fromVersion: '',
    failedAt: STAMP,
    error: { phase: 'engine', code: 'engine_not_ready' },
    rolledBack: false,
  })
  writeState(f.root, `failed-${NEW}.json`, {
    version: 1,
    runtimeVersion: NEW,
    fromVersion: OLD,
    failedAt: STAMP,
    error: { phase: 'engine', code: 'engine_not_ready' },
    rolledBack: true,
  })

  const status = await f.coordinator.ensure()

  assert.equal(existsSync(join(f.root, 'state', `failed-${OLD}.json`)), false)
  assert.equal(existsSync(join(f.root, 'state', `failed-${NEW}.json`)), true)
  assert.equal(status.upgrade?.state, 'failed')
})

test('upgrade: a first install does not compare config versions', async () => {
  const f = fixture({ targetInstalled: true })
  const { rmSync } = await import('node:fs')
  rmSync(join(f.root, 'state', 'current.json'))

  const status = await f.coordinator.ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(status.upgrade, undefined)
  assert.equal(f.supervisors.get(NEW)?.calls.ensure, 1)
})

test('upgrade: retry clears the failure record and re-runs the decision', async () => {
  const f = fixture({ oldHealthy: true, targetInstalled: true })
  writeState(f.root, `failed-${NEW}.json`, {
    version: 1,
    runtimeVersion: NEW,
    fromVersion: OLD,
    failedAt: STAMP,
    error: { phase: 'engine', code: 'engine_not_ready' },
    rolledBack: true,
  })

  const failed = await f.coordinator.ensure()
  assert.equal(failed.upgrade?.state, 'failed')

  const after = await f.coordinator.retry()

  assert.equal(existsSync(join(f.root, 'state', `failed-${NEW}.json`)), false)
  assert.equal(after.upgrade?.state, 'ready')
  assert.equal(current(f.root).runtimeVersion, OLD)
})

test('upgrade: concurrent ensure calls share one switch', async () => {
  const f = fixture({ oldHealthy: false, targetInstalled: true })

  const [first, second] = await Promise.all([f.coordinator.ensure(), f.coordinator.ensure()])

  assert.equal(f.supervisors.get(NEW)?.calls.ensure, 1)
  assert.equal(first.runtimeVersion, NEW)
  assert.equal(second.runtimeVersion, NEW)
})

test('upgrade: a current runtime without a configVersion asks for confirmation', async () => {
  const f = fixture({ oldHealthy: true, targetInstalled: true })
  writeFileSync(
    join(f.root, 'runtime', OLD, 'runtime-manifest.json'),
    JSON.stringify({ version: 1, runtimeVersion: OLD }),
  )

  const status = await f.coordinator.ensure()

  assert.equal(status.upgrade?.state, 'needs_confirmation')
})

test('upgrade: a confirmation does not survive a target config change', async () => {
  const f = fixture({ oldHealthy: true, targetInstalled: true, targetConfig: 45 })
  await f.coordinator.ensure()
  f.coordinator.confirm()

  const next = fixture({ oldHealthy: true, targetInstalled: true, targetConfig: 46 })
  writeFileSync(join(next.root, 'state', 'upgrade.json'), readFileSync(join(f.root, 'state', 'upgrade.json')))
  const status = await next.coordinator.ensure()

  assert.equal(status.upgrade?.state, 'needs_confirmation')
})

test('cleanup: keeps current and previous, skips tmp/unknown/manifestless dirs', () => {
  const root = mkdtempSync(join(tmpdir(), 'hrag-cleanup-'))
  const make = (version: string, withManifest = true): void => {
    const dir = join(root, 'runtime', version)
    mkdirSync(dir, { recursive: true })
    if (withManifest) {
      writeFileSync(
        join(dir, 'runtime-manifest.json'),
        JSON.stringify({ version: 1, runtimeVersion: version, configVersion: 44 }),
      )
    }
  }
  make(OLD)
  make(NEW)
  make('2.1.0-3')
  make('2.1.0-4.tmp')
  make('2.1.0-5', false)
  mkdirSync(join(root, 'runtime', 'notes'), { recursive: true })
  mkdirSync(join(root, 'state'), { recursive: true })
  writeFileSync(join(root, 'state', `failed-${OLD}.json`), '{}')
  writeFileSync(join(root, 'state', 'failed-2.1.0-3.json'), '{}')

  const removed = cleanOldVersions(root, [OLD, NEW])

  assert.deepEqual(removed, ['2.1.0-3'])
  assert.equal(existsSync(join(root, 'runtime', OLD)), true)
  assert.equal(existsSync(join(root, 'runtime', NEW)), true)
  assert.equal(existsSync(join(root, 'runtime', '2.1.0-3')), false)
  assert.equal(existsSync(join(root, 'state', `failed-${OLD}.json`)), true)
  assert.equal(existsSync(join(root, 'state', 'failed-2.1.0-3.json')), false)
  assert.equal(existsSync(join(root, 'runtime', '2.1.0-4.tmp')), true)
  assert.equal(existsSync(join(root, 'runtime', '2.1.0-5')), true)
  assert.equal(existsSync(join(root, 'runtime', 'notes')), true)
})

test('upgrade: confirm records the config version and a later activation may proceed', async () => {
  const f = fixture({ oldHealthy: true, targetConfig: 45 })
  await f.coordinator.ensure()
  await settle()

  f.coordinator.confirm()

  const record = JSON.parse(readFileSync(join(f.root, 'state', 'upgrade.json'), 'utf8'))
  assert.equal(record.confirmedConfigVersion, 45)

  const again = fixture({ oldHealthy: true, targetConfig: 45, targetInstalled: true })
  writeFileSync(
    join(again.root, 'state', 'upgrade.json'),
    readFileSync(join(f.root, 'state', 'upgrade.json')),
  )
  const status = await again.coordinator.ensure()
  assert.notEqual(status.upgrade?.state, 'needs_confirmation')
})

test('upgrade: confirm without a pending confirmation is rejected', () => {
  const f = fixture({ oldHealthy: true })
  assert.throws(
    () => f.coordinator.confirm(),
    (error: unknown) => error instanceof UpgradeOpError && error.kind === 'upgrade_state',
  )
})
