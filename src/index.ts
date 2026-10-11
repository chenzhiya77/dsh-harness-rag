import type { Context } from 'cordis'
import type {} from '@deepseek-ai/dsh-tools'
import { defaultConfig, type Config } from './settings.ts'
import { registerTools } from './tools.ts'

export const name = 'dsh-harness-rag'
// Host half only: the host world provides `tools` but never `slots` — UI
// registration lives in the browser half (client.js).
export const inject = ['tools']

export function apply(ctx: Context, config: Config = defaultConfig): void {
  registerTools(ctx, { ...defaultConfig, ...config })
}
