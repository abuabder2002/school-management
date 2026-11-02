#!/usr/bin/env bash
# Regression check for the "standard exams/subjects/classes" auto-seeding. Run against the local
# stack (gateway on localhost:8080). Requires python3 with PyJWT and the local dev JWT secret.
#
# Guards two real bugs found in production:
#   1. A brand-new school whose dashboard + Marks page load at the same moment got every standard
#      exam TWICE (two requests both saw "empty" and both seeded).
#   2. A school that deleted its exams/subjects/classes saw them all come straight back on refresh
#      (the lists were re-seeded whenever they were empty, not just once).
set -uo pipefail

JWT_SECRET_FILE="${JWT_SECRET_FILE:-$HOME/.tools/school-local-jwt.secret}"
GATEWAY="${GATEWAY:-http://localhost:8080}"

JWT_SECRET_FILE="$JWT_SECRET_FILE" GATEWAY="$GATEWAY" python3 - <<'EOF'
import concurrent.futures as cf, json, os, random, sys, time, urllib.request, urllib.error
import jwt

secret = open(os.environ["JWT_SECRET_FILE"], encoding="ascii").read().strip()
gateway = os.environ["GATEWAY"]
school_id = 900000 + random.randint(0, 99999)  # a school that has never existed, so nothing is pre-seeded
token = jwt.encode({"sub": "seed-test@test.local", "role": "ADMIN", "userId": 9100, "schoolId": school_id,
                    "iat": int(time.time()), "exp": int(time.time()) + 3600}, secret, algorithm="HS256")

def call(method, path):
    req = urllib.request.Request(gateway + path, method=method, headers={"Authorization": "Bearer " + token})
    try:
        r = urllib.request.urlopen(req)
        return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")

passed = failed = 0
def check(desc, got, want):
    global passed, failed
    if got == want:
        print(f"PASS: {desc}"); passed += 1
    else:
        print(f"FAIL: {desc} (expected {want}, got {got})"); failed += 1

def items(path):
    status, body = call("GET", path)
    return body.get("data") or []

# 1. Simultaneous first loads (dashboard + Marks page + dropdowns all fire together)
with cf.ThreadPoolExecutor(8) as ex:
    list(ex.map(lambda p: call("GET", p), ["/api/academic/exams", "/api/academic/subjects", "/api/academic/classes"] * 3))
exams, subjects, classes = items("/api/academic/exams"), items("/api/academic/subjects"), items("/api/academic/classes")
check("new school gets each standard exam exactly once (no duplicates)", len(exams), 6)
check("new school gets each standard subject exactly once", len(subjects), 9)
check("new school gets each standard class exactly once", len(classes), 12)

# 2. Deleting everything must stick
for e in exams: call("DELETE", f"/api/academic/exams/{e['id']}")
for s in subjects: call("DELETE", f"/api/academic/subjects/{s['id']}")
for c in classes: call("DELETE", f"/api/academic/classes/{c['id']}")
check("exams stay deleted after a refresh", len(items("/api/academic/exams")), 0)
check("subjects stay deleted after a refresh", len(items("/api/academic/subjects")), 0)
check("classes stay deleted after a refresh", len(items("/api/academic/classes")), 0)

print(f"\n{passed} passed, {failed} failed (test school id {school_id}; remove its rows with: "
      f"DELETE FROM academic_seed_markers WHERE school_id={school_id})")
sys.exit(1 if failed else 0)
EOF
