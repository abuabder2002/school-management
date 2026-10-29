#!/usr/bin/env bash
# Verifies schoolId isolation for attendance-service's 5 entities. Run against the local stack
# (gateway on localhost:8080). Requires python3 with PyJWT and the local dev JWT secret.
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

TOKEN_S1=$(sign "admin@school.com" "ADMIN" 1 1)
TOKEN_S2=$(sign "admin-a@testschool.test" "ADMIN" 10 2)

# --- Representative entity: Attendance ---

ATT_CREATE=$(curl -s -X POST "$GATEWAY/api/attendance" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"personType":"STUDENT","personId":9101,"date":"2026-12-30","status":"PRESENT"}')
ATT_ID=$(echo "$ATT_CREATE" | jpath id)

if [ -z "$ATT_ID" ]; then
  echo "SETUP FAILED: could not create test attendance. Response: $ATT_CREATE"
  exit 2
fi
echo "Created test attendance id=$ATT_ID under School 1"

ATT_LIST_S2=$(curl -s "$GATEWAY/api/attendance/person/STUDENT/9101" -H "Authorization: Bearer $TOKEN_S2")
ATT_LEAKED=$(echo "$ATT_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
ids = [a.get('id') for a in d.get('data', [])]
print('leaked' if $ATT_ID in ids else 'isolated')
" 2>/dev/null)
check "School 2 admin's attendance query does not include School 1's record" "$ATT_LEAKED" "isolated"

ATT_LIST_S1=$(curl -s "$GATEWAY/api/attendance/person/STUDENT/9101" -H "Authorization: Bearer $TOKEN_S1")
ATT_S1_OK=$(echo "$ATT_LIST_S1" | python3 -c "
import json, sys
d = json.load(sys.stdin)
ids = [a.get('id') for a in d.get('data', [])]
print('present' if $ATT_ID in ids else 'missing')
" 2>/dev/null)
check "School 1 admin's attendance query includes their own record" "$ATT_S1_OK" "present"

# --- Spot-check: LeaveReason, Holiday, TeacherLeaveRequest, LeaveRequest ---

REASON_CREATE=$(curl -s -X POST "$GATEWAY/api/attendance/leave-reasons" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"englishReason":"IsoTestReasonX","tamilMeaning":"X"}')
REASON_ID=$(echo "$REASON_CREATE" | jpath id)
REASON_LIST_S2=$(curl -s "$GATEWAY/api/attendance/leave-reasons" -H "Authorization: Bearer $TOKEN_S2")
REASON_LEAKED=$(echo "$REASON_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
texts = [r.get('englishReason') for r in d.get('data', [])]
print('leaked' if 'IsoTestReasonX' in texts else 'isolated')
" 2>/dev/null)
check "LeaveReason: School 2 does not see School 1's new reason" "$REASON_LEAKED" "isolated"
curl -s -X DELETE "$GATEWAY/api/attendance/leave-reasons/$REASON_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

HOLIDAY_CREATE=$(curl -s -X POST "$GATEWAY/api/attendance/holidays" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"name":"IsoTestHolidayX","date":"2026-12-25","holidayType":"SCHOOL"}')
HOLIDAY_ID=$(echo "$HOLIDAY_CREATE" | jpath id)
HOLIDAY_LIST_S2=$(curl -s "$GATEWAY/api/attendance/holidays" -H "Authorization: Bearer $TOKEN_S2")
HOLIDAY_LEAKED=$(echo "$HOLIDAY_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
names = [h.get('name') for h in d.get('data', [])]
print('leaked' if 'IsoTestHolidayX' in names else 'isolated')
" 2>/dev/null)
check "Holiday: School 2 does not see School 1's new holiday" "$HOLIDAY_LEAKED" "isolated"
curl -s -X DELETE "$GATEWAY/api/attendance/holidays/$HOLIDAY_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

TOKEN_TEACHER_S1=$(sign "teacher@school.com" "TEACHER" 2 1)
TEACHER_LEAVE_CREATE=$(curl -s -X POST "$GATEWAY/api/attendance/teacher-leave" \
  -H "Authorization: Bearer $TOKEN_TEACHER_S1" -H "Content-Type: application/json" \
  -d '{"teacherName":"Iso Teacher","leaveDate":"2026-12-29","reason":"IsoTeacherLeaveTestX"}')
TEACHER_LEAVE_LIST_S2=$(curl -s "$GATEWAY/api/attendance/teacher-leave" -H "Authorization: Bearer $TOKEN_S2")
TEACHER_LEAVE_LEAKED=$(echo "$TEACHER_LEAVE_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
reasons = [r.get('reason') for r in d.get('data', [])]
print('leaked' if 'IsoTeacherLeaveTestX' in reasons else 'isolated')
" 2>/dev/null)
check "TeacherLeaveRequest: School 2 does not see School 1's new teacher leave" "$TEACHER_LEAVE_LEAKED" "isolated"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
