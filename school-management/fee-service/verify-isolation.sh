#!/usr/bin/env bash
# Verifies schoolId isolation for fee-service's Fee/Payment entities, and that its
# StudentServiceClient calls carry schoolId. Run against the local stack (gateway on
# localhost:8080). Requires python3 with PyJWT and the local dev JWT secret.
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

# Create a student under School 1 for the fee to reference.
S1_STUDENT=$(curl -s -X POST "$GATEWAY/api/students" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"admissionNumber":"ISO-FEE-001","name":"Iso Fee Student","className":"Class 5","fatherName":"Fee Father"}')
S1_STUDENT_ID=$(echo "$S1_STUDENT" | jpath id)

if [ -z "$S1_STUDENT_ID" ]; then
  echo "SETUP FAILED: could not create test student. Response: $S1_STUDENT"
  exit 2
fi

FEE_CREATE=$(curl -s -X POST "$GATEWAY/api/fees" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d "{\"studentId\":$S1_STUDENT_ID,\"termFees1\":1000,\"paidAmount\":0}")
FEE_ID=$(echo "$FEE_CREATE" | jpath id)

if [ -z "$FEE_ID" ]; then
  echo "SETUP FAILED: could not create test fee. Response: $FEE_CREATE"
  exit 2
fi
echo "Created test fee id=$FEE_ID for student id=$S1_STUDENT_ID under School 1"

# School 2's admin must not see this student's fee at all (denyUnlessAdminOrOwnChild lets ADMIN
# through regardless of child, so isolation must come from the schoolId filter itself).
FEE_LIST_S2=$(curl -s "$GATEWAY/api/fees/student/$S1_STUDENT_ID" -H "Authorization: Bearer $TOKEN_S2")
FEE_LEAKED=$(echo "$FEE_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
ids = [f.get('id') for f in d.get('data', [])]
print('leaked' if $FEE_ID in ids else 'isolated')
" 2>/dev/null)
check "School 2 admin's fee query for School 1's student returns nothing" "$FEE_LEAKED" "isolated"

# School 2's admin recording a payment against School 1's feeId must 404.
PAY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GATEWAY/api/fees/$FEE_ID/payments" \
  -H "Authorization: Bearer $TOKEN_S2" -H "Content-Type: application/json" \
  -d '{"amountPaid":100,"paymentDate":"2026-12-01"}')
check "School 2 admin recording a payment against School 1's fee returns 404" "$PAY_STATUS" "404"

# School 2's admin reading School 1's fee's payment history must 404.
PAYLIST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/api/fees/$FEE_ID/payments" -H "Authorization: Bearer $TOKEN_S2")
check "School 2 admin reading School 1's fee's payments returns 404" "$PAYLIST_STATUS" "404"

# School 1's admin can still see their own fee (regression).
FEE_GET_S1=$(curl -s "$GATEWAY/api/fees/student/$S1_STUDENT_ID" -H "Authorization: Bearer $TOKEN_S1")
FEE_S1_OK=$(echo "$FEE_GET_S1" | python3 -c "
import json, sys
d = json.load(sys.stdin)
ids = [f.get('id') for f in d.get('data', [])]
print('present' if $FEE_ID in ids else 'missing')
" 2>/dev/null)
check "School 1 admin's fee query includes their own fee" "$FEE_S1_OK" "present"

# --- StudentServiceClient wiring: class billing summary must only reflect the caller's school ---
SUMMARY_S2=$(curl -s "$GATEWAY/api/fees/class-summary" -H "Authorization: Bearer $TOKEN_S2")
SUMMARY_LEAKED=$(echo "$SUMMARY_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
classes = [c.get('className') for c in d.get('data', [])]
print('leaked' if 'Class 5' in classes else 'isolated')
" 2>/dev/null)
check "Class billing summary (School 2) does not include School 1's Class 5 roster" "$SUMMARY_LEAKED" "isolated"

curl -s -X DELETE "$GATEWAY/api/students/$S1_STUDENT_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
