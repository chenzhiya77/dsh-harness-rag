const MAX_LINE_BUFFER = 256 * 1024;
/** Adapt the host seam to the narrow handle the supervisor drives.
 *
 * Two host facts shape this: a handle exposes no pid (target identity stays
 * provider-private), and output arrives as a bounded collected tail rather
 * than a live stream. So `pid` is undefined and output is polled into the
 * existing log listeners; the host's own job still owns the process tree. */
export function createHostSpawn(host, options = {}) {
    const pollMs = options.pollMs ?? 250;
    const graceMs = options.graceMs ?? 5_000;
    return (request) => {
        const listeners = { stdout: [], stderr: [] };
        const exitListeners = [];
        const offsets = { stdout: 0, stderr: 0 };
        let timer = null;
        let finished = false;
        const handle = host.spawn({
            argv: [request.command, ...request.args],
            cwd: request.cwd,
            stdio: { stdin: 'ignore', stdout: { maxBytes: MAX_LINE_BUFFER }, stderr: { maxBytes: MAX_LINE_BUFFER } },
            graceMs,
            env: request.env,
        });
        const drain = () => {
            for (const name of ['stdout', 'stderr']) {
                const stream = handle.collected?.[name];
                if (!stream)
                    continue;
                const read = stream.readFrom(offsets[name]);
                offsets[name] = read.offset;
                if (!read.text)
                    continue;
                for (const listener of listeners[name])
                    listener(read.text);
            }
        };
        const finish = (code) => {
            if (finished)
                return;
            finished = true;
            if (timer)
                clearInterval(timer);
            timer = null;
            drain();
            for (const listener of exitListeners)
                listener(code);
        };
        const poll = () => {
            if (!finished && timer === null)
                timer = setInterval(drain, pollMs);
        };
        void handle.done.then((outcome) => finish(outcome.exitCode), () => finish(-1));
        return {
            pid: undefined,
            onData(stream, listener) {
                listeners[stream].push(listener);
                poll();
            },
            onExit(listener) {
                if (finished)
                    listener(-1);
                else
                    exitListeners.push(listener);
            },
            kill() {
                void handle.terminate();
            },
        };
    };
}
