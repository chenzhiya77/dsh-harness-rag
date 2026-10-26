export const DEFAULT_PORTS = { qdrantHttp: 6333, qdrantGrpc: 6334, knowledge: 8020 };
const ROLES = ['qdrantHttp', 'qdrantGrpc', 'knowledge'];
/** Walk up from each preferred port until one is free and unused by the other
 * roles. A port that cannot be bound at spawn time is retried by the caller. */
export async function planPorts(options) {
    const preferred = { ...DEFAULT_PORTS, ...options.preferred };
    const span = options.span ?? 100;
    const used = new Set();
    const ports = {};
    for (const role of ROLES) {
        let port = preferred[role];
        let tried = 0;
        while (tried < span) {
            if (!used.has(port) && (await options.isFree(port)))
                break;
            port += 1;
            tried += 1;
        }
        if (tried === span)
            return { ok: false, code: 'no_port', role };
        used.add(port);
        ports[role] = port;
    }
    return { ok: true, ports };
}
