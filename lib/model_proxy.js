/**
 * Local OpenAI-compatible proxy in front of the host `ctx.llm` service.
 *
 * The knowledge service runs in another process, so it cannot call `ctx.llm`
 * directly. It calls this route as an ordinary openai-compatible endpoint; the
 * proxy translates each request into one `ctx.llm.stream` call and assembles a
 * non-streaming chat.completion. Provider keys, protocols and thinking dialects
 * never leave the host.
 */
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
export const LLM_PROXY_ROUTE = '/dsh-harness-rag/llm/v1';
const EFFORT_ORDER = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
const CANONICAL_EFFORT = new Map([
    ['minimal', 'minimal'],
    ['low', 'low'],
    ['medium', 'medium'],
    ['high', 'high'],
    ['xhigh', 'xhigh'],
    ['max', 'max'],
]);
function digest(value) {
    return createHash('sha256').update(value, 'utf8').digest();
}
function tokenEquals(presented, expected) {
    return timingSafeEqual(digest(presented), digest(expected));
}
function bearerToken(headers) {
    const raw = headers.authorization;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== 'string')
        return '';
    const match = /^Bearer\s+(.+)$/i.exec(value.trim());
    return match ? match[1].trim() : '';
}
function normalizeEffortId(value) {
    return CANONICAL_EFFORT.get(value);
}
function lowestEffort(efforts) {
    for (const level of EFFORT_ORDER) {
        if (efforts.includes(level))
            return level;
    }
    return undefined;
}
export class ProxyHttpError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
export async function collectCompletion(chunks) {
    let text = '';
    let reasoning = '';
    let usage;
    let finish;
    let failure;
    for await (const chunk of chunks) {
        if (chunk.type === 'text-delta') {
            text += chunk.text ?? '';
        }
        else if (chunk.type === 'reasoning-delta') {
            reasoning += chunk.text ?? '';
        }
        else if (chunk.type === 'usage') {
            usage = chunk.usage;
        }
        else if (chunk.type === 'finish') {
            finish = chunk.reason?.kind ?? 'stop';
            failure = chunk.reason?.failure;
        }
    }
    return { text, reasoning, finish: finish ?? 'stop', ...(usage ? { usage } : {}), ...(failure ? { failure } : {}) };
}
export function aliasFor(provider, model) {
    return `dsh:${provider}/${model}`;
}
export function isLoopbackAddress(address) {
    if (typeof address !== 'string')
        return false;
    let value = address.trim();
    if (value.startsWith('[') && value.endsWith(']'))
        value = value.slice(1, -1);
    value = value.replace(/%.*$/, '');
    if (value === '::1')
        return true;
    if (value.startsWith('::ffff:'))
        value = value.slice('::ffff:'.length);
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
    return match !== null && Number(match[1]) === 127;
}
export function authorizeProxy(headers, remoteAddress, token) {
    if (token) {
        const presented = bearerToken(headers);
        if (!presented || !tokenEquals(presented, token)) {
            throw new ProxyHttpError(401, 'unauthorized', 'Invalid proxy token.');
        }
        return;
    }
    if (!isLoopbackAddress(remoteAddress)) {
        throw new ProxyHttpError(403, 'loopback_only', 'The local proxy accepts loopback requests only while the knowledge service has no API token.');
    }
}
export function selectEffort(requested, efforts) {
    if (requested === undefined)
        return undefined;
    const normalized = requested === 'none' || requested === 'off' ? 'off' : normalizeEffortId(requested);
    if (normalized === undefined) {
        throw new ProxyHttpError(400, 'invalid_reasoning_effort', `Unsupported reasoning effort "${requested}".`);
    }
    if (efforts.length === 0)
        return undefined;
    if (normalized === 'off') {
        return efforts.includes('off') ? 'off' : lowestEffort(efforts);
    }
    const targetRank = EFFORT_ORDER.indexOf(normalized);
    let best;
    for (const id of efforts) {
        const canonical = normalizeEffortId(id);
        if (canonical === undefined)
            continue;
        const rank = EFFORT_ORDER.indexOf(canonical);
        const distance = Math.abs(rank - targetRank);
        if (best === undefined || distance < best.distance || (distance === best.distance && rank < best.rank)) {
            best = { id, distance, rank };
        }
    }
    return best?.id;
}
export async function buildCatalog(llm, origin) {
    const models = [];
    const unavailable = [];
    const seenUnavailable = new Set();
    const noteUnavailable = (provider, code) => {
        const key = `${provider}\0${code}`;
        if (seenUnavailable.has(key))
            return;
        seenUnavailable.add(key);
        unavailable.push({ provider, code });
    };
    for (const provider of llm.listProviders()) {
        let listed;
        try {
            listed = await llm.listModels(provider.id);
        }
        catch {
            noteUnavailable(provider.id, 'catalog_failed');
            continue;
        }
        for (const model of listed) {
            try {
                const info = await llm.resolveModelInfo(provider.id, model.id);
                const efforts = (info.reasoning?.efforts ?? []).map((effort) => effort.id);
                const inputModalities = info.inputModalities ?? model.inputModalities;
                models.push({
                    alias: aliasFor(provider.id, model.id),
                    provider: provider.id,
                    model: model.id,
                    name: info.name || model.name || model.id,
                    ...(info.description ?? model.description
                        ? { description: info.description ?? model.description }
                        : {}),
                    ...(inputModalities ? { inputModalities: [...inputModalities] } : {}),
                    ...(info.context?.contextWindow ? { contextWindow: info.context.contextWindow } : {}),
                    ...(info.defaultMaxTokens ? { maxTokens: info.defaultMaxTokens } : {}),
                    efforts,
                    ...(typeof info.reasoning?.defaultEffort === 'string' && info.reasoning.defaultEffort
                        ? { defaultEffort: info.reasoning.defaultEffort }
                        : {}),
                });
            }
            catch {
                noteUnavailable(provider.id, 'model_failed');
            }
        }
    }
    models.sort((left, right) => (left.alias < right.alias ? -1 : left.alias > right.alias ? 1 : 0));
    return {
        origin,
        models,
        byAlias: new Map(models.map((model) => [model.alias, model])),
        unavailable,
        builtAt: Date.now(),
    };
}
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
function asRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : undefined;
}
function textBlocks(content, role) {
    if (typeof content === 'string')
        return [content];
    if (content === null || content === undefined)
        return [];
    if (!Array.isArray(content)) {
        throw new ProxyHttpError(400, 'unsupported_content', `Unsupported ${role} message content.`);
    }
    const texts = [];
    for (const part of content) {
        const record = asRecord(part);
        if (record?.type !== 'text' || typeof record.text !== 'string') {
            throw new ProxyHttpError(400, 'unsupported_content', `Unsupported ${role} message content.`);
        }
        texts.push(record.text);
    }
    return texts;
}
function parseImageUrl(value) {
    let url = value;
    if (asRecord(value))
        url = asRecord(value)?.url;
    if (typeof url !== 'string') {
        throw new ProxyHttpError(400, 'invalid_image_url', 'Image content must use an image_url data URL.');
    }
    const match = /^data:([^;,]+);base64,(.*)$/is.exec(url);
    if (!match) {
        throw new ProxyHttpError(400, 'invalid_image_url', 'Image content must use an image_url data URL.');
    }
    const mediaType = match[1].toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(mediaType)) {
        throw new ProxyHttpError(415, 'unsupported_image_type', `Unsupported image type "${mediaType}".`);
    }
    const data = match[2];
    if (!data || !/^[A-Za-z0-9+/=]+$/.test(data) || Buffer.from(data, 'base64').toString('base64') !== data) {
        throw new ProxyHttpError(400, 'invalid_image_base64', 'Image content is not canonical base64.');
    }
    return { mediaType, data };
}
function userParts(content) {
    if (typeof content === 'string')
        return [{ type: 'text', text: content }];
    if (content === null || content === undefined)
        return [];
    if (!Array.isArray(content)) {
        throw new ProxyHttpError(400, 'unsupported_content', 'Unsupported user message content.');
    }
    const parts = [];
    for (const value of content) {
        const part = asRecord(value);
        if (part?.type === 'text' && typeof part.text === 'string') {
            parts.push({ type: 'text', text: part.text });
            continue;
        }
        if (part?.type === 'image_url') {
            parts.push({ type: 'image', ...parseImageUrl(part.image_url) });
            continue;
        }
        throw new ProxyHttpError(400, 'unsupported_content', 'Unsupported user message content.');
    }
    return parts;
}
function admittedContent(parts) {
    return parts.map((part) => part.type === 'text' ? { type: 'text', text: part.text } : { type: 'image', attachment: part.attachment });
}
function admissionError(error) {
    const code = asRecord(error)?.code;
    if (code === 'UNSUPPORTED_IMAGE_TYPE') {
        return new ProxyHttpError(415, 'unsupported_image_type', 'The host does not accept this image type.');
    }
    if (code === 'TOO_MANY_IMAGES' || code === 'IMAGES_TOO_LARGE' || code === 'IMAGE_TOO_LARGE') {
        return new ProxyHttpError(413, 'image_too_large', 'The image exceeds the host attachment limits.');
    }
    if (code === 'INVALID_IMAGE_BASE64') {
        return new ProxyHttpError(400, 'invalid_image_base64', 'Image content is not canonical base64.');
    }
    return new ProxyHttpError(502, 'image_admission_failed', 'The host could not store the image.');
}
function optionalNumber(value, code) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ProxyHttpError(400, code, 'The request contains an invalid numeric field.');
    }
    return value;
}
export async function buildGenerateOptions(body, target, catalogModel, admit) {
    if (body.stream === true) {
        throw new ProxyHttpError(400, 'stream_unsupported', 'Streaming is not supported by this proxy.');
    }
    if ((Array.isArray(body.tools) && body.tools.length > 0) ||
        (Array.isArray(body.functions) && body.functions.length > 0) ||
        body.tool_choice !== undefined) {
        throw new ProxyHttpError(400, 'tools_unsupported', 'Tool calling is not supported by this proxy.');
    }
    if (body.n !== undefined && body.n !== 1) {
        throw new ProxyHttpError(400, 'n_unsupported', 'Only one completion can be requested.');
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
        throw new ProxyHttpError(400, 'invalid_messages', 'The request must contain messages.');
    }
    const rawMaxTokens = body.max_tokens ?? body.max_completion_tokens;
    const maxTokens = optionalNumber(rawMaxTokens, 'invalid_max_tokens');
    if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens <= 0)) {
        throw new ProxyHttpError(400, 'invalid_max_tokens', 'The request contains an invalid max_tokens.');
    }
    const temperature = optionalNumber(body.temperature, 'invalid_temperature');
    // The host's pi-ai service rejects GenerateOptions.stop; refuse it here with a
    // clear 400 instead of forwarding it and surfacing as a generic 502.
    if (body.stop !== undefined && body.stop !== null) {
        throw new ProxyHttpError(400, 'stop_unsupported', 'Stop sequences are not supported by this proxy.');
    }
    let reasoningEffort;
    if (body.reasoning_effort !== undefined && body.reasoning_effort !== null) {
        if (typeof body.reasoning_effort !== 'string') {
            throw new ProxyHttpError(400, 'invalid_reasoning_effort', 'The request contains an invalid reasoning effort.');
        }
        reasoningEffort = selectEffort(body.reasoning_effort, catalogModel.efforts);
    }
    const system = [];
    const messages = [];
    for (const value of body.messages) {
        const message = asRecord(value);
        const role = message?.role;
        if (message === undefined || typeof role !== 'string') {
            throw new ProxyHttpError(400, 'invalid_messages', 'The request contains an invalid message.');
        }
        if (role === 'system' || role === 'developer') {
            system.push(...textBlocks(message.content, role));
            continue;
        }
        if (role === 'assistant') {
            const toolCalls = message.tool_calls;
            if (Array.isArray(toolCalls) && toolCalls.length > 0) {
                throw new ProxyHttpError(400, 'tools_unsupported', 'Tool calling is not supported by this proxy.');
            }
            const texts = textBlocks(message.content, role);
            messages.push({
                role: 'assistant',
                id: typeof message.id === 'string' && message.id ? message.id : randomUUID(),
                content: texts.map((text) => ({ type: 'text', text })),
                source: { kind: 'model', provider: target.provider, model: target.model },
            });
            continue;
        }
        if (role === 'user') {
            const parts = userParts(message.content);
            let admitted;
            if (parts.some((part) => part.type === 'image')) {
                try {
                    admitted = await admit(parts);
                }
                catch (error) {
                    throw admissionError(error);
                }
            }
            else {
                admitted = parts
                    .filter((part) => part.type === 'text')
                    .map((part) => ({ type: 'text', text: part.text }));
            }
            messages.push({ role: 'user', content: admittedContent(admitted) });
            continue;
        }
        throw new ProxyHttpError(400, 'unsupported_role', `Unsupported message role "${role}".`);
    }
    const joinedSystem = system.filter((text) => text.length > 0).join('\n\n');
    return {
        provider: target.provider,
        model: target.model,
        messages,
        ...(joinedSystem ? { system: joinedSystem } : {}),
        ...(reasoningEffort ? { reasoningEffort } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
        ...(maxTokens !== undefined ? { maxTokens } : {}),
    };
}
const FINISH_REASONS = {
    stop: 'stop',
    'max-tokens': 'length',
    'tool-calls': 'tool_calls',
    error: 'stop',
    aborted: 'stop',
};
export function toChatCompletion(input) {
    const usage = input.usage;
    return {
        id: `chatcmpl-${randomUUID().replaceAll('-', '')}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: input.model,
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content: input.text,
                    ...(input.reasoning ? { reasoning_content: input.reasoning } : {}),
                },
                finish_reason: FINISH_REASONS[input.finish ?? 'stop'] ?? 'stop',
            },
        ],
        ...(usage
            ? {
                usage: {
                    prompt_tokens: usage.inputTokens,
                    completion_tokens: usage.outputTokens,
                    total_tokens: usage.totalTokens ?? usage.inputTokens + usage.outputTokens,
                    ...(usage.cacheReadTokens
                        ? { prompt_tokens_details: { cached_tokens: usage.cacheReadTokens } }
                        : {}),
                    ...(usage.reasoningTokens
                        ? { completion_tokens_details: { reasoning_tokens: usage.reasoningTokens } }
                        : {}),
                },
            }
            : {}),
    };
}
const FAILURE_TABLE = {
    CONTEXT_WINDOW_EXCEEDED: {
        status: 400,
        code: 'context_window_exceeded',
        message: 'The request exceeds the model context window.',
    },
    MISSING_CREDENTIAL: {
        status: 502,
        code: 'provider_credential',
        message: 'The provider credential is missing.',
    },
    INVALID_CREDENTIAL: {
        status: 502,
        code: 'provider_auth',
        message: 'The provider credential was rejected.',
    },
    RATE_LIMIT: { status: 429, code: 'rate_limited', message: 'The provider is rate limiting requests.' },
    QUOTA: { status: 429, code: 'quota_exhausted', message: 'The provider quota is exhausted.' },
    ACCOUNT_QUOTA: { status: 429, code: 'quota_exhausted', message: 'The provider quota is exhausted.' },
    UNKNOWN_MODEL: { status: 404, code: 'unknown_model', message: 'The model is not available to the host.' },
    UNSUPPORTED_REASONING_EFFORT: {
        status: 400,
        code: 'unsupported_reasoning_effort',
        message: 'The model does not support the requested reasoning effort.',
    },
    EMPTY_RESPONSE: { status: 502, code: 'empty_response', message: 'The model returned no content.' },
};
export function mapFailure(failure) {
    const mapped = failure?.code ? FAILURE_TABLE[failure.code] : undefined;
    return mapped ?? { status: 502, code: 'model_call_failed', message: 'The model call failed.' };
}
const MAX_PROXY_BODY_BYTES = 64 * 1024 * 1024;
const sendJson = (res, status, payload) => {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(body),
        'cache-control': 'no-store',
    });
    res.end(body);
};
const proxyErrorBody = (error) => ({
    error: { message: error.message, type: 'proxy_error', code: error.code },
});
const sendProxyError = (res, error) => {
    const info = error instanceof ProxyHttpError
        ? error
        : new ProxyHttpError(500, 'proxy_failed', 'The local model proxy failed.');
    sendJson(res, info.status, proxyErrorBody(info));
};
const readProxyBody = async (req) => {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        size += buffer.length;
        if (size > MAX_PROXY_BODY_BYTES) {
            throw new ProxyHttpError(413, 'body_too_large', 'The request body is too large.');
        }
        chunks.push(buffer);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw)
        throw new ProxyHttpError(400, 'invalid_json', 'The request body is not valid JSON.');
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new ProxyHttpError(400, 'invalid_json', 'The request body is not valid JSON.');
    }
};
function unknownErrorCode(error) {
    const code = asRecord(error)?.code;
    return typeof code === 'string' ? code : undefined;
}
export function registerModelProxy(ctx, config) {
    // OpenCode's provider requires the host routing session (chat passes its
    // conversation id); one stable id per proxy keeps the knowledge service's
    // calls in one routing session instead of dropping the header entirely.
    const sessionId = randomUUID();
    let resolveRuntime = () => { };
    let rejectRuntime = () => { };
    const whenReady = new Promise((resolve, reject) => {
        resolveRuntime = resolve;
        rejectRuntime = reject;
    });
    ctx.inject(['webServer', 'llm'], (fresh) => {
        try {
            const attachments = (() => {
                try {
                    return ctx.get('attachments');
                }
                catch {
                    return undefined;
                }
            })();
            // Injection can resolve before the listener binds; wait briefly so the
            // activation sync and the first request see a real origin.
            const waitForOrigin = async () => {
                for (let attempt = 0; attempt < 100; attempt += 1) {
                    try {
                        return fresh.webServer.getOrigin();
                    }
                    catch {
                        await new Promise((resolve) => setTimeout(resolve, 50));
                    }
                }
                throw new Error('webserver origin is unavailable');
            };
            const getOrigin = () => fresh.webServer.getOrigin();
            const getBaseUrl = () => `${getOrigin()}${LLM_PROXY_ROUTE}`;
            let current;
            let inFlight;
            const refresh = () => {
                if (inFlight !== undefined)
                    return inFlight;
                inFlight = waitForOrigin()
                    .then((origin) => buildCatalog(fresh.llm, origin))
                    .then((catalog) => {
                    current = catalog;
                    return catalog;
                })
                    .finally(() => {
                    inFlight = undefined;
                });
                return inFlight;
            };
            const getCatalog = () => current;
            const admit = async (parts) => {
                if (attachments === undefined) {
                    throw new ProxyHttpError(502, 'attachments_unavailable', 'The host attachment service is not available.');
                }
                return attachments.admitPromptContent(parts);
            };
            const handler = async (req, res) => {
                try {
                    authorizeProxy(req.headers, req.socket.remoteAddress, config.apiToken);
                    const pathname = new URL(req.url ?? '/', 'http://webServer').pathname;
                    const suffix = pathname.slice(LLM_PROXY_ROUTE.length);
                    if (suffix === '/models') {
                        if (req.method !== 'GET') {
                            throw new ProxyHttpError(405, 'method_not_allowed', 'The model list accepts GET only.');
                        }
                        let catalog;
                        try {
                            catalog = getCatalog() ?? (await refresh());
                        }
                        catch {
                            throw new ProxyHttpError(503, 'catalog_unavailable', 'The host model catalog is not available.');
                        }
                        sendJson(res, 200, {
                            object: 'list',
                            data: catalog.models.map((model) => ({
                                id: model.alias,
                                object: 'model',
                                created: 0,
                                owned_by: model.provider,
                                name: model.name,
                                ...(model.contextWindow ? { context_length: model.contextWindow } : {}),
                            })),
                        });
                        return;
                    }
                    if (suffix === '/chat/completions') {
                        if (req.method !== 'POST') {
                            throw new ProxyHttpError(405, 'method_not_allowed', 'Chat completions accept POST only.');
                        }
                        const body = asRecord(await readProxyBody(req));
                        if (body === undefined || typeof body.model !== 'string' || !body.model) {
                            throw new ProxyHttpError(400, 'invalid_request', 'The request must name a model.');
                        }
                        const alias = body.model;
                        let catalog;
                        try {
                            catalog = getCatalog() ?? (await refresh());
                        }
                        catch {
                            throw new ProxyHttpError(503, 'catalog_unavailable', 'The host model catalog is not available.');
                        }
                        let model = catalog.byAlias.get(alias);
                        if (model === undefined) {
                            try {
                                catalog = await refresh();
                            }
                            catch {
                                throw new ProxyHttpError(503, 'catalog_unavailable', 'The host model catalog is not available.');
                            }
                            model = catalog.byAlias.get(alias);
                        }
                        if (model === undefined) {
                            throw new ProxyHttpError(404, 'unknown_model', 'The model is not available to the host.');
                        }
                        const options = await buildGenerateOptions(body, { provider: model.provider, model: model.model }, { efforts: model.efforts }, admit);
                        let result;
                        try {
                            result = await collectCompletion(fresh.llm.stream({ ...options, sessionId }));
                        }
                        catch (error) {
                            const mapped = mapFailure(unknownErrorCode(error) ? { code: unknownErrorCode(error) } : undefined);
                            throw new ProxyHttpError(mapped.status, mapped.code, mapped.message);
                        }
                        if (result.finish === 'error' || result.finish === 'aborted') {
                            const mapped = mapFailure(result.failure);
                            throw new ProxyHttpError(mapped.status, mapped.code, mapped.message);
                        }
                        if (!result.text && !result.reasoning) {
                            throw new ProxyHttpError(502, 'empty_response', 'The model returned no content.');
                        }
                        sendJson(res, 200, toChatCompletion({
                            model: alias,
                            text: result.text,
                            reasoning: result.reasoning,
                            ...(result.usage ? { usage: result.usage } : {}),
                            finish: result.finish,
                        }));
                        return;
                    }
                    throw new ProxyHttpError(404, 'not_found', 'Unknown model proxy route.');
                }
                catch (error) {
                    sendProxyError(res, error);
                }
            };
            fresh.effect(() => fresh.webServer.register({ kind: 'prefix', path: LLM_PROXY_ROUTE, handler }), 'harness-rag: model proxy route');
            void refresh().catch(() => { });
            resolveRuntime({ getOrigin, getBaseUrl, refresh, getCatalog });
        }
        catch (error) {
            rejectRuntime(error);
        }
    });
    return { token: config.apiToken, whenReady };
}
