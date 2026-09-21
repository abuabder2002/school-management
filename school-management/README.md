# School Management System

A **clean, modular Spring Boot Microservices** backend for managing school operations including students, academics, attendance, fees, and parent notifications.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND                           │
│                     (localhost:3000/5173)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP Requests
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (:8080)                        │
│            Spring Cloud Gateway + CORS + Load Balancer          │
└──┬──────────┬──────────┬──────────┬──────────┬──────────────────┘
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
:8081      :8082      :8083      :8084      :8085     :8086
AUTH     STUDENT   ACADEMIC  ATTENDANCE   FEE    NOTIFICATION
SERVICE  SERVICE   SERVICE    SERVICE   SERVICE    SERVICE
   │          │          │          │          │         │
   └──────────┴──────────┴──────────┴──────────┴─────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ SERVICE REGISTRY│
                    │  Eureka (:8761) │
                    └────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │   PostgreSQL   │
                    │   (6 DBs)      │
                    └────────────────┘
```

---

## Microservices

| Service               | Port | Database              | Description                        |
|-----------------------|------|-----------------------|------------------------------------|
| `service-registry`    | 8761 | —                     | Eureka Service Discovery           |
| `api-gateway`         | 8080 | —                     | Spring Cloud Gateway + CORS        |
| `auth-service`        | 8081 | `school_auth`         | User Registration & JWT Login      |
| `student-service`     | 8082 | `school_students`     | Student CRUD Management            |
| `academic-service`    | 8083 | `school_academic`     | Classes, Subjects, Exams, Marks    |
| `attendance-service`  | 8084 | `school_attendance`   | Daily Attendance Tracking          |
| `fee-service`         | 8085 | `school_fees`         | Fee Collection & Payment Status    |
| `notification-service`| 8086 | `school_notifications`| Parent Notification Storage        |

---

## Technology Stack

- **Java 21** + **Spring Boot 3.3.4**
- **Spring Cloud 2023.0.3** (Eureka, Gateway)
- **Spring Data JPA** + **PostgreSQL**
- **Spring Security 6** + **JWT (JJWT 0.11.5)**
- **Lombok** + **Bean Validation**
- **Spring Boot Actuator**
- **Maven** (multi-module)

---

## Prerequisites

- Java 21
- Maven 3.9+
- PostgreSQL 15+

---

## PostgreSQL Setup

Connect to PostgreSQL and create the 6 databases:

```sql
CREATE DATABASE school_auth;
CREATE DATABASE school_students;
CREATE DATABASE school_academic;
CREATE DATABASE school_attendance;
CREATE DATABASE school_fees;
CREATE DATABASE school_notifications;
```

All tables are **auto-created** on first service startup (`ddl-auto: update`).

Default credentials used (override with environment variables):
```
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

---

## How to Run

### Step 1 — Build everything

```bash
cd school-management
mvn clean install -DskipTests
```

### Step 2 — Start Eureka (Service Registry)

```bash
cd service-registry
mvn spring-boot:run
```

Wait for Eureka dashboard: http://localhost:8761

### Step 3 — Start API Gateway

```bash
cd api-gateway
mvn spring-boot:run
```

### Step 4 — Start Individual Services

Open separate terminals for each:

```bash
# Auth Service
cd auth-service && mvn spring-boot:run

# Student Service
cd student-service && mvn spring-boot:run

# Academic Service
cd academic-service && mvn spring-boot:run

# Attendance Service
cd attendance-service && mvn spring-boot:run

# Fee Service
cd fee-service && mvn spring-boot:run

# Notification Service
cd notification-service && mvn spring-boot:run
```

### Environment Variable Overrides (Optional)

```bash
set DB_USERNAME=myuser
set DB_PASSWORD=mypassword
set JWT_SECRET=MyCustomSecretKey
```

---

## Health Checks

Each service exposes:

```
http://localhost:{PORT}/actuator/health
```

| Service               | Health URL                              |
|-----------------------|-----------------------------------------|
| service-registry      | http://localhost:8761/actuator/health   |
| api-gateway           | http://localhost:8080/actuator/health   |
| auth-service          | http://localhost:8081/actuator/health   |
| student-service       | http://localhost:8082/actuator/health   |
| academic-service      | http://localhost:8083/actuator/health   |
| attendance-service    | http://localhost:8084/actuator/health   |
| fee-service           | http://localhost:8085/actuator/health   |
| notification-service  | http://localhost:8086/actuator/health   |

---

## API Reference

All requests go through the **API Gateway on port 8080**.

### Auth Service (`/api/auth`)

| Method | Endpoint               | Description          | Auth Required |
|--------|------------------------|----------------------|---------------|
| POST   | `/api/auth/register`   | Register new user    | No            |
| POST   | `/api/auth/login`      | Login & get JWT      | No            |

**Register body:**
```json
{
  "name": "John Doe",
  "email": "john@school.com",
  "password": "secret123",
  "role": "ADMIN"
}
```

**Login response:**
```json
{
  "token": "eyJhbGc...",
  "type": "Bearer",
  "userId": 1,
  "name": "John Doe",
  "email": "john@school.com",
  "role": "ADMIN"
}
```

---

### Student Service (`/api/students`)

| Method | Endpoint              | Description         |
|--------|-----------------------|---------------------|
| GET    | `/api/students`       | Get all students    |
| GET    | `/api/students/{id}`  | Get student by ID   |
| POST   | `/api/students`       | Create student      |
| PUT    | `/api/students/{id}`  | Update student      |
| DELETE | `/api/students/{id}`  | Delete student      |

---

### Academic Service (`/api/academic`)

| Method | Endpoint                            | Description            |
|--------|-------------------------------------|------------------------|
| GET    | `/api/academic/classes`             | List all classes       |
| POST   | `/api/academic/classes`             | Create class           |
| GET    | `/api/academic/subjects`            | List all subjects      |
| GET    | `/api/academic/subjects/class/{id}` | Subjects by class      |
| POST   | `/api/academic/subjects`            | Create subject         |
| GET    | `/api/academic/exams`               | List all exams         |
| POST   | `/api/academic/exams`               | Create exam            |
| GET    | `/api/academic/marks/student/{id}`  | Marks by student       |
| POST   | `/api/academic/marks`               | Record mark            |

---

### Attendance Service (`/api/attendance`)

| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| POST   | `/api/attendance`                     | Mark attendance          |
| GET    | `/api/attendance/student/{studentId}` | All records for student  |
| GET    | `/api/attendance/today/{studentId}`   | Today's attendance       |

---

### Fee Service (`/api/fees`)

| Method | Endpoint                       | Description           |
|--------|--------------------------------|-----------------------|
| GET    | `/api/fees/student/{studentId}`| Get fees for student  |
| POST   | `/api/fees`                    | Create fee record     |
| PUT    | `/api/fees/{id}`               | Update fee / payment  |

---

### Notification Service (`/api/notifications`)

| Method | Endpoint                             | Description              |
|--------|--------------------------------------|--------------------------|
| POST   | `/api/notifications`                 | Send notification        |
| GET    | `/api/notifications/parent/{parentId}`| Get parent notifications|
| PUT    | `/api/notifications/{id}/read`       | Mark as read             |

---

## User Roles

| Role    | Description                          |
|---------|--------------------------------------|
| ADMIN   | Full access to all system operations |
| TEACHER | Manage academics, attendance, marks  |
| PARENT  | View student info and notifications  |

---

## Project Structure

```
school-management/
├── pom.xml                          ← Root parent POM
├── README.md
│
├── school-common/                   ← Shared library (plain JAR)
│   └── src/main/java/com/school/common/
│       ├── constants/AppConstants.java
│       ├── dto/ApiResponse.java
│       ├── dto/ErrorResponse.java
│       ├── enums/AttendanceStatus.java
│       ├── enums/FeeStatus.java
│       ├── enums/Role.java
│       └── exception/
│           ├── BadRequestException.java
│           └── ResourceNotFoundException.java
│
├── service-registry/                ← Eureka Server (:8761)
├── api-gateway/                     ← Spring Cloud Gateway (:8080)
├── auth-service/                    ← JWT Auth (:8081)
├── student-service/                 ← Student CRUD (:8082)
├── academic-service/                ← Classes/Subjects/Exams (:8083)
├── attendance-service/              ← Attendance Tracking (:8084)
├── fee-service/                     ← Fee Management (:8085)
└── notification-service/            ← Parent Notifications (:8086)
```

---

## Common Response Format

All endpoints return a consistent `ApiResponse<T>` wrapper:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00"
}
```

Error responses follow `ErrorResponse`:

```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Student not found with id: '99'",
  "path": "/api/students/99",
  "timestamp": "2024-01-15T10:30:00"
}
```

---

## Future Roadmap

- [ ] Docker + Docker Compose
- [ ] Kafka for event-driven notifications
- [ ] Redis caching for frequently accessed data
- [ ] Spring Cloud Config Server
- [ ] Resilience4j circuit breakers
- [ ] Kubernetes deployment
- [ ] React frontend
- [ ] ELK Stack for logging
- [ ] Prometheus + Grafana monitoring

---

*Built with Spring Boot 3.3 · Java 21 · Spring Cloud 2023*
