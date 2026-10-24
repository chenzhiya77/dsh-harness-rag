import { homedir } from 'node:os'
import { join } from 'node:path'

/** `$DSH_HOME`, or `~/.dsh` when the variable is unset or blank — the same
 * rule the bindings file follows (`src/bindings.ts`). */
export function resolveDshHome(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.DSH_HOME?.trim()
  return configured || join(homedir(), '.dsh')
}

/** `<DSH_HOME>/harness-rag`: the anchor root, and the default runtime root. */
export function defaultRoot(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveDshHome(env), 'harness-rag')
}

export function runtimeRoot(root: string): string {
  return join(root, 'runtime')
}

export function runtimeDir(root: string, version: string): string {
  return join(runtimeRoot(root), version)
}

export function stateDir(root: string): string {
  return join(root, 'state')
}

export function configDir(root: string): string {
  return join(root, 'config')
}

export function logsDir(root: string): string {
  return join(stateDir(root), 'logs')
}

export function downloadsDir(root: string): string {
  return join(root, 'downloads')
}
