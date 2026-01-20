# Quick Start Guide - Admin Flow

## Understanding the System

### Architecture
- **Single School Per Database**: One school per backend instance
- **One-Time Setup**: School setup can only be done once per database
- **Role-Based Access**: Different roles have different permissions

## Step-by-Step Setup

### 1. Initial Setup (First Time)

#### A. Seed Database
```bash
npm run prisma:seed
```
This creates:
- Roles: SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, PARENT
- Boards: CBSE, STATE, ICSE, GENERAL
- Standards: Nursery through 10th

#### B. Create SUPER_ADMIN (Optional)
```bash
npm run create-super-admin
```
**Default Credentials:**
- Email: `superadmin@school.com`
- Password: `SuperAdmin123!`

**Or set custom credentials:**
```bash
SUPER_ADMIN_EMAIL=admin@example.com SUPER_ADMIN_PASSWORD=YourPassword123! npm run create-super-admin
```

#### C. Setup First School
1. Go to dashboard: `http://localhost:5173`
2. Click **"Setup School →"** link on login page
3. Or navigate directly to `/setup`
4. Fill the form:
   - School information
   - Admin account (this creates a SCHOOL_ADMIN)
   - Academic year
   - Standards and boards
5. Submit - This creates the school and SCHOOL_ADMIN user

### 2. Login Flow

#### Login Page Shows:
- Role badges: SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, PARENT
- "Setup School" link (only if no school exists)

#### After Login:
- **Top Navigation**: Shows role badge and email
- **Dashboard**: Shows role-specific content
  - **SUPER_ADMIN**: Purple badge, system-wide access message
  - **SCHOOL_ADMIN**: Blue badge, school management message
  - **TEACHER**: Green badge
  - **PARENT**: Gray badge

## Role Identification

### In Login Page
- Text below title shows: "Login as: SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, or PARENT"

### In Dashboard
- **Top Right Corner**: Colored badge showing role
  - 🟣 Purple = SUPER_ADMIN
  - 🔵 Blue = SCHOOL_ADMIN
  - 🟢 Green = TEACHER
  - ⚪ Gray = PARENT
- **Welcome Card**: Shows role-specific message

## Adding a New School

### Current Limitation
**The system only supports ONE school per database instance.**

### Options:

#### Option 1: Separate Instance (Recommended)
1. Create a new database
2. Run migrations: `npm run prisma:migrate`
3. Seed: `npm run prisma:seed`
4. Setup school via dashboard
5. Run on different port or server

#### Option 2: Multi-Tenant (Requires Changes)
Would require significant architecture changes:
- Remove `schoolId` requirement from User model
- Add school selection/switching
- Update all queries to filter by school
- Add school management for SUPER_ADMIN

## Common Scenarios

### Scenario 1: First Time Setup
1. Run `npm run prisma:seed`
2. (Optional) Run `npm run create-super-admin`
3. Go to dashboard `/setup`
4. Fill school setup form
5. Login with created SCHOOL_ADMIN credentials

### Scenario 2: Login as SUPER_ADMIN
1. Create SUPER_ADMIN: `npm run create-super-admin`
2. Login with: `superadmin@school.com` / `SuperAdmin123!`
3. See purple badge in dashboard
4. Can setup school if none exists

### Scenario 3: Login as SCHOOL_ADMIN
1. School must be set up first
2. Login with credentials created during school setup
3. See blue badge in dashboard
4. Full access to school management

### Scenario 4: Add Another School
**Current:** Not supported in single instance
**Solution:** Create separate database/instance

## Visual Indicators

### Login Page
```
┌─────────────────────────┐
│   School Management     │
│ Sign in to dashboard    │
│ Login as: SUPER_ADMIN,  │
│ SCHOOL_ADMIN, TEACHER,  │
│ or PARENT               │
└─────────────────────────┘
```

### Dashboard Top Bar
```
[School Management Dashboard]  [🟣 SUPER_ADMIN] admin@email.com [Logout]
```

### Dashboard Content
- **SUPER_ADMIN**: Purple info box explaining system-wide access
- **SCHOOL_ADMIN**: Blue info box explaining school management
- **School Info Card**: Shows school details (if school exists)

## Troubleshooting

### "School setup can only be done once"
- School already exists in database
- To reset: Clear database and run migrations again

### "SUPER_ADMIN role not found"
- Run: `npm run prisma:seed`

### "Cannot login"
- Check if user exists in database
- Verify email and password
- Check if account is active

### "No school info shown"
- SUPER_ADMIN may not have schoolId
- School may not be set up yet
- Check database for school record







