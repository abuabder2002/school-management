#!/usr/bin/env bash
# Verifies that a parent's minted JWT carries the correct schoolId (resolved from the student
# they're linked to, not a stale/null "resolveSchoolIdForNewUser" heuristic). Run against the
# local stack (gateway on localhost:8080). Requires python3 with PyJWT and the local dev JWT secret.
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
decode_schoolid() { python3 -c "
import jwt, sys
claims = jwt.decode(sys.argv[1], options={'verify_signature': False})
print(claims.get('schoolId', 'MISSING'))
" "$1"; }

TOKEN_S2=$(sign "admin-a@testschool.test" "ADMIN" 10 2)

# Create a School 2 student with a parent phone/password (admin flow).
STUDENT_CREATE=$(curl -s -X POST "$GATEWAY/api/students" \
  -H "Authorization: Bearer $TOKEN_S2" -H "Content-Type: application/json" \
  -d '{"admissionNumber":"ISO-PARENT-001","name":"Iso Parent Test Student","className":"Class 6","fatherName":"Parent Test Father","phoneNumber":"9998887771","password":"parentpass123"}')
STUDENT_ID=$(echo "$STUDENT_CREATE" | jpath id)

if [ -z "$STUDENT_ID" ]; then
  echo "SETUP FAILED: could not create test student. Response: $STUDENT_CREATE"
  exit 2
fi
echo "Created School 2 student id=$STUDENT_ID with parent phone 9998887771"

# Parent logs in with phone + password (public self-service flow — no Authorization header).
PARENT_LOGIN=$(curl -s -X POST "$GATEWAY/api/auth/parent-login" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9998887771","password":"parentpass123"}')
PARENT_TOKEN=$(echo "$PARENT_LOGIN" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null)

if [ -z "$PARENT_TOKEN" ]; then
  echo "SETUP FAILED: parent login did not return a token. Response: $PARENT_LOGIN"
  exit 2
fi

PARENT_SCHOOLID=$(decode_schoolid "$PARENT_TOKEN")
check "Parent JWT carries schoolId=2 (the student's actual school), not null" "$PARENT_SCHOOLID" "2"

# Functional check: the parent's token should resolve School 2 data, not School 1's or nothing.
NOTIF_CREATE=$(curl -s -X POST "$GATEWAY/api/notifications" \
  -H "Authorization: Bearer $TOKEN_S2" -H "Content-Type: application/json" \
  -d '{"date":"2026-12-30","audience":"ALL_STUDENTS","message":"IsoParentNotifTestX"}')

PARENT_NOTIFS=$(curl -s "$GATEWAY/api/notifications/my?className=Class%206" -H "Authorization: Bearer $PARENT_TOKEN")
PARENT_SEES_S2=$(echo "$PARENT_NOTIFS" | python3 -c "
import json, sys
d = json.load(sys.stdin)
msgs = [n.get('message') for n in d.get('data', [])]
print('present' if 'IsoParentNotifTestX' in msgs else 'missing')
" 2>/dev/null)
check "Parent (School 2) sees School 2's ALL_STUDENTS notification via their minted token" "$PARENT_SEES_S2" "present"

curl -s -X DELETE "$GATEWAY/api/students/$STUDENT_ID" -H "Authorization: Bearer $TOKEN_S2" > /dev/null

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
