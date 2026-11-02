const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const errorReason = (error) => {
    const code = error?.cause?.code ?? error?.code;
    return typeof code === 'string' ? code : error?.name;
};

function retryAfterMs(response) {
    const value = response.headers.get('Retry-After');
    if (!value) return 0;
    const seconds = Number(value);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
    return Number.isFinite(delay) && delay > 0 ? Math.min(delay, 5000) : 0;
}

export async function fetchWithRetry(url, options = {}, config = {}) {
    const { timeoutMs = 1500, retries = 2, delayMs = 200, fetchImpl = fetch, onRetry = () => {} } = config;
    const method = (options.method || 'GET').toUpperCase();
    const maxRetries = method === 'GET' ? retries : 0;
    for (let attempt = 0; ; attempt++) {
        let response;
        let requestError;
        try {
            response = await fetchImpl(url, {
                ...options,
                signal: AbortSignal.timeout(timeoutMs),
            });
        } catch (error) {
            if (attempt >= maxRetries) throw error;
            requestError = error;
        }

        if (response && (!RETRY_STATUSES.has(response.status) || attempt >= maxRetries)) return response;

        onRetry({ attempt: attempt + 1, upstreamStatus: response?.status, reason: errorReason(requestError) });

        const wait = response?.status === 429
            ? retryAfterMs(response) || delayMs * 2 ** attempt
            : delayMs * 2 ** attempt;
        if (response?.body) {
            try { await response.body.cancel(); } catch { /* The response may already be consumed or closed. */ }
        }
        await sleep(wait);
    }
}
