@echo off
title School Management System - Multi-Terminal Launcher
echo =====================================================================
echo  STARTING ALL MICROSERVICES AND FRONTEND IN SEPARATE TERMINALS
echo =====================================================================
echo.

set ROOT=%~dp0

echo [1/9] Launching Service Registry (Port 8761)...
start "1. SERVICE-REGISTRY [8761]" cmd /k "cd /d "%ROOT%school-management\service-registry" && title SERVICE-REGISTRY : 8761 && mvn spring-boot:run"
echo Waiting 10 seconds for Eureka Service Registry to initialize...
ping 127.0.0.1 -n 11 > nul

echo [2/9] Launching API Gateway (Port 8080)...
start "2. API-GATEWAY [8080]" cmd /k "cd /d "%ROOT%school-management\api-gateway" && title API-GATEWAY : 8080 && mvn spring-boot:run"
ping 127.0.0.1 -n 4 > nul

echo [3/9] Launching Auth Service (Port 8081)...
start "3. AUTH-SERVICE [8081]" cmd /k "cd /d "%ROOT%school-management\auth-service" && title AUTH-SERVICE : 8081 && mvn spring-boot:run"

echo [4/9] Launching Student Service (Port 8082)...
start "4. STUDENT-SERVICE [8082]" cmd /k "cd /d "%ROOT%school-management\student-service" && title STUDENT-SERVICE : 8082 && mvn spring-boot:run"

echo [5/9] Launching Academic Service (Port 8083)...
start "5. ACADEMIC-SERVICE [8083]" cmd /k "cd /d "%ROOT%school-management\academic-service" && title ACADEMIC-SERVICE : 8083 && mvn spring-boot:run"

echo [6/9] Launching Attendance Service (Port 8084)...
start "6. ATTENDANCE-SERVICE [8084]" cmd /k "cd /d "%ROOT%school-management\attendance-service" && title ATTENDANCE-SERVICE : 8084 && mvn spring-boot:run"

echo [7/9] Launching Fee Service (Port 8085)...
start "7. FEE-SERVICE [8085]" cmd /k "cd /d "%ROOT%school-management\fee-service" && title FEE-SERVICE : 8085 && mvn spring-boot:run"

echo [8/9] Launching Notification Service (Port 8086)...
start "8. NOTIFICATION-SERVICE [8086]" cmd /k "cd /d "%ROOT%school-management\notification-service" && title NOTIFICATION-SERVICE : 8086 && mvn spring-boot:run"

echo [9/9] Launching Frontend (Port 5173)...
start "9. FRONTEND [5173]" cmd /k "cd /d "%ROOT%school-frontend" && title FRONTEND : 5173 && npm run dev"

echo.
echo =====================================================================
echo  All 9 services launched in separate windows!
echo  Eureka Dashboard : http://localhost:8761
echo  API Gateway      : http://localhost:8080
echo  Frontend Portal  : http://localhost:5173
echo =====================================================================

