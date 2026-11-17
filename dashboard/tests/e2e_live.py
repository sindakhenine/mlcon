# Live AI guard test, no real key and no cost.
# How to run (test values only):
#   cd dashboard && SITE_ACCESS_CODE=owner-test-1 ADMIN_PASSWORD=admin-test-1 npx next dev -p 3202
#   python3 tests/e2e_live.py              -> checks the switch and the missing-key message
#   (optional) restart with ANTHROPIC_API_KEY=sk-ant-fake-test and run with --fake-key
#                                          -> checks that a refused key gives a friendly error
import http.cookiejar
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

B = "http://localhost:3202"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()), NoRedirect)


def req(op, path, data=None, js=None):
    h, body = {}, None
    if js is not None:
        body, h["content-type"] = json.dumps(js).encode(), "application/json"
    elif data is not None:
        body = urllib.parse.urlencode(data).encode()
    r = urllib.request.Request(B + path, data=body, headers=h, method="POST" if body else "GET")
    try:
        res = op.open(r, timeout=90)
        return res.status, res.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


for _ in range(120):
    try:
        urllib.request.urlopen(B + "/locked", timeout=5)
        break
    except Exception:
        time.sleep(1)

ok = True


def check(name, cond, info=""):
    global ok
    ok &= bool(cond)
    print(("PASS " if cond else "FAIL ") + name + (f"   [{info}]" if info else ""))


fake = "--fake-key" in sys.argv
anon, owner = client(), client()
check("1 locked visitor cannot call live", req(anon, "/api/live/s1", js={})[0] == 401)
req(owner, "/api/unlock", data={"code": "owner-test-1", "next": "/"})
req(owner, "/api/admin/login", data={"password": "admin-test-1"})
req(owner, "/api/admin/state", js={"liveAI": False})
s, b = req(owner, "/api/live/s1", js={})
if fake:
    check("2 Live AI off blocks the call", s == 403 and "switched off" in b, b)
else:
    check("2 no key: clear message", s == 503 and "No API key" in b, b)
req(owner, "/api/admin/state", js={"liveAI": True})
time.sleep(5.3)
s, b = req(owner, "/api/live/s1", js={"switches": {"refresh": False}})
if fake:
    lines = [json.loads(x) for x in b.splitlines() if x.strip()]
    check("3 refused key: friendly error in the stream", s == 200 and any(e.get("type") == "error" and "refused" in e.get("message", "") for e in lines), lines[-1:])
    s, b = req(owner, "/api/live/s2", js={"ticket": ""})
    check("4 empty ticket refused", s == 400, b)
else:
    check("3 still no key with Live AI on", s == 503, b)
s, b = req(owner, "/api/admin/state")
d = json.loads(b)
check("5 admin shows AI status", "ai" in d and d["ai"]["model"] == "claude-opus-5-5", d.get("ai"))
req(owner, "/api/admin/state", js={"action": "kill"})
print("ALL PASS" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
