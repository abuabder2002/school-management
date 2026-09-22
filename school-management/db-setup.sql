-- ============================================================
-- School Management System - PostgreSQL Database Setup
-- Run this script as a PostgreSQL superuser (e.g. postgres)
-- ============================================================

-- Create databases for each microservice
CREATE DATABASE school_auth;
CREATE DATABASE school_students;
CREATE DATABASE school_academic;
CREATE DATABASE school_attendance;
CREATE DATABASE school_fees;
CREATE DATABASE school_notifications;

-- (Optional) Create a dedicated user for the application
-- CREATE USER school_user WITH PASSWORD 'school_pass';
-- GRANT ALL PRIVILEGES ON DATABASE school_auth TO school_user;
-- GRANT ALL PRIVILEGES ON DATABASE school_students TO school_user;
-- GRANT ALL PRIVILEGES ON DATABASE school_academic TO school_user;
-- GRANT ALL PRIVILEGES ON DATABASE school_attendance TO school_user;
-- GRANT ALL PRIVILEGES ON DATABASE school_fees TO school_user;
-- GRANT ALL PRIVILEGES ON DATABASE school_notifications TO school_user;

-- NOTE: Tables are auto-created by Spring JPA (ddl-auto=update) on first run.
-- You do NOT need to create tables manually.
