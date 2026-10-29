#!/usr/bin/env bash
# Verifies schoolId isolation for academic-service's 7 entities. Run against the local stack
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

TOKEN_S1=$(sign "admin@school.com" "ADMIN" 1 1)
TOKEN_S2=$(sign "admin-a@testschool.test" "ADMIN" 10 2)

jpath() { python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('$1','') if isinstance(d.get('data'),dict) else '')"; }

# --- Representative entity: Mark ---
# marks.exam_id/subject_id are resolved from an existing Exam/Subject by name, so create those
# first (a mark referencing a nonexistent exam/subject name fails a pre-existing NOT NULL
# constraint unrelated to this isolation work).

SETUP_EXAM=$(curl -s -X POST "$GATEWAY/api/academic/exams" -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" -d '{"name":"Iso Exam Setup"}')
SETUP_EXAM_ID=$(echo "$SETUP_EXAM" | jpath id)
SETUP_SUBJECT=$(curl -s -X POST "$GATEWAY/api/academic/subjects" -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" -d '{"name":"Iso Subject Setup"}')
SETUP_SUBJECT_ID=$(echo "$SETUP_SUBJECT" | jpath id)

MARK_CREATE=$(curl -s -X POST "$GATEWAY/api/academic/marks" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"studentId":9001,"studentName":"Iso Test","className":"Class 1","examName":"Iso Exam Setup","subjectName":"Iso Subject Setup","marksObtained":80,"maxMarks":100}')
MARK_ID=$(echo "$MARK_CREATE" | jpath id)

if [ -z "$MARK_ID" ]; then
  echo "SETUP FAILED: could not create test mark. Response: $MARK_CREATE"
  exit 2
fi
echo "Created test mark id=$MARK_ID under School 1"

MARK_LIST_S2=$(curl -s "$GATEWAY/api/academic/marks?examName=Iso%20Exam%20Setup" -H "Authorization: Bearer $TOKEN_S2")
MARK_LEAKED=$(echo "$MARK_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
ids = [m.get('id') for m in d.get('data', [])]
print('leaked' if $MARK_ID in ids else 'isolated')
" 2>/dev/null)
check "School 2 admin's mark search does not include School 1's mark" "$MARK_LEAKED" "isolated"

MARK_GET_S2=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/api/academic/marks/$MARK_ID" -H "Authorization: Bearer $TOKEN_S2")
check "School 2 admin GET on School 1's mark returns 404" "$MARK_GET_S2" "404"

MARK_DEL_S2=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$GATEWAY/api/academic/marks/$MARK_ID" -H "Authorization: Bearer $TOKEN_S2")
check "School 2 admin DELETE on School 1's mark returns 404" "$MARK_DEL_S2" "404"

MARK_GET_S1=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/api/academic/marks/$MARK_ID" -H "Authorization: Bearer $TOKEN_S1")
check "School 1 admin GET on their own mark returns 200" "$MARK_GET_S1" "200"

curl -s -X DELETE "$GATEWAY/api/academic/marks/$MARK_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null
curl -s -X DELETE "$GATEWAY/api/academic/exams/$SETUP_EXAM_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null
curl -s -X DELETE "$GATEWAY/api/academic/subjects/$SETUP_SUBJECT_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

# --- Spot-check: AcademicClass, Exam, Subject, Homework, BoardResult, ClassSchedule ---

CLASS_CREATE=$(curl -s -X POST "$GATEWAY/api/academic/classes" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"name":"IsoTestClassX"}')
CLASS_ID=$(echo "$CLASS_CREATE" | jpath id)
CLASS_LIST_S2=$(curl -s "$GATEWAY/api/academic/classes" -H "Authorization: Bearer $TOKEN_S2")
CLASS_LEAKED=$(echo "$CLASS_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
names = [c.get('name') for c in d.get('data', [])]
print('leaked' if 'IsoTestClassX' in names else 'isolated')
" 2>/dev/null)
check "AcademicClass: School 2 does not see School 1's new class" "$CLASS_LEAKED" "isolated"
curl -s -X DELETE "$GATEWAY/api/academic/classes/$CLASS_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

EXAM_CREATE=$(curl -s -X POST "$GATEWAY/api/academic/exams" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"name":"IsoTestExamX"}')
EXAM_ID=$(echo "$EXAM_CREATE" | jpath id)
EXAM_LIST_S2=$(curl -s "$GATEWAY/api/academic/exams" -H "Authorization: Bearer $TOKEN_S2")
EXAM_LEAKED=$(echo "$EXAM_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
names = [e.get('name') for e in d.get('data', [])]
print('leaked' if 'IsoTestExamX' in names else 'isolated')
" 2>/dev/null)
check "Exam: School 2 does not see School 1's new exam" "$EXAM_LEAKED" "isolated"
curl -s -X DELETE "$GATEWAY/api/academic/exams/$EXAM_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

SUBJECT_CREATE=$(curl -s -X POST "$GATEWAY/api/academic/subjects" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"name":"IsoTestSubjectX"}')
SUBJECT_ID=$(echo "$SUBJECT_CREATE" | jpath id)
SUBJECT_LIST_S2=$(curl -s "$GATEWAY/api/academic/subjects" -H "Authorization: Bearer $TOKEN_S2")
SUBJECT_LEAKED=$(echo "$SUBJECT_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
names = [s.get('name') for s in d.get('data', [])]
print('leaked' if 'IsoTestSubjectX' in names else 'isolated')
" 2>/dev/null)
check "Subject: School 2 does not see School 1's new subject" "$SUBJECT_LEAKED" "isolated"
curl -s -X DELETE "$GATEWAY/api/academic/subjects/$SUBJECT_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

HOMEWORK_CREATE=$(curl -s -X POST "$GATEWAY/api/academic/homework" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"title":"IsoTestHomeworkX","className":"Class 1","dueDate":"2026-12-31"}')
HOMEWORK_ID=$(echo "$HOMEWORK_CREATE" | jpath id)
HOMEWORK_LIST_S2=$(curl -s "$GATEWAY/api/academic/homework" -H "Authorization: Bearer $TOKEN_S2")
HOMEWORK_LEAKED=$(echo "$HOMEWORK_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
titles = [h.get('title') for h in d.get('data', [])]
print('leaked' if 'IsoTestHomeworkX' in titles else 'isolated')
" 2>/dev/null)
check "Homework: School 2 does not see School 1's new homework" "$HOMEWORK_LEAKED" "isolated"
curl -s -X DELETE "$GATEWAY/api/academic/homework/$HOMEWORK_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

BOARD_CREATE=$(curl -s -X POST "$GATEWAY/api/academic/board-results" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"studentId":9002,"studentName":"Iso Board Test","board":"CBSE","standard":"X","academicYear":"2026","subjects":[]}')
BOARD_ID=$(echo "$BOARD_CREATE" | jpath id)
BOARD_LIST_S2=$(curl -s "$GATEWAY/api/academic/board-results" -H "Authorization: Bearer $TOKEN_S2")
BOARD_LEAKED=$(echo "$BOARD_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
names = [b.get('studentName') for b in d.get('data', [])]
print('leaked' if 'Iso Board Test' in names else 'isolated')
" 2>/dev/null)
check "BoardResult: School 2 does not see School 1's new board result" "$BOARD_LEAKED" "isolated"
curl -s -X DELETE "$GATEWAY/api/academic/board-results/$BOARD_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

SCHEDULE_CREATE=$(curl -s -X POST "$GATEWAY/api/academic/schedule" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"className":"Class 1","scheduleDate":"2026-12-31","block":"A","subjectName":"IsoScheduleSubjectX"}')
SCHEDULE_ID=$(echo "$SCHEDULE_CREATE" | jpath id)
SCHEDULE_LIST_S2=$(curl -s "$GATEWAY/api/academic/schedule?className=Class%201" -H "Authorization: Bearer $TOKEN_S2")
SCHEDULE_LEAKED=$(echo "$SCHEDULE_LIST_S2" | python3 -c "
import json, sys
d = json.load(sys.stdin)
subs = [s.get('subjectName') for s in d.get('data', [])]
print('leaked' if 'IsoScheduleSubjectX' in subs else 'isolated')
" 2>/dev/null)
check "ClassSchedule: School 2 does not see School 1's new schedule entry" "$SCHEDULE_LEAKED" "isolated"
curl -s -X DELETE "$GATEWAY/api/academic/schedule/$SCHEDULE_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null

# --- Task 4: inter-service call to student-service (getAllStudents) carries schoolId ---
# MarkBulkUploadService.generateTemplate() calls studentServiceClient.getAllStudents(schoolId)
# to pre-fill the mark-sheet template with a class's roster. Create a student under School 1,
# request the template as School 2's admin, and confirm School 1's student is not pre-filled in.

S1_ROSTER_STUDENT=$(curl -s -X POST "$GATEWAY/api/students" \
  -H "Authorization: Bearer $TOKEN_S1" -H "Content-Type: application/json" \
  -d '{"admissionNumber":"ISO-ROSTER-001","name":"Iso Roster Student","className":"Class 4","fatherName":"Roster Father"}')
S1_ROSTER_ID=$(echo "$S1_ROSTER_STUDENT" | jpath id)

S2_SUBJECT=$(curl -s -X POST "$GATEWAY/api/academic/subjects" -H "Authorization: Bearer $TOKEN_S2" -H "Content-Type: application/json" -d '{"name":"IsoRosterSubject"}')
S2_SUBJECT_ID=$(echo "$S2_SUBJECT" | jpath id)

TEMPLATE_XLSX=$(python3 -c "import tempfile; f=tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False); f.close(); print(f.name)")
curl -s "$GATEWAY/api/academic/marks/bulk-template?className=Class%204&subjectIds=$S2_SUBJECT_ID" \
  -H "Authorization: Bearer $TOKEN_S2" -o "$TEMPLATE_XLSX"

ROSTER_LEAKED=$(python3 -c "
import sys, openpyxl
wb = openpyxl.load_workbook(sys.argv[1])
ws = wb.active
names = [row[2].value for row in ws.iter_rows(min_row=2) if row[2].value]
print('leaked' if 'Iso Roster Student' in names else 'isolated')
" "$TEMPLATE_XLSX" 2>/dev/null)
check "Mark-sheet template (School 2) does not pre-fill School 1's student" "$ROSTER_LEAKED" "isolated"

rm -f "$TEMPLATE_XLSX"
curl -s -X DELETE "$GATEWAY/api/students/$S1_ROSTER_ID" -H "Authorization: Bearer $TOKEN_S1" > /dev/null
curl -s -X DELETE "$GATEWAY/api/academic/subjects/$S2_SUBJECT_ID" -H "Authorization: Bearer $TOKEN_S2" > /dev/null

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
