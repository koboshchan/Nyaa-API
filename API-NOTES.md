# Nyaa API (closed-source v2.0.1) observed format
Base https://nyaaapi.onrender.com, FastAPI, spec at /openapi.json
GET / -> {app, version, ip, uptime}
GET /nyaa, /sukebei ?q&category&sub_category&sort&order(asc|desc)&page=1
GET /{site}/id/{torrent_id}
GET /{site}/user/{user_name} (same query params)
Search response: {count, data:[{category, title, link, torrent, magnet, size:"4.2 GiB", time:"YYYY-MM-DD HH:MM", seeders, leechers, downloads}]}
422 -> {detail:[{loc,msg,type}]}. Response schemas undocumented ({}), category values not enumerated.

Network investigation, October 10 2026

Captured real HTTPS exchanges with curl -v against both public servers. Reproduce with sh scripts/capture-network.sh. Committed traces retain request/response headers; transport progress and upstream cookies are removed. No credentials were sent. This observes client-to-API and client-to-Nyaa traffic, NOT the original server's private outgoing requests. Its internal User-Agent, exact parameter ordering, connection reuse, and headers cannot be recovered from these exchanges. Mapping is supported by site HTML/forms and matching responses, not a claim of intercepting server traffic.

The API request was GET /nyaa?q=ubuntu&category=software&sub_category=applications&sort=seeders&order=desc&page=1 over HTTP/2, with Host, curl/8.5.0 User-Agent, and Accept */*. It returned 200 application/json behind Cloudflare, x-render-origin-server uvicorn, vary Accept-Encoding, and cf-cache-status DYNAMIC. Request IDs and dates are deployment-specific.

The direct Nyaa request was GET /?f=0&c=6_1&q=ubuntu&s=seeders&o=desc&p=1, using the same curl headers. It returned 200 text/html; charset=utf-8 behind ddos-guard, cache-control no-cache/no-store/must-revalidate, referrer-policy same-origin, x-robots-tag noarchive, and anti-DDoS cookies. The single Koha result matches the API response field-for-field.

Parameter mapping is q to q, category/sub_category to c=main_sub, sort to s, order to o, page to p. The clone sets f=0 (no filter). Nyaa forms confirm c values. Category IDs are anime=1, audio=2, manga/literature=3, live_action=4, pictures=5, software=6. A missing subcategory uses 0. Anime sub-IDs are amv=1/eng=2/non-eng=3/raw=4; audio lossless=1/lossy=2; manga eng=1/non-eng=2/raw=3; live action eng=1/promo=2/non-eng=3/raw=4; pictures graphics=1/photos=2; software applications=1/games=2. Each documented category/subcategory name was exercised against the API with a nonexistent query. Because empty results alone cannot prove numeric mapping, numeric evidence comes from the actual site category options. Sukebei mapping remains based on reference conventions; only a nonexistent search response was fetched there.

All five sort names (id,size,seeders,leechers,downloads) in both directions matched the original on Ubuntu metadata. Sort maps unchanged; comments is rejected even though Nyaa itself has that sort. Pagination is p, not page, upstream. Page 2 for the one-result query is empty; count is the page's row count. Zero and negative pages are accepted. FastAPI accepts integer-valued decimal strings such as 1.0, whitespace and signs, but rejects empty page, abc, 1.5 and 1e2 with 422 int_parsing. Huge integers must remain decimal strings rather than JS scientific notation; the clone now uses BigInt when constructing p.

Empty q is accepted. Empty category/sort/order behave like omission. Repeated query parameters use the last value. Category values are case-sensitive and numeric category names are rejected. Subcategory alone yields 400. Bad categories/subcategories/sort/order yield the exact observed detail messages. A missing ID or username returns 404, with Invalid torrent ID. or Invalid username. Trailing API slashes redirect with 307.

The initial 71-case matrix found two differences. A 24-digit page was rounded by JS and serialized in exponent notation, causing the clone to return page-one results while the original returned 404. A broad empty query beyond Nyaa's page limit returned upstream 403, which the original translates into its custom 404 digital-wilderness message; the clone previously returned 502. Both are fixed. Missing search-page 404 and page-limit 403 use that custom response; missing ID/user keep their specific responses.

The final side-by-side report is research/parity-results.json, produced by API_BASE=http://127.0.0.1:38479 python3 scripts/compare-live.py. Result was 71 matches, zero diffs, including two IDs (one with comments), a real user search, all Nyaa category/subcategory names, ten sort/order combinations, empty/repeated q, numeric edge cases, invalid filters, missing resources, OpenAPI, and a minimal empty Sukebei shape. Full statuses and bodies are recorded, not just snippets. Counters can change between future requests, so future differences require inspection rather than automatic normalization.
