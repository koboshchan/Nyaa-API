#!/usr/bin/env python3
"""Metadata-only parity matrix. Writes full side-by-side results, exits nonzero on diffs."""
import json, urllib.request, urllib.error, os, pathlib, time
base = os.environ.get('API_BASE', 'http://127.0.0.1:3000')
empty = 'zzzz-no-match-892332'
paths = [
 '/nyaa?q=ubuntu', '/nyaa?q=ubuntu&category=software&sub_category=applications',
 '/nyaa?q='+empty, '/nyaa?q='+empty+'&q=ubuntu',
 '/nyaa?q='+empty+'&page=0', '/nyaa?q='+empty+'&page=-1',
 '/nyaa?q='+empty+'&page=2', '/nyaa?q='+empty+'&page=1.0',
 '/nyaa?q='+empty+'&page=+1', '/nyaa?q='+empty+'&page=', '/nyaa?page=abc',
 '/nyaa?page=1.5', '/nyaa?page=1e2', '/nyaa?page=999999999999999999999999',
 '/nyaa?q=&category=software&sub_category=applications&page=999999',
 '/nyaa?q='+empty+'&category=', '/nyaa?q='+empty+'&sort=', '/nyaa?q='+empty+'&order=',
 '/nyaa?category=bad', '/nyaa?category=Software', '/nyaa?category=6',
 '/nyaa?sub_category=bad', '/nyaa?category=software&sub_category=application',
 '/nyaa?category=software&sub_category=bad', '/nyaa?sort=bad', '/nyaa?sort=comments', '/nyaa?order=bad',
 '/nyaa/id/96659', '/nyaa/id/1013299', '/nyaa/id/0', '/nyaa/id/-1', '/nyaa/id/abc',
 '/nyaa/id/96659.0', '/nyaa/user/Team%20Yarashii?q=Doki',
 '/nyaa/user/NO_SUCH_USER_892332', '/nyaa/user/NyaaTorrents?q=ubuntu',
 '/sukebei?q='+empty, '/openapi.json'
]
for sort in ['id','size','seeders','leechers','downloads']:
 for order in ['asc','desc']:
  paths.append('/nyaa?q=ubuntu&sort='+sort+'&order='+order)
for category, subs in {
 'anime':['amv','eng','non-eng','raw'], 'audio':['lossless','lossy'],
 'manga':['eng','non-eng','raw'], 'live_action':['eng','promo','non-eng','raw'],
 'pictures':['graphics','photos'], 'software':['applications','games']
}.items():
 paths.append('/nyaa?q='+empty+'&category='+category)
 for sub in subs: paths.append('/nyaa?q='+empty+'&category='+category+'&sub_category='+sub)
def get(url):
 try:
  r = urllib.request.urlopen(url, timeout=45)
 except urllib.error.HTTPError as e: r = e
 raw=r.read().decode()
 try: body=json.loads(raw)
 except ValueError: body=raw
 return {'status':r.code,'body':body}
results=[]
for p in paths:
 try:
  a=get('https://nyaaapi.onrender.com'+p); b=get(base+p)
  result={'path':p,'match':a==b,'original':a,'clone':b}
 except Exception as e: result={'path':p,'match':False,'error':str(e)}
 results.append(result)
 print(('MATCH' if result['match'] else 'DIFF'),p,flush=True)
output=pathlib.Path(os.environ.get('REPORT','research/parity-results.json'))
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n')
diffs=[r for r in results if not r['match']]
print(json.dumps({'cases':len(results),'matches':len(results)-len(diffs),'diffs':len(diffs)}))
raise SystemExit(bool(diffs))
