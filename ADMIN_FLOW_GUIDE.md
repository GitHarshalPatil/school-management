# Admin Flow Guide

## Current Architecture

### Single School Per Instance
The current system is designed as a **single school, single database** architecture. This means:
- **One school per backend instance**
- School setup can only be done **once** per database
- All users belong to that one school

### User Roles

1. **SUPER_ADMIN** - Master administrator (system-wide access)
   - Can manage multiple schools (if architecture supports it)
   - Currently: Same as SCHOOL_ADMIN in single-school setup
   - **How to create:** Via database script (see below)

2. **SCHOOL_ADMIN** - School administrator
   - Full access to their school
   - Created during school setup
   - Can create teachers, manage users, etc.

3. **TEACHER** - Teacher role
   - Created by SCHOOL_ADMIN
   - Can mark attendance, view classes

4. **PARENT** - Parent role
   - Created by SCHOOL_ADMIN
   - View-only access

## How to Create SUPER_ADMIN

### Option 1: Database Script (Recommended)
Create a script to manually create SUPER_ADMIN user:

```bash
# Run this in your database or create a migration script
```

### Option 2: First User Becomes SUPER_ADMIN
Modify school setup to create SUPER_ADMIN instead of SCHOOL_ADMIN for first setup.

## School Setup Flow

### Current Flow (One School Only)
1. Navigate to `/setup` in dashboard
2. Fill school information
3. Creates:
   - School record
   - SCHOOL_ADMIN user
   - Academic year
   - Standard-board assignments
4. Can only be done **once**

### To Add Another School
**Current Limitation:** The system only supports one school per database instance.

**Options:**
1. **Separate Database:** Run another backend instance with a separate database
2. **Multi-tenant Architecture:** Requires significant changes to support multiple schools in one database

## Login Flow

### Dashboard Login
- All users (SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, PARENT) use the same login page
- After login, dashboard shows role-specific content
- Role is displayed in the top navigation bar

### How to Identify Role
- **After Login:** Check the top-right corner - shows email and role
- **Dashboard Content:** Different sections based on role
- **SUPER_ADMIN:** May see system-wide options (if implemented)
- **SCHOOL_ADMIN:** Sees school management options




