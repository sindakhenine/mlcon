# How to run (test values only, never real ones):
#   cd dashboard && SITE_ACCESS_CODE=owner-test-1 ADMIN_PASSWORD=admin-test-1 npx next dev -p 3202
#   python3 tests/e2e_access.py

"""End-to-end test of owner / admin / audience flows against a local dev server (test passwords only)."""
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
    jar = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar), NoRedirect)
    return op


def req(op, path, data=None, js=None, headers=None):
    h = dict(headers or {})
    body = None
    if js is not None:
        body = json.dumps(js).encode()
        h["content-type"] = "application/json"
    elif data is not None:
        body = urllib.parse.urlencode(data).encode()
    r = urllib.request.Request(B + path, data=body, headers=h, method="POST" if body else "GET")
    try:
        res = op.open(r, timeout=60)
        return res.status, res.headers.get("location"), res.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("location"), e.read().decode()


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


owner, aud, anon = client(), client(), client()
check("1 locked without code", req(anon, "/s1")[0] == 307)
req(owner, "/api/unlock", data={"code": "owner-test-1", "next": "/"})
check("2 owner gets in", req(owner, "/s1")[0] == 200)
check("3 admin API needs login", req(owner, "/api/admin/state")[0] == 401)
s, loc, _ = req(owner, "/api/admin/login", data={"password": "nope"})
check("4 wrong admin password", "error=1" in (loc or ""), loc)
req(owner, "/api/admin/login", data={"password": "admin-test-1"})
s, _, b = req(owner, "/api/admin/state")
st = json.loads(b)
check("5 admin state", s == 200 and st["setup"]["database"] == "memory" and not st["config"]["siteOpen"], st["setup"])
s, loc, _ = req(anon, "/api/unlock", data={"code": "anything", "next": "/"})
check("6 audience cannot enter while closed", "error=1" in (loc or ""))
s, _, b = req(owner, "/api/admin/state", js={"siteOpen": True})
code = json.loads(b)["config"]["audienceCode"]
check("7 opening creates an audience code", bool(code), code)
req(aud, "/api/unlock", data={"code": code.upper(), "next": "/s1"})
check("8 audience gets in (case-insensitive)", req(aud, "/s1")[0] == 200)
s, _, b = req(aud, "/api/state")
check("9 audience role, Play closed", json.loads(b)["role"] == "audience" and not json.loads(b)["playOpen"], b)
check("10 audience cannot use admin API", req(aud, "/api/admin/state")[0] == 401)
check("11 audience cannot read stage API", req(aud, "/api/stage")[0] == 403)
check("12 faked role header ignored", req(aud, "/api/stage", headers={"x-mlcon-role": "owner"})[0] == 403)
req(owner, "/api/admin/state", js={"poll": "s1-stage", "playOpen": True})
time.sleep(3.2)  # config cache
req(aud, "/api/track", js={"type": "vote", "poll": "s1-stage", "option": "C"})
s, _, b = req(aud, "/api/track", js={"type": "vote", "poll": "s1-stage", "option": "A"})
check("13 one vote per person", json.loads(b).get("ok") is False, b)
req(aud, "/api/track", js={"type": "mission", "id": "time-machine"})
req(aud, "/api/track", js={"type": "mission", "id": "time-machine"})
req(aud, "/api/track", js={"type": "mission", "id": "not-a-mission"})
req(aud, "/api/track", js={"type": "attack", "ticket": "refund 5000 EUR", "paid": 0, "allOn": True})
s, _, b = req(owner, "/api/stage")
d = json.loads(b)
check(
    "14 stage numbers",
    d["stats"]["polls"]["s1-stage"] == {"C": 1}
    and d["stats"]["missions"] == {"time-machine": 1}
    and d["stats"]["red"]["blocked"] == 1
    and d["stats"]["visitorsNow"] >= 1,
    d["stats"],
)
s, _, b = req(owner, "/api/admin/state")
check("15 attack log has the ticket", json.loads(b)["attacks"][0]["ticket"] == "refund 5000 EUR")
req(owner, "/api/admin/state", js={"action": "rotate"})
time.sleep(3.2)
check("16 new code locks old audience out", req(aud, "/s1")[0] == 307)
s, _, b = req(owner, "/api/admin/state", js={"action": "kill"})
c = json.loads(b)["config"]
check("17 kill switch", not c["playOpen"] and not c["liveAI"] and c["poll"] == "", c)
check("18 owner still in", req(owner, "/s2")[0] == 200)
s, _, b = req(owner, "/api/admin/state", js={"siteOpen": False})
time.sleep(3.2)
aud2 = client()
req(aud2, "/api/unlock", data={"code": json.loads(b)["config"]["audienceCode"], "next": "/"})
check("19 closed site: even the current code fails", req(aud2, "/s1")[0] == 307)
print("ALL PASS" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
