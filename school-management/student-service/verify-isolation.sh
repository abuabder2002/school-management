#!/usr/bin/env bash
# Verifies Student entity isolation between two schools. Run against the local stack
# (gateway on localhost:8080). Requires python3 with PyJWT and the local dev JWT secret.
set -uo pipefail

JWT_SECRET_FILE="${JWT_SECRET_FILE:-$HOME/.tools/school-local-jwt.secret}"
JWT_SECRET=$(cat "$JWT_SECRET_FILE")
GATEWAY="${GATEWAY:-http://localhost:8080}"
# The gateway itself rejects any unauthenticated request (401) before it reaches this service —
# internal (no-Authorization-header) calls only ever happen service-to-service, bypassing the
# gateway. Simulate that here by hitting student-service directly on its own port.
DIRECT="${DIRECT:-http://localhost:8082}"

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

# --- Task 2: internal-call dual-path endpoints ---

# No Authorization header and no schoolId param -> 400.
NO_AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DIRECT/api/students/classes")
check "GET /api/students/classes with no auth and no schoolId returns 400" "$NO_AUTH_STATUS" "400"

# No Authorization header but schoolId param present -> 200, and results scoped to that school only.
CREATE2=$(curl -s -X POST "$GATEWAY/api/students" \
  -H "Authorization: Bearer $TOKEN_S2" -H "Content-Type: application/json" \
  -d '{"admissionNumber":"ISO-TEST-002","name":"School2 Scoped Student","className":"Class 2","fatherName":"Test Father 2"}')
STUDENT2_ID=$(echo "$CREATE2" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

INTERNAL_S1=$(curl -s "$DIRECT/api/students/class/Class%202/active?schoolId=1")
HAS_S2STUDENT_IN_S1=$(echo "$INTERNAL_S1" | python3 -c "
import json, sys
d = json.load(sys.stdin)
names = [s.get('name') for s in d.get('data', [])]
print('present' if 'School2 Scoped Student' in names else 'absent')
" 2>/dev/null)
check "Internal call (no auth, schoolId=1) does not see School 2's student" "$HAS_S2STUDENT_IN_S1" "absent"

INTERNAL_S2=$(curl -s "$DIRECT/api/students/class/Class%202/active?schoolId=2")
HAS_S2STUDENT_IN_S2=$(echo "$INTERNAL_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
names = [s.get('name') for s in d.get('data', [])]
print('present' if 'School2 Scoped Student' in names else 'absent')
" 2>/dev/null)
check "Internal call (no auth, schoolId=2) sees School 2's student" "$HAS_S2STUDENT_IN_S2" "present"

curl -s -X DELETE "$GATEWAY/api/students/$STUDENT2_ID" -H "Authorization: Bearer $TOKEN_S2" > /dev/null

# --- Task 2: bulk import duplicate-detection is schoolId-scoped ---

# A School 1 student with admission number "ISO-DUP-001" already exists; importing the SAME
# admission number as School 2 must create a separate School 2 student, not update School 1's.
CREATE_S1_DUP=$(curl -s -X POST "$GATEWAY/api/students" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"admissionNumber":"ISO-DUP-001","name":"School1 Original","className":"Class 3","fatherName":"Father One"}')
S1_DUP_ID=$(echo "$CREATE_S1_DUP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

XLSX_PATH=$(python3 -c "
import openpyxl, tempfile
wb = openpyxl.Workbook()
ws = wb.active
ws.append(['S.No','Adm No','Name','Class','Section','DOB','Gender','Father Name','Mother Name','Guardian Name','Father Mobile Number','Mother Mobile Number','Guardian Mobile Number','Address','Blood Group','Joining Date'])
ws.append([1,'ISO-DUP-001','School2 Imported','Class 3','','','','Father Two','','','','','','','',''])
f = tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False)
f.close()
wb.save(f.name)
print(f.name)
")

IMPORT_RESP=$(curl -s -X POST "$GATEWAY/api/students/bulk-upload" -H "Authorization: Bearer $TOKEN_S2" -F "file=@$XLSX_PATH")
rm -f "$XLSX_PATH"

S1_DUP_AFTER=$(curl -s "$GATEWAY/api/students/$S1_DUP_ID" -H "Authorization: Bearer $TOKEN_S1" | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('name',''))" 2>/dev/null)
check "School 1's student with the reused admission number is unchanged after School 2's import" "$S1_DUP_AFTER" "School1 Original"

S2_IMPORTED_NAME=$(curl -s "$GATEWAY/api/students/class/Class%203/active" -H "Authorization: Bearer $TOKEN_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
names = [s.get('name') for s in d.get('data', [])]
print('School2 Imported' if 'School2 Imported' in names else 'missing')
" 2>/dev/null)
check "School 2's import created its own student with the reused admission number" "$S2_IMPORTED_NAME" "School2 Imported"

curl -s -X DELETE "$GATEWAY/api/students/$S1_DUP_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
