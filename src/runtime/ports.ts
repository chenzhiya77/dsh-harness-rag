export interface PortPlan {
  qdrantHttp: number
  qdrantGrpc: number
  knowledge: number
}

export type PortRole = keyof PortPlan

export const DEFAULT_PORTS: PortPlan = { qdrantHttp: 6333, qdrantGrpc: 6334, knowledge: 8020 }

export type PortResult = { ok: true; ports: PortPlan } | { ok: false; code: 'no_port'; role: PortRole }

const ROLES: PortRole[] = ['qdrantHttp', 'qdrantGrpc', 'knowledge']

/** Walk up from each preferred port until one is free and unused by the other
 * roles. A port that cannot be bound at spawn time is retried by the caller. */
export async function planPorts(options: {
  preferred?: Partial<PortPlan>
  isFree: (port: number) => boolean | Promise<boolean>
  span?: number
}): Promise<PortResult> {
  const preferred: PortPlan = { ...DEFAULT_PORTS, ...options.preferred }
  const span = options.span ?? 100
  const used = new Set<number>()
  const ports = {} as PortPlan
  for (const role of ROLES) {
    let port = preferred[role]
    let tried = 0
    while (tried < span) {
      if (!used.has(port) && (await options.isFree(port))) break
      port += 1
      tried += 1
    }
    if (tried === span) return { ok: false, code: 'no_port', role }
    used.add(port)
    ports[role] = port
  }
  return { ok: true, ports }
}
