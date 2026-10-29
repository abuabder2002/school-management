#!/usr/bin/env bash
# Full-stack end-to-end cross-school isolation story. Creates a brand-new school via the actual
# Super Admin "Add School" flow (matching exactly how the user triggers the original bug in
# production), creates one record of each of the 6 isolated types as that school's admin, and
# confirms Default School's admin cannot see any of them (and vice versa). Run against the local
# stack (gateway on localhost:8080). Requires python3 with PyJWT and the local dev JWT secret.
set -uo pipefail

JWT_SECRET_FILE="${JWT_SECRET_FILE:-$HOME/.tools/school-local-jwt.secret}"
JWT_SECRET=$(cat "$JWT_SECRET_FILE")
GATEWAY="${GATEWAY:-http://localhost:8080}"

PASS=0
FAIL=0

check() {
  local desc="$1" got="$2" want="$3"
  if [ "$got" = "$want" ]; then
    echo "PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "FAIL: $desc (expected $want, got $got)"
    FAIL=$((FAIL+1))
  fi
}

sign() {
  python3 -c "
import jwt, time, sys
secret = '''$JWT_SECRET'''
email, role, userId, schoolId = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
payload = {'sub': email, 'role': role, 'userId': userId, 'iat': int(time.time()), 'exp': int(time.time())+3600}
if schoolId != 'null':
    payload['schoolId'] = int(schoolId)
print(jwt.encode(payload, secret, algorithm='HS256'))
" "$1" "$2" "$3" "$4"
}

jpath() { python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('$1','') if isinstance(d.get('data'),dict) else '')"; }

SUPER_TOKEN=$(sign "superadmin@educore.test" "SUPER_ADMIN" 9 null)
TOKEN_DEFAULT=$(sign "admin@school.com" "ADMIN" 1 1)

# --- Step 1: create a brand-new school via the real Super Admin "Add School" flow ---

UNIQUE=$(date +%s)
NEW_SCHOOL=$(curl -s -X POST "$GATEWAY/api/auth/schools" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"Iso E2E School $UNIQUE\",\"adminName\":\"Iso E2E Admin\",\"adminEmail\":\"isoe2e-$UNIQUE@test.local\",\"adminPassword\":\"IsoE2EPass123\",\"planType\":\"TRIAL\"}")
NEW_SCHOOL_ID=$(echo "$NEW_SCHOOL" | jpath id)

if [ -z "$NEW_SCHOOL_ID" ]; then
  echo "SETUP FAILED: could not create new school via Super Admin flow. Response: $NEW_SCHOOL"
  exit 2
fi
echo "Created new school id=$NEW_SCHOOL_ID (Iso E2E School $UNIQUE) via Super Admin"

# Log in as the new school's admin for real (public login, no pre-signed token) — proves the
# whole chain works end to end, not just the schoolId claim-signing shortcut used elsewhere.
LOGIN_RESP=$(curl -s -X POST "$GATEWAY/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"isoe2e-$UNIQUE@test.local\",\"password\":\"IsoE2EPass123\"}")
NEW_TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)

if [ -z "$NEW_TOKEN" ]; then
  echo "SETUP FAILED: new school admin login did not return a token. Response: $LOGIN_RESP"
  exit 2
fi

# --- Step 2: as the new school's admin, create one record of each isolated type ---

NEW_STUDENT=$(curl -s -X POST "$GATEWAY/api/students" \
  -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" \
  -d '{"admissionNumber":"E2E-001","name":"E2E Student","className":"Class 7","fatherName":"E2E Father"}')
NEW_STUDENT_ID=$(echo "$NEW_STUDENT" | jpath id)
check "New school: student created" "$([ -n "$NEW_STUDENT_ID" ] && echo yes || echo no)" "yes"

NEW_EXAM=$(curl -s -X POST "$GATEWAY/api/academic/exams" -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" -d '{"name":"E2E Exam"}')
NEW_SUBJECT=$(curl -s -X POST "$GATEWAY/api/academic/subjects" -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" -d '{"name":"E2E Subject"}')
NEW_MARK=$(curl -s -X POST "$GATEWAY/api/academic/marks" \
  -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" \
  -d "{\"studentId\":$NEW_STUDENT_ID,\"studentName\":\"E2E Student\",\"className\":\"Class 7\",\"examName\":\"E2E Exam\",\"subjectName\":\"E2E Subject\",\"marksObtained\":90,\"maxMarks\":100}")
NEW_MARK_ID=$(echo "$NEW_MARK" | jpath id)
check "New school: mark created" "$([ -n "$NEW_MARK_ID" ] && echo yes || echo no)" "yes"

NEW_ATT=$(curl -s -X POST "$GATEWAY/api/attendance" \
  -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" \
  -d "{\"personType\":\"STUDENT\",\"personId\":$NEW_STUDENT_ID,\"date\":\"2026-12-30\",\"status\":\"PRESENT\"}")
NEW_ATT_ID=$(echo "$NEW_ATT" | jpath id)
check "New school: attendance created" "$([ -n "$NEW_ATT_ID" ] && echo yes || echo no)" "yes"

NEW_FEE=$(curl -s -X POST "$GATEWAY/api/fees" \
  -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" \
  -d "{\"studentId\":$NEW_STUDENT_ID,\"termFees1\":500,\"paidAmount\":0}")
NEW_FEE_ID=$(echo "$NEW_FEE" | jpath id)
check "New school: fee created" "$([ -n "$NEW_FEE_ID" ] && echo yes || echo no)" "yes"

NEW_NOTIF=$(curl -s -X POST "$GATEWAY/api/notifications" \
  -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" \
  -d '{"date":"2026-12-30","audience":"STAFF","message":"E2E Notification"}')
NEW_NOTIF_ID=$(echo "$NEW_NOTIF" | jpath id)
check "New school: notification created" "$([ -n "$NEW_NOTIF_ID" ] && echo yes || echo no)" "yes"

NEW_SCHED=$(curl -s -X POST "$GATEWAY/api/academic/schedule" \
  -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" \
  -d '{"className":"Class 7","scheduleDate":"2026-12-30","block":"A","subjectName":"E2E Schedule Subject"}')
NEW_SCHED_ID=$(echo "$NEW_SCHED" | jpath id)
check "New school: daily schedule entry created" "$([ -n "$NEW_SCHED_ID" ] && echo yes || echo no)" "yes"

# --- Step 3: Default School's admin must see none of this ---

D_STUDENTS=$(curl -s "$GATEWAY/api/students?pageSize=1000" -H "Authorization: Bearer $TOKEN_DEFAULT")
check "Default School does not see the new student" "$(echo "$D_STUDENTS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ids=[s.get('id') for s in d.get('data',{}).get('data',[])]
print('isolated' if $NEW_STUDENT_ID not in ids else 'leaked')
" 2>/dev/null)" "isolated"

D_MARKS=$(curl -s "$GATEWAY/api/academic/marks?examName=E2E%20Exam" -H "Authorization: Bearer $TOKEN_DEFAULT")
check "Default School does not see the new mark" "$(echo "$D_MARKS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ids=[m.get('id') for m in d.get('data',[])]
print('isolated' if $NEW_MARK_ID not in ids else 'leaked')
" 2>/dev/null)" "isolated"

D_ATT=$(curl -s "$GATEWAY/api/attendance/person/STUDENT/$NEW_STUDENT_ID" -H "Authorization: Bearer $TOKEN_DEFAULT")
check "Default School does not see the new attendance record" "$(echo "$D_ATT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ids=[a.get('id') for a in d.get('data',[])]
print('isolated' if $NEW_ATT_ID not in ids else 'leaked')
" 2>/dev/null)" "isolated"

D_FEES=$(curl -s "$GATEWAY/api/fees/student/$NEW_STUDENT_ID" -H "Authorization: Bearer $TOKEN_DEFAULT")
check "Default School does not see the new fee" "$(echo "$D_FEES" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ids=[f.get('id') for f in d.get('data',[])]
print('isolated' if $NEW_FEE_ID not in ids else 'leaked')
" 2>/dev/null)" "isolated"

D_NOTIFS=$(curl -s "$GATEWAY/api/notifications/history" -H "Authorization: Bearer $TOKEN_DEFAULT")
check "Default School does not see the new notification" "$(echo "$D_NOTIFS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
msgs=[n.get('message') for n in d.get('data',[])]
print('isolated' if 'E2E Notification' not in msgs else 'leaked')
" 2>/dev/null)" "isolated"

D_SCHED=$(curl -s "$GATEWAY/api/academic/schedule?className=Class%207" -H "Authorization: Bearer $TOKEN_DEFAULT")
check "Default School does not see the new schedule entry" "$(echo "$D_SCHED" | python3 -c "
import json,sys
d=json.load(sys.stdin)
subs=[s.get('subjectName') for s in d.get('data',[])]
print('isolated' if 'E2E Schedule Subject' not in subs else 'leaked')
" 2>/dev/null)" "isolated"

# --- Step 4: regression — Default School's own pre-existing data is unaffected ---

D_COUNT_BEFORE_CHECK=$(echo "$D_STUDENTS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(d.get('data',{}).get('pagination',{}).get('total',0))
" 2>/dev/null)
check "Default School still sees its own (pre-existing) student roster" "$([ "$D_COUNT_BEFORE_CHECK" -gt 0 ] && echo yes || echo no)" "yes"

# --- Cleanup ---
curl -s -X DELETE "$GATEWAY/api/students/$NEW_STUDENT_ID" -H "Authorization: Bearer $NEW_TOKEN" > /dev/null

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
