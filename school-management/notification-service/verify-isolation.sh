#!/usr/bin/env bash
# Verifies schoolId isolation for notification-service's Notification entity, including the
# dual-path POST (internal attendance-service caller vs external ADMIN). Run against the local
# stack (gateway on localhost:8080). Requires python3 with PyJWT and the local dev JWT secret.
set -uo pipefail

JWT_SECRET_FILE="${JWT_SECRET_FILE:-$HOME/.tools/school-local-jwt.secret}"
JWT_SECRET=$(cat "$JWT_SECRET_FILE")
GATEWAY="${GATEWAY:-http://localhost:8080}"
DIRECT="${DIRECT:-http://localhost:8086}"

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

TOKEN_S1=$(sign "admin@school.com" "ADMIN" 1 1)
TOKEN_S2=$(sign "admin-a@testschool.test" "ADMIN" 10 2)

# --- External (ADMIN) create, schoolId resolved from JWT ---

NOTIF_CREATE=$(curl -s -X POST "$GATEWAY/api/notifications" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"date":"2026-12-30","audience":"STAFF","message":"IsoNotifTestX"}')
NOTIF_ID=$(echo "$NOTIF_CREATE" | jpath id)

if [ -z "$NOTIF_ID" ]; then
  echo "SETUP FAILED: could not create test notification. Response: $NOTIF_CREATE"
  exit 2
fi
echo "Created test notification id=$NOTIF_ID under School 1"

HISTORY_S2=$(curl -s "$GATEWAY/api/notifications/history" -H "Authorization: Bearer $TOKEN_S2")
LEAKED=$(echo "$HISTORY_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
msgs = [n.get('message') for n in d.get('data', [])]
print('leaked' if 'IsoNotifTestX' in msgs else 'isolated')
" 2>/dev/null)
check "School 2 admin's notification history does not include School 1's notification" "$LEAKED" "isolated"

HISTORY_S1=$(curl -s "$GATEWAY/api/notifications/history" -H "Authorization: Bearer $TOKEN_S1")
S1_OK=$(echo "$HISTORY_S1" | python3 -c "
import json, sys
d = json.load(sys.stdin)
msgs = [n.get('message') for n in d.get('data', [])]
print('present' if 'IsoNotifTestX' in msgs else 'missing')
" 2>/dev/null)
check "School 1 admin's notification history includes their own notification" "$S1_OK" "present"

# --- Internal (no auth) dual-path: schoolId must come from the request body ---

NO_AUTH_NO_SCHOOL=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DIRECT/api/notifications" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-12-30","audience":"ADMIN","message":"IsoInternalNoSchool"}')
check "Internal POST with no auth and no schoolId returns 400" "$NO_AUTH_NO_SCHOOL" "400"

INTERNAL_CREATE=$(curl -s -X POST "$DIRECT/api/notifications" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-12-30","audience":"ADMIN","message":"IsoInternalSchool2","schoolId":2}')
INTERNAL_ID=$(echo "$INTERNAL_CREATE" | jpath id)

INTERNAL_HISTORY_S1=$(curl -s "$GATEWAY/api/notifications/history" -H "Authorization: Bearer $TOKEN_S1")
INTERNAL_LEAKED=$(echo "$INTERNAL_HISTORY_S1" | python3 -c "
import json, sys
d = json.load(sys.stdin)
msgs = [n.get('message') for n in d.get('data', [])]
print('leaked' if 'IsoInternalSchool2' in msgs else 'isolated')
" 2>/dev/null)
check "Internal notification created with schoolId=2 is not visible to School 1's admin" "$INTERNAL_LEAKED" "isolated"

INTERNAL_HISTORY_S2=$(curl -s "$GATEWAY/api/notifications/history" -H "Authorization: Bearer $TOKEN_S2")
INTERNAL_PRESENT=$(echo "$INTERNAL_HISTORY_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
msgs = [n.get('message') for n in d.get('data', [])]
print('present' if 'IsoInternalSchool2' in msgs else 'missing')
" 2>/dev/null)
check "Internal notification created with schoolId=2 is visible to School 2's admin" "$INTERNAL_PRESENT" "present"

# --- Task 6 deferred check: attendance-service's teacher-leave notification carries schoolId ---

TOKEN_TEACHER_S1=$(sign "teacher@school.com" "TEACHER" 2 1)
curl -s -X POST "$GATEWAY/api/attendance/teacher-leave" \
  -H "Authorization: Bearer $TOKEN_TEACHER_S1" -H "Content-Type: application/json" \
  -d '{"teacherName":"Iso Teacher","leaveDate":"2026-12-28","reason":"IsoDeferredCheckX"}' > /dev/null

sleep 1
TEACHER_NOTIF_S1=$(curl -s "$GATEWAY/api/notifications/history" -H "Authorization: Bearer $TOKEN_S1")
TEACHER_NOTIF_S1_FOUND=$(echo "$TEACHER_NOTIF_S1" | python3 -c "
import json, sys
d = json.load(sys.stdin)
msgs = [n.get('message','') for n in d.get('data', [])]
print('present' if any('IsoDeferredCheckX' in m for m in msgs) else 'missing')
" 2>/dev/null)
check "Teacher leave notification (School 1 teacher) reaches School 1's admin" "$TEACHER_NOTIF_S1_FOUND" "present"

TEACHER_NOTIF_S2=$(curl -s "$GATEWAY/api/notifications/history" -H "Authorization: Bearer $TOKEN_S2")
TEACHER_NOTIF_S2_LEAKED=$(echo "$TEACHER_NOTIF_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
msgs = [n.get('message','') for n in d.get('data', [])]
print('leaked' if any('IsoDeferredCheckX' in m for m in msgs) else 'isolated')
" 2>/dev/null)
check "Teacher leave notification (School 1 teacher) does not reach School 2's admin" "$TEACHER_NOTIF_S2_LEAKED" "isolated"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
