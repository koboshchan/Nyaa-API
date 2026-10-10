import json,urllib.request,os
base=os.environ.get('API_BASE', 'http://127.0.0.1:3000')
paths=['/nyaa?q=ubuntu&sort=seeders&order=desc&page=1','/nyaa?q=ubuntu&category=software&sub_category=applications','/nyaa?q=zzzz-no-match-892332','/nyaa/user/NyaaTorrents?q=ubuntu','/nyaa/id/96659','/nyaa/id/1013299','/nyaa/user/Team%20Yarashii?q=Doki','/nyaa?page=abc','/nyaa/id/abc','/nyaa/id/0','/nyaa?category=bad','/nyaa/user/NO_SUCH_USER_892332','/sukebei?q=zzzz-no-match-892332']
def get(url):
 try:
  r=urllib.request.urlopen(url,timeout=45);return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
for p in paths:
 a=get('https://nyaaapi.onrender.com'+p);b=get(base+p)
 assert a==b,(p,a,b)
 print('MATCH',p,'status',b[0])
for p in ['/','/openapi.json','/docs']:
 r=urllib.request.urlopen(base+p);print('PASS',p,r.status)
assert get(base+'/openapi.json')[1]==get('https://nyaaapi.onrender.com/openapi.json')[1]
print('OPENAPI EXACT MATCH')
