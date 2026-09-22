# Parent → Student Association Architecture & Guide

## Overview

In the School Management System microservices architecture, **User identity and authentication** are owned by `auth-service`, while **Student profiles and records** are owned by `student-service`.

To ensure strict microservice decoupling:
- **No direct database cross-talk** is allowed between `auth-service` and `student-service`.
- **No JPA entity relationship `@ManyToOne`** exists between `Parent` (User) and `Student`.
- A simple `Long parentId` field on the `Student` entity in `student-service` represents the owner/parent account ID from `auth-service`.

---

## Architectural Flow

```
┌──────────────────────────────┐              ┌──────────────────────────────┐
│         auth-service         │              │       student-service        │
│  (Database: auth_db)         │              │  (Database: student_db)      │
├──────────────────────────────┤              ├──────────────────────────────┤
│ User                         │              │ Student                      │
│   id = 2                     │              │   id = 101                   │
│   name = "Abdul Shaheen"     │              │   name = "Rahul Shaheen"     │
│   role = "PARENT"            │              │   parentId = 2  ─────────────┼──┐
└──────────────┬───────────────┘              └──────────────────────────────┘  │
               │                                                                │
               │ 1. Login                                                       │
               ▼                                                                │
   Returns JWT Token:                                                           │
   {                                                                            │
     "sub": "parent@school.com",                                                │
     "userId": 2,                                                               │
     "role": "PARENT",                                                          │
     "exp": 1740000000                                                          │
   }                                                                            │
               │                                                                │
               │ 2. GET /api/students/parent/2                                  │
               │    Authorization: Bearer <JWT>                                 │
               └────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
                                   student-service JwtDecoder
                                   • Extracts userId=2, role=PARENT
                                   • Verifies path (parentId=2) == JWT (userId=2)
                                   • Returns matching students for parentId 2
```

---

## Key Backend Changes

### 1. Auth Service (`auth-service`)
- **`JwtUtil.java`**: Standardized JWT payload to embed `userId` (Long claim) alongside `email` and `role`.
- **`AuthController.java`**: Added `GET /api/auth/parents` endpoint returning `List<UserSummaryDTO>` for all users with `role = PARENT`.
- **`UserRepository.java`**: Added `findByRole(Role role)`.

### 2. Student Service (`student-service`)
- **`StudentController.java`**: Added `GET /api/students/parent/{parentId}` with strict JWT-based ownership verification:
  - Extract `userId` and `role` from Bearer JWT locally using `JwtDecoder`.
  - If `role == "PARENT"`, verify `parentId` in URL path matches the `userId` in JWT token (`403 Forbidden` if mismatched).
  - If `role == "ADMIN"`, allow access to any `parentId`.
- **`StudentService.java`**: Implemented `getStudentsByParent(Long parentId)` calling `studentRepository.findByParentId(parentId)`.
- **`JwtDecoder.java`**: Lightweight, read-only JWT decoder inside `student-service` using shared secret `${jwt.secret}` so no synchronous HTTP cross-service call to `auth-service` is needed during request evaluation.

---

## Key Frontend Changes

### 1. Admin — Student Directory (`StudentsPage.jsx`)
- Replaced manual/hardcoded parent ID inputs with a live **Parent / Guardian Dropdown** populated via `authService.getParents()`.
- Table displays the parent's full name and ID badge.

### 2. Admin — Parent Accounts Page (`ParentsPage.jsx`)
- Added a dedicated Admin page to list all parent accounts and quickly register new parents (`role = PARENT`).
- Displays all assigned children for each parent account.

### 3. Parent Guardian Portal (`ParentDashboard.jsx`)
- Automatically detects `user.userId` from `AuthContext`.
- Fetches children strictly assigned to `user.userId` via `GET /api/students/parent/{parentId}`.
- Removed arbitrary demo fallbacks (no longer falls back to showing all students if parent has 0 children). Displays a clean empty state prompt if no student is mapped.

---

## Verification & Testing

### 1. Create Parent Account
As Admin, navigate to **Parents** (`/admin/parents`) -> click **Add New Parent Account**.
- Name: `Abdul Parent`
- Email: `abdul.parent@school.com`
- Password: `password123`

### 2. Enroll Student & Assign Parent
As Admin, navigate to **Students** (`/admin/students`) -> click **Enroll New Student**.
- Name: `Rahul Shaheen`
- Parent / Guardian: Select `Abdul Parent (abdul.parent@school.com) - ID #<id>`

### 3. Verify Parent View
Logout and login as `abdul.parent@school.com`.
- Navigates to `/parent` dashboard.
- Displays `Rahul Shaheen`'s attendance, fees, and academic records.
