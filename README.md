# Nyaa API

An open-source TypeScript reimplementation of [Vivek-Kolhe's Nyaa API](https://github.com/Vivek-Kolhe/Nyaa-API), compatible with the observed 2.0.1 API at https://nyaaapi.onrender.com. It scrapes public website metadata, not torrent payloads.

Run locally with Node 24.

```sh
npm ci
npm run build
npm start
```

For Docker, run `docker compose up --build -d`. The API listens on http://localhost:3000. Set the host port with `PORT=8080 docker compose up --build -d`. Published images are available at `ghcr.io/koboshchan/nyaa-api:latest`.

```sh
curl 'http://localhost:3000/nyaa?q=ubuntu&category=software&sub_category=applications'
curl 'http://localhost:3000/nyaa/id/96659'
curl 'http://localhost:3000/nyaa/user/Team%20Yarashii?q=Doki'
```

Both `/nyaa` and `/sukebei` support search, `/id/{torrent_id}`, and `/user/{user_name}`. Search and user routes accept `q`, `category`, `sub_category`, `sort`, `order`, and `page`. Page defaults to 1. Sort accepts `id`, `size`, `seeders`, `leechers`, or `downloads`; order accepts `asc` or `desc`.

Nyaa categories are `anime` (amv, eng, non-eng, raw), `audio` (lossless, lossy), `manga` (eng, non-eng, raw), `live_action` (eng, promo, non-eng, raw), `pictures` (graphics, photos), and `software` (applications, games). The original README's singular `application` is rejected by the live API; this implementation follows its actual behavior.

Sukebei categories are `art` (anime, doujinshi, manga, games, pictures) and `real` (photos, videos). Subcategories require a category.

Search returns `{count,data:[...]}`. Count is the number of entries on the current page, not the total number of results. Each entry has `category`, `title`, `link`, `torrent`, `magnet`, `size`, `time`, `seeders`, `leechers`, and `downloads`.

ID routes return `{data:{...}}`, not the search envelope. They include uploader, information, infohash, and comments. Comments include user, profileUrl, avatar, commentBody, time, and link. Invalid numeric parameters produce FastAPI/Pydantic-style 422 responses. Invalid filters produce 400; missing users or IDs produce 404.

The root returns app, version, ip, and uptime. IP is the container's local interface address, and uptime is this process's age; neither is expected to equal the hosted original's runtime values. The observed OpenAPI document is bundled at `/openapi.json`. Interactive Swagger documentation is at `/docs` and loads Swagger UI assets from a CDN.

Run `npm test` and `npm run typecheck` for the offline fixture tests. With the API running, `python3 scripts/compare-live.py` compares safe metadata queries, IDs, user searches, validation, and documentation against the original. Override the local URL with `API_BASE`. Sukebei is checked only with a deliberately nonexistent query; no adult-content fixtures are included.

The multi-stage Dockerfile compiles the entire application and HTML parser into one minified CommonJS file. The non-root runner contains no application node_modules. The local amd64 image is approximately 53.2 MB as reported by Docker, with a roughly 212 KiB bundle. The Alpine runner copies only the Node binary, without npm, yarn, or global node_modules. Compose runs read-only with all capabilities dropped.

GitHub Actions tests every push and pull request. Pushes to main and tags publish amd64/arm64 images to GHCR using GITHUB_TOKEN with packages write permission. Main publishes latest; tags publish their tag name, with semver aliases for version tags.

This is an independent implementation, not the original closed-source code. The [Nyaa Telegram Bot](https://github.com/Vivek-Kolhe/Nyaa-Telegram-Bot) was examined as a reference for route and category conventions; its current source calls the API rather than implementing scraping. The original response format and public site HTML informed this parser. MIT, copyright koboshchan. Dependency licenses remain with their respective authors.

Use metadata only where you have the right to do so, respect upstream sites, and don't expose an unrestricted public proxy without rate limiting. No downloads are started by this service. Website layout changes can break scraping, and unobserved edge cases may differ from the original. Upstream outages return 502 rather than leaking internal errors.
