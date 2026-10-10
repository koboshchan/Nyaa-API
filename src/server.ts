import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { parseSearch, parseDetail } from './parser.js';
import { ApiError, buildQuery, integer, type Site } from './query.js';
import spec from './openapi.json' with { type: 'json' };

const started = performance.now();
const bases = { nyaa: 'https://nyaa.si', sukebei: 'https://sukebei.nyaa.si' };
const docs = '<!doctype html><html><head><meta charset="utf-8"><title>Nyaa-API - Swagger UI</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:"/openapi.json",dom_id:"#swagger-ui",deepLinking:true})</script></body></html>';

async function scrape(url: URL, detail: boolean) {
  // Fixed upstream hosts, no user-provided URLs or offsite redirects.
  const response = await fetch(url, { redirect: 'manual',
    signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Nyaa-API/2.0.1 (open-source compatible implementation)' } });
  if (response.status === 404 || response.status === 403) {
    const message = url.pathname.startsWith('/view/') ? 'Invalid torrent ID.'
      : url.pathname.startsWith('/user/') ? 'Invalid username.'
      : '404 Error: Lost in the digital wilderness! This endpoint is playing hide and seek. Consult the documentation to reveal its secret location.';
    throw new ApiError(404, message);
  }
  if (!response.ok) throw new ApiError(502, 'Upstream website unavailable.');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 8 * 1024 * 1024) throw new ApiError(502, 'Upstream response too large.');
  return new TextDecoder().decode(bytes);
}
export const server = createServer(async (req, res) => {
  const respond = (status: number, body: unknown, html = false) => {
    res.writeHead(status, { 'Content-Type': html ? 'text/html; charset=utf-8' : 'application/json', 'X-Content-Type-Options': 'nosniff' });
    res.end(html ? body as string : JSON.stringify(body));
  };
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method !== 'GET') return respond(405, { detail: 'Method Not Allowed' });
    if (url.pathname === '/') {
      // Deployment proxies must overwrite these headers; they are informational,
      // not suitable for authorization or rate limiting without a trust policy.
      const forwarded = req.headers['x-forwarded-for'];
      const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
      const realHeader = req.headers['x-real-ip'];
      const real = (Array.isArray(realHeader) ? realHeader[0] : realHeader)?.trim();
      const ip = first && isIP(first) ? first
        : real && isIP(real) ? real : req.socket.remoteAddress;
      return respond(200, { app: 'Nyaa API', version: '2.0.1', ip, uptime: (performance.now() - started) / 1000 });
    }
    if (url.pathname === '/openapi.json') return respond(200, spec);
    if (url.pathname === '/docs') return respond(200, docs, true);
    const match = /^\/(nyaa|sukebei)(?:\/(id|user)\/([^/]+))?\/?$/.exec(url.pathname);
    if (!match) return respond(404, { detail: 'Not Found' });
    if (url.pathname.endsWith('/')) {
      res.writeHead(307, { Location: url.pathname.slice(0, -1) + url.search });
      return res.end();
    }
    const site = match[1] as Site, mode = match[2], value = decodeURIComponent(match[3] ?? '');
    const base = bases[site];
    if (mode === 'id') {
      const id = String(integer(value, 'path', 'torrent_id'));
      const html = await scrape(new URL('/view/' + id, base), true);
      return respond(200, parseDetail(html, base, id));
    }
    const target = new URL(mode === 'user' ? '/user/' + encodeURIComponent(value) : '/', base);
    target.search = buildQuery(site, url.searchParams).toString();
    return respond(200, parseSearch(await scrape(target, false), base));
  } catch (error) {
    if (error instanceof ApiError) return respond(error.status, { detail: error.detail });
    return respond(502, { detail: 'Upstream website unavailable.' });
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '0.0.0.0', () => console.log('Nyaa-API listening'));
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => server.close(() => process.exit(0)));
