#!/usr/bin/env bash
# Verifies Student entity isolation between two schools. Run against the local stack
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
  # sign <email> <role> <userId> <schoolId>
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

TOKEN_S1=$(sign "admin@school.com" "ADMIN" 1 1)
TOKEN_S2=$(sign "admin-a@testschool.test" "ADMIN" 10 2)

# Create a student as School 1's admin.
CREATE_RESP=$(curl -s -X POST "$GATEWAY/api/students" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"admissionNumber":"ISO-TEST-001","name":"Isolation Test Student","className":"Class 1","fatherName":"Test Father"}')
STUDENT_ID=$(echo "$CREATE_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

if [ -z "$STUDENT_ID" ]; then
  echo "SETUP FAILED: could not create test student. Response: $CREATE_RESP"
  exit 2
fi
echo "Created test student id=$STUDENT_ID under School 1"

# School 2's admin must not see it in the list.
LIST_S2=$(curl -s "$GATEWAY/api/students?pageSize=1000" -H "Authorization: Bearer $TOKEN_S2")
LEAKED=$(echo "$LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
ids = [s.get('id') for s in d.get('data', {}).get('data', [])]
print('leaked' if $STUDENT_ID in ids else 'isolated')
" 2>/dev/null)
check "School 2 admin's student list does not include School 1's student" "$LEAKED" "isolated"

# School 2's admin direct GET by id must 404.
GET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/api/students/$STUDENT_ID" -H "Authorization: Bearer $TOKEN_S2")
check "School 2 admin GET /api/students/{id} for School 1's student returns 404" "$GET_STATUS" "404"

# School 2's admin PUT must 404.
PUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$GATEWAY/api/students/$STUDENT_ID" \
  -H "Authorization: Bearer $TOKEN_S2" -H "Content-Type: application/json" \
  -d '{"admissionNumber":"ISO-TEST-001","name":"Hijacked","className":"Class 1","fatherName":"X"}')
check "School 2 admin PUT on School 1's student returns 404" "$PUT_STATUS" "404"

# School 2's admin DELETE must 404.
DEL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$GATEWAY/api/students/$STUDENT_ID" -H "Authorization: Bearer $TOKEN_S2")
check "School 2 admin DELETE on School 1's student returns 404" "$DEL_STATUS" "404"

# School 1's admin can still see/delete their own student (regression + cleanup).
GET_S1_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/api/students/$STUDENT_ID" -H "Authorization: Bearer $TOKEN_S1")
check "School 1 admin GET on their own student returns 200" "$GET_S1_STATUS" "200"

curl -s -X DELETE "$GATEWAY/api/students/$STUDENT_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
