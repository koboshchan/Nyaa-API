# Nyaa API (closed-source v2.0.1) observed format
Base https://nyaaapi.onrender.com, FastAPI, spec at /openapi.json
GET / -> {app, version, ip, uptime}
GET /nyaa, /sukebei ?q&category&sub_category&sort&order(asc|desc)&page=1
GET /{site}/id/{torrent_id}
GET /{site}/user/{user_name} (same query params)
Search response: {count, data:[{category, title, link, torrent, magnet, size:"4.2 GiB", time:"YYYY-MM-DD HH:MM", seeders, leechers, downloads}]}
422 -> {detail:[{loc,msg,type}]}. Response schemas undocumented ({}), category values not enumerated.
