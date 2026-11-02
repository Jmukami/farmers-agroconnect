// Send read-only traffic to the AgroConnect API to generate monitoring data.
// From the repo root in PowerShell: $env:KEY = '<configured-api-key>'; node server/traffic.js
const API = (process.env.API || 'http://localhost:3001').replace(/\/$/, '');
const KEY = process.env.KEY;
const N = Number(process.env.N || 60);
const mix = [
    { method: 'GET', path: '/api/health', key: false },
    { method: 'GET', path: '/api/farmers', key: true },
    { method: 'GET', path: '/api/farmers/999999999', key: true }, // valid route, missing record
    { method: 'GET', path: '/api/produce?search=tomatoes', key: true },
    { method: 'GET', path: '/api/produce/999999999', key: true }, // valid route, missing record
    { method: 'GET', path: '/api/products?kind=input', key: true },
    { method: 'GET', path: '/api/products/999999999', key: true }, // valid route, missing record
    { method: 'GET', path: '/api/stats', key: true },
    { method: 'GET', path: '/api/products', key: false }, // missing API key: expected 401
];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
if (!KEY) {
    console.error('Set KEY to a value configured in API_KEYS before running traffic.');
    process.exitCode = 1;
    return;
}
const counts = {};
for (let i = 0; i < N; i++) {
    const r = mix[Math.floor(Math.random() * mix.length)];
    try {
        const res = await fetch(`${API}${r.path}`, {
            method: r.method,
            headers: r.key ? { 'X-API-Key': KEY } : {},
        });
        counts[res.status] = (counts[res.status] || 0) + 1;
    } catch {
        counts.failed = (counts.failed || 0) + 1;
    }
    await pause(50);
}
console.log('Status codes received:', counts);
})();
