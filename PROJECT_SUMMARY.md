# School Management System - Complete Project Summary

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Building from Scratch](#building-from-scratch)
3. [Complete API List](#complete-api-list)
4. [Application Flow](#application-flow)
5. [Frontend Screens Required](#frontend-screens-required)

---

## 🎯 Project Overview

**School Management System** is a backend API built with Node.js, Express, Prisma, and MySQL. It's designed as a **single-school, single-database** system with role-based access control.

### Tech Stack
- **Backend**: Node.js + Express.js
- **Database**: MySQL with Prisma ORM
- **Authentication**: JWT (Access + Refresh tokens)
- **File Uploads**: Multer (local storage)
- **Background Jobs**: Bull + Redis
- **Push Notifications**: Firebase Cloud Messaging (FCM) + OneSignal
- **Documentation**: Swagger (OpenAPI 3.0)

### Architecture
- **Single School, Single Database** - One school per backend instance
- **Modular Monolith** - Domain-separated services within a single Express app
- **REST APIs Only** - No GraphQL, no WebSockets

### User Roles
1. **SCHOOL_ADMIN** - Full system access
2. **TEACHER** - Attendance marking, assigned classes only
3. **PARENT** - Read-only access to own child's information

---

## 🏗️ Building from Scratch

### Prerequisites
- Node.js (v18+)
- MySQL (v8+)
- Redis (for notification queue)
- npm or yarn

### Step-by-Step Setup

#### 1. **Install Dependencies**
```bash
npm install
```

#### 2. **Environment Configuration**
Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="mysql://username:password@localhost:3306/school_management"

# JWT Secrets
JWT_ACCESS_SECRET=your_access_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis (for notification queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Firebase Cloud Messaging (Optional)
FCM_SERVER_KEY=your_fcm_server_key
FCM_PROJECT_ID=your_fcm_project_id

# OneSignal (Optional)
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key
```

#### 3. **Database Setup**
```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed master data (roles, standards, boards)
npm run prisma:seed
```

#### 4. **Start Development Server**
```bash
npm run dev
```

Server will run on `http://localhost:3000`

#### 5. **Start Notification Worker** (Separate Terminal)
```bash
# Build the project first
npm run build

# Run the notification worker
node dist/modules/notification/notification.worker.js

# Or in development mode:
npx ts-node src/modules/notification/notification.worker.ts
```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with master data
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

### Database Structure
The database includes:
- **System Tables**: roles, boards, standards, standard_boards (pre-seeded)
- **School Tables**: schools, academic_years, classes
- **User Tables**: users, teacher_profiles, parent_profiles, teacher_classes
- **Student Tables**: students
- **Attendance Tables**: attendances, attendance_records
- **Notification Tables**: device_tokens, notifications, notification_deliveries

### Pre-seeded Data
1. **Roles** (3): SCHOOL_ADMIN, TEACHER, PARENT
2. **Boards** (4): CBSE, STATE, ICSE, GENERAL
3. **Standards** (13): Nursery, LKG, UKG, 1st through 10th

---

## 📍 Complete API List

### Base URL
```
http://localhost:3000
```

### Total APIs: **12 Endpoints**

---

### 1. Health Check
**GET** `/health`
- **Access**: Public
- **Description**: Server health check
- **Response**: `{ status: "ok", timestamp: "..." }`

---

### 2. Authentication APIs

#### 2.1 Login
**POST** `/api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "admin@school.com",
  "password": "password123"
}
```
- **Response**: Returns `accessToken`, `refreshToken`, and user info

#### 2.2 Refresh Token
**POST** `/api/auth/refresh`
- **Access**: Public
- **Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response**: Returns new `accessToken`

---

### 3. School Management APIs

#### 3.1 School Setup (One-time)
**POST** `/api/school/setup`
- **Access**: Public (one-time only)
- **Content-Type**: `multipart/form-data`
- **Request Fields**:
  - `schoolName` (string, required)
  - `address` (string, optional)
  - `contactNumber` (string, optional)
  - `schoolEmail` (string, optional)
  - `adminName` (string, required)
  - `adminEmail` (string, required)
  - `adminPassword` (string, required, min 6 chars)
  - `standardsWithBoards` (JSON string, array, required)
  - `academicYearName` (string, required, e.g., "2024-2025")
  - `academicYearStartDate` (string, required, YYYY-MM-DD)
  - `academicYearEndDate` (string, required, YYYY-MM-DD)
  - `logo` (file, optional, image)
- **Note**: Can only be called once. Creates school, admin user, academic year, and standard-board assignments.

---

### 4. User Management APIs

#### 4.1 Create Teacher
**POST** `/api/user/teacher`
- **Access**: SCHOOL_ADMIN only
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@school.com",
  "password": "password123",
  "phone": "1234567890",
  "employeeId": "EMP001",
  "dateOfBirth": "1990-01-15",
  "joiningDate": "2024-01-01",
  "qualification": "M.A. in Mathematics",
  "classIds": ["uuid1", "uuid2"]
}
```

#### 4.2 List Teachers
**GET** `/api/user/teachers`
- **Access**: SCHOOL_ADMIN only
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**: Array of teachers with their assigned classes

#### 4.3 Assign Teacher to Classes
**POST** `/api/user/teacher/assign`
- **Access**: SCHOOL_ADMIN only
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:
```json
{
  "teacherId": "uuid",
  "classIds": ["uuid1", "uuid2", "uuid3"]
}
```

#### 4.4 Get Parent Profile
**GET** `/api/user/parent/:id`
- **Access**: Parent themselves or SCHOOL_ADMIN
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Params**: `id` (UUID) - Parent user ID
- **Response**: Parent profile with associated students

---

### 5. Attendance Management APIs

#### 5.1 Mark Attendance
**POST** `/api/attendance/mark`
- **Access**: TEACHER only (must be assigned to the class)
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:
```json
{
  "classId": "uuid",
  "date": "2024-12-24",
  "attendanceRecords": [
    {
      "studentId": "uuid",
      "status": "PRESENT",
      "remarks": "On time"
    },
    {
      "studentId": "uuid",
      "status": "ABSENT",
      "remarks": "Sick leave"
    },
    {
      "studentId": "uuid",
      "status": "LATE",
      "remarks": "Arrived 10 minutes late"
    }
  ],
  "notes": "Regular attendance day"
}
```
- **Status Values**: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`
- **Date Format**: `YYYY-MM-DD`

#### 5.2 View Attendance by Class
**GET** `/api/attendance/class/:classId`
- **Access**: 
  - TEACHER (own classes only)
  - SCHOOL_ADMIN (all classes)
  - PARENT (own child's class only)
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Params**: `classId` (UUID)
- **Query Parameters**:
  - `date` (optional): `YYYY-MM-DD` - Get attendance for specific date
  - `startDate` (optional): `YYYY-MM-DD` - Start date for range
  - `endDate` (optional): `YYYY-MM-DD` - End date for range
- **Examples**:
  - `/api/attendance/class/uuid?date=2024-12-24`
  - `/api/attendance/class/uuid?startDate=2024-12-01&endDate=2024-12-31`

#### 5.3 Edit Attendance
**PUT** `/api/attendance/edit/:date/:classId`
- **Access**: SCHOOL_ADMIN only
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Params**: 
  - `date` (YYYY-MM-DD)
  - `classId` (UUID)
- **Request Body**:
```json
{
  "attendanceRecords": [
    {
      "studentId": "uuid",
      "status": "PRESENT",
      "remarks": "Updated"
    }
  ],
  "notes": "Corrected attendance"
}
```

---

### 6. Notification APIs

#### 6.1 Register Device Token
**POST** `/api/notification/device`
- **Access**: Authenticated users
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:
```json
{
  "userId": "uuid",
  "deviceToken": "fcm_token_or_onesignal_id",
  "platform": "IOS" | "ANDROID" | "WEB"
}
```

#### 6.2 Send Notification
**POST** `/api/notification/send`
- **Access**: SCHOOL_ADMIN only
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:
```json
{
  "title": "Parent Meeting Tomorrow",
  "message": "All parents are invited to attend the parent-teacher meeting.",
  "recipients": {
    "userIds": ["uuid1", "uuid2"],
    "roles": ["PARENT", "TEACHER"],
    "classIds": ["uuid1", "uuid2"]
  },
  "data": {
    "type": "meeting",
    "date": "2024-12-25"
  }
}
```
- **Note**: At least one of `userIds`, `roles`, or `classIds` must be provided.

#### 6.3 List Notifications
**GET** `/api/notification/list`
- **Access**: Authenticated users
- **Headers**: `Authorization: Bearer <access_token>`
- **Query Parameters**:
  - `limit` (optional): Number of notifications (1-100)
- **Response**: 
  - Admin: All notifications
  - Other users: Only their own notifications

---

### 7. Static File Serving

**GET** `/uploads/*`
- **Access**: Public
- **Description**: Serves uploaded files (logos, profile photos)
- **Example**: `http://localhost:3000/uploads/logo.png`

---

### 8. API Documentation

**GET** `/api/docs`
- **Access**: Public
- **Description**: Swagger UI documentation
- **URL**: `http://localhost:3000/api/docs`

---

## 🔄 Application Flow

### Initial Setup Flow
1. **Database Setup**
   - Run migrations to create tables
   - Seed master data (roles, boards, standards)

2. **School Setup** (One-time)
   - Call `/api/school/setup` endpoint
   - Creates:
     - School record
     - Admin user account
     - Academic year
     - Standard-board combinations
   - Returns admin credentials

3. **Login as Admin**
   - Use admin credentials to login via `/api/auth/login`
   - Receive access token and refresh token
   - Store tokens securely

### Daily Operations Flow

#### For SCHOOL_ADMIN:
1. **Login** → Get tokens
2. **Create Teachers** → `/api/user/teacher`
3. **Assign Teachers to Classes** → `/api/user/teacher/assign`
4. **View Attendance** → `/api/attendance/class/:classId`
5. **Edit Attendance** (if needed) → `/api/attendance/edit/:date/:classId`
6. **Send Notifications** → `/api/notification/send`
7. **View All Notifications** → `/api/notification/list`

#### For TEACHER:
1. **Login** → Get tokens
2. **View Assigned Classes** → (Need to implement or get from teacher profile)
3. **Mark Attendance** → `/api/attendance/mark`
4. **View Attendance History** → `/api/attendance/class/:classId`
5. **Register Device** → `/api/notification/device`
6. **View Notifications** → `/api/notification/list`

#### For PARENT:
1. **Login** → Get tokens (parent account must be created by admin)
2. **View Child's Attendance** → `/api/attendance/class/:classId` (only child's class)
3. **View Parent Profile** → `/api/user/parent/:id`
4. **Register Device** → `/api/notification/device`
5. **View Notifications** → `/api/notification/list`

### Authentication Flow
1. User logs in → Receives `accessToken` (15 min) and `refreshToken` (7 days)
2. Include `accessToken` in `Authorization: Bearer <token>` header for all protected routes
3. When `accessToken` expires (401 error):
   - Call `/api/auth/refresh` with `refreshToken`
   - Get new `accessToken`
   - Retry original request
4. If `refreshToken` expires → Redirect to login

### Attendance Flow
1. Teacher selects class and date
2. System fetches all students in that class
3. Teacher marks each student's attendance (PRESENT/ABSENT/LATE/EXCUSED)
4. Submit via `/api/attendance/mark`
5. System creates attendance session and individual records
6. Parents receive notification (if configured)
7. Admin can view/edit attendance later

### Notification Flow
1. Admin creates notification via `/api/notification/send`
2. System queues notification job (Bull + Redis)
3. Notification worker processes queue:
   - Resolves recipients (userIds, roles, classIds)
   - Creates notification records
   - Sends push notifications via FCM/OneSignal
   - Updates delivery status
4. Users receive notifications on registered devices

---

## 🖥️ Frontend Screens Required

### 1. Authentication Screens

#### 1.1 Login Screen
**Route**: `/login`
- **Fields**:
  - Email input
  - Password input
  - "Remember me" checkbox (optional)
  - Login button
  - "Forgot Password?" link (future feature)
- **API**: `POST /api/auth/login`
- **Actions**:
  - On success: Store tokens, redirect based on role
  - On error: Display error message
- **Redirects**:
  - SCHOOL_ADMIN → Dashboard
  - TEACHER → Teacher Dashboard
  - PARENT → Parent Dashboard

#### 1.2 Token Refresh Handler
- **Implementation**: Interceptor/middleware
- **Logic**: 
  - Intercept 401 responses
  - Call `/api/auth/refresh`
  - Retry original request
  - If refresh fails → Redirect to login

---

### 2. School Setup Screen (One-time)

#### 2.1 Initial School Setup
**Route**: `/setup` (only if school not set up)
- **Sections**:
  1. **School Information**
     - School Name* (text input)
     - Address (textarea)
     - Contact Number (phone input)
     - School Email (email input)
     - Logo Upload (file input, image preview)
  
  2. **Admin Account**
     - Admin Name* (text input)
     - Admin Email* (email input)
     - Admin Password* (password input, min 6 chars)
     - Confirm Password* (password input)
  
  3. **Academic Year**
     - Academic Year Name* (text input, e.g., "2024-2025")
     - Start Date* (date picker)
     - End Date* (date picker)
  
  4. **Standards & Boards**
     - Multi-select or checkbox list
     - Select standard-board combinations
     - Example: "1st - CBSE", "2nd - CBSE", "1st - ICSE"
     - Display available standards and boards from seed data
  
- **API**: `POST /api/school/setup` (multipart/form-data)
- **Validation**:
  - All required fields
  - Email format
  - Password match
  - Date validation (end date > start date)
  - At least one standard-board combination
- **Actions**:
  - On success: Show success message, redirect to login
  - On error: Display validation errors
- **Note**: This screen should only be accessible if school is not set up

---

### 3. SCHOOL_ADMIN Screens

#### 3.1 Admin Dashboard
**Route**: `/admin/dashboard`
- **Components**:
  - Header with school logo, name, admin name
  - Navigation menu/sidebar
  - Statistics cards:
    - Total Teachers
    - Total Students (if implemented)
    - Total Classes
    - Today's Attendance Summary
  - Recent activities/notifications
  - Quick actions:
    - Create Teacher
    - View Attendance
    - Send Notification

#### 3.2 Teacher Management

##### 3.2.1 Create Teacher Screen
**Route**: `/admin/teachers/create`
- **Form Fields**:
  - First Name* (text)
  - Last Name* (text)
  - Email* (email)
  - Password* (password, min 6)
  - Phone (phone)
  - Employee ID (text, optional)
  - Date of Birth (date picker, optional)
  - Joining Date (date picker, optional)
  - Qualification (text, optional)
  - Assign Classes (multi-select, optional)
    - Show available classes (standard + board + section)
- **API**: `POST /api/user/teacher`
- **Actions**:
  - On success: Show success message, redirect to teachers list
  - On error: Display validation errors

##### 3.2.2 Teachers List Screen
**Route**: `/admin/teachers`
- **Components**:
  - Search bar (by name, email, employee ID)
  - Filter options (optional)
  - Table/List showing:
    - Name
    - Email
    - Employee ID
    - Assigned Classes (comma-separated)
    - Actions (View, Edit, Assign Classes)
  - "Create Teacher" button
- **API**: `GET /api/user/teachers`
- **Actions**:
  - Click teacher → View details
  - Click "Assign Classes" → Open assignment modal/screen

##### 3.2.3 Assign Teacher to Classes Screen
**Route**: `/admin/teachers/:teacherId/assign` or Modal
- **Components**:
  - Teacher name display
  - Current assigned classes list
  - Available classes multi-select
  - Save button
- **API**: `POST /api/user/teacher/assign`
- **Actions**:
  - On success: Update UI, show success message
  - On error: Display error

#### 3.3 Attendance Management

##### 3.3.1 View Attendance Screen
**Route**: `/admin/attendance`
- **Components**:
  - Filters:
    - Class dropdown (all classes)
    - Date picker (single date or date range)
  - Attendance table:
    - Date
    - Class
    - Total Present
    - Total Absent
    - Marked By (teacher name)
    - Actions (View Details, Edit)
  - Export button (future feature)
- **API**: `GET /api/attendance/class/:classId?date=...` or `?startDate=...&endDate=...`
- **Actions**:
  - Click "View Details" → Show detailed attendance
  - Click "Edit" → Open edit modal/screen

##### 3.3.2 Attendance Details Screen
**Route**: `/admin/attendance/:classId/:date` or Modal
- **Components**:
  - Class name, date header
  - Student list with attendance status:
    - Student Name
    - Admission Number
    - Status (PRESENT/ABSENT/LATE/EXCUSED)
    - Remarks
  - Notes section
  - Edit button (for admin)
- **API**: `GET /api/attendance/class/:classId?date=YYYY-MM-DD`

##### 3.3.3 Edit Attendance Screen
**Route**: `/admin/attendance/:classId/:date/edit` or Modal
- **Components**:
  - Similar to attendance details
  - Editable status dropdowns for each student
  - Editable remarks
  - Save button
- **API**: `PUT /api/attendance/edit/:date/:classId`
- **Actions**:
  - On success: Show success, refresh attendance view
  - On error: Display validation errors

#### 3.4 Notification Management

##### 3.4.1 Send Notification Screen
**Route**: `/admin/notifications/send`
- **Form Fields**:
  - Title* (text)
  - Message* (textarea)
  - Recipients* (radio/checkbox):
    - Option 1: Select Users (multi-select user list)
    - Option 2: Select Roles (checkbox: PARENT, TEACHER)
    - Option 3: Select Classes (multi-select class list)
    - Can combine multiple options
  - Additional Data (optional, JSON or key-value pairs)
  - Send button
- **API**: `POST /api/notification/send`
- **Actions**:
  - On success: Show success message, redirect to notifications list
  - On error: Display validation errors

##### 3.4.2 Notifications List Screen
**Route**: `/admin/notifications`
- **Components**:
  - Filter options (date, recipient type)
  - List/Table showing:
    - Title
    - Message (truncated)
    - Recipients count
    - Sent Date
    - Status (delivery stats if available)
    - Actions (View Details)
  - "Send Notification" button
- **API**: `GET /api/notification/list`
- **Actions**:
  - Click notification → View details

#### 3.5 Parent Management (Future)
- Create Parent account
- Link Parent to Students
- View Parent profiles

#### 3.6 Student Management (Future - Not in current API)
- Create Student
- List Students
- Edit Student
- Assign Student to Class

---

### 4. TEACHER Screens

#### 4.1 Teacher Dashboard
**Route**: `/teacher/dashboard`
- **Components**:
  - Header with teacher name, school name
  - Navigation menu
  - Assigned Classes list:
    - Class name (e.g., "1st A - CBSE")
    - Student count
    - Quick action: "Mark Attendance"
  - Today's attendance summary
  - Recent notifications
- **API**: Need to fetch teacher profile with classes (may need new endpoint or use existing)

#### 4.2 Mark Attendance Screen
**Route**: `/teacher/attendance/mark`
- **Components**:
  - Class selector dropdown (only assigned classes)
  - Date picker (default: today, can't select future dates)
  - Student list:
    - Student Name
    - Admission Number
    - Status buttons/radio: PRESENT, ABSENT, LATE, EXCUSED
    - Remarks input (optional, per student)
  - General Notes (textarea, optional)
  - Submit button
  - "Load Previous" button (to copy from previous day)
- **API**: `POST /api/attendance/mark`
- **Validation**:
  - All students must have a status
  - Date cannot be future
  - Teacher must be assigned to the class
- **Actions**:
  - On success: Show success message, option to mark another class
  - On error: Display validation errors

#### 4.3 View Attendance History Screen
**Route**: `/teacher/attendance`
- **Components**:
  - Class filter (assigned classes only)
  - Date range picker
  - Attendance list:
    - Date
    - Class
    - Present count / Total students
    - Actions (View Details)
  - "Mark Attendance" button
- **API**: `GET /api/attendance/class/:classId?startDate=...&endDate=...`
- **Actions**:
  - Click "View Details" → Show attendance details

#### 4.4 Attendance Details Screen
**Route**: `/teacher/attendance/:classId/:date` or Modal
- **Components**:
  - Class name, date header
  - Student list with status and remarks
  - Notes section
  - Read-only (teachers can't edit after submission)
- **API**: `GET /api/attendance/class/:classId?date=YYYY-MM-DD`

#### 4.5 Notifications Screen
**Route**: `/teacher/notifications`
- **Components**:
  - List of notifications
  - Mark as read functionality
  - Filter by date
- **API**: `GET /api/notification/list`
- **Actions**:
  - Click notification → View details

---

### 5. PARENT Screens

#### 5.1 Parent Dashboard
**Route**: `/parent/dashboard`
- **Components**:
  - Header with parent name, school name
  - Navigation menu
  - Children list:
    - Child name
    - Class (e.g., "1st A - CBSE")
    - Quick stats (attendance percentage, if calculated)
    - Quick action: "View Attendance"
  - Recent notifications
  - Upcoming events (if implemented)

#### 5.2 Child Attendance View Screen
**Route**: `/parent/attendance/:childId` or `/parent/attendance`
- **Components**:
  - Child selector (if multiple children)
  - Class display
  - Date range picker
  - Attendance calendar or list:
    - Date
    - Status (PRESENT/ABSENT/LATE/EXCUSED) with color coding
    - Remarks (if any)
  - Statistics:
    - Total Present days
    - Total Absent days
    - Attendance Percentage
    - Total Late days
  - Export button (future feature)
- **API**: `GET /api/attendance/class/:classId?startDate=...&endDate=...`
- **Note**: Parent can only view their child's class attendance

#### 5.3 Parent Profile Screen
**Route**: `/parent/profile`
- **Components**:
  - Personal Information:
    - Name
    - Email
    - Phone
    - Relation
    - Occupation
  - Associated Students list:
    - Student name
    - Class
    - Admission number
  - Edit button (if profile editing is implemented)
- **API**: `GET /api/user/parent/:id`

#### 5.4 Notifications Screen
**Route**: `/parent/notifications`
- **Components**:
  - List of notifications
  - Mark as read functionality
  - Filter by date
- **API**: `GET /api/notification/list`
- **Actions**:
  - Click notification → View details

---

### 6. Common/Shared Screens

#### 6.1 Profile Screen
**Route**: `/profile`
- **Components**:
  - User information (role-specific)
  - Change password (future feature)
  - Device management (for push notifications)
  - Logout button

#### 6.2 Settings Screen
**Route**: `/settings`
- **Components**:
  - Notification preferences
  - Language settings (if multi-language)
  - Theme settings (light/dark mode)

#### 6.3 Error Pages
- **404**: Not Found
- **401**: Unauthorized (redirect to login)
- **403**: Forbidden
- **500**: Server Error

---

### 7. Mobile App Considerations

If building a mobile app (React Native, Flutter, etc.):

#### Additional Screens:
- **Splash Screen**: Check authentication, redirect
- **Onboarding**: First-time user guide
- **Push Notification Handler**: Deep linking to relevant screens
- **Offline Mode**: Cache attendance data, sync when online

#### Mobile-Specific Features:
- **Biometric Login**: Face ID, Fingerprint
- **Quick Attendance**: Swipe gestures for marking
- **Camera Integration**: Profile photo upload
- **Location Services**: Verify teacher is at school (optional)

---

## 📱 Frontend Implementation Recommendations

### Technology Stack Suggestions:
- **Web**: React.js / Vue.js / Angular
- **Mobile**: React Native / Flutter
- **State Management**: Redux / Zustand / Context API
- **HTTP Client**: Axios / Fetch with interceptors
- **Routing**: React Router / Vue Router
- **UI Library**: Material-UI / Ant Design / Tailwind CSS
- **Form Handling**: React Hook Form / Formik
- **Date Handling**: date-fns / moment.js / dayjs

### Key Implementation Points:

1. **Token Management**:
   - Store tokens securely (httpOnly cookies or secure storage)
   - Implement automatic token refresh
   - Clear tokens on logout

2. **Role-Based Routing**:
   - Protect routes based on user role
   - Redirect unauthorized access

3. **Error Handling**:
   - Global error handler
   - User-friendly error messages
   - Retry mechanisms for failed requests

4. **Loading States**:
   - Show loading indicators
   - Skeleton screens for better UX

5. **Responsive Design**:
   - Mobile-first approach
   - Tablet and desktop layouts

6. **Accessibility**:
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

---

## 🔐 Security Considerations for Frontend

1. **Token Storage**: Use secure storage (not localStorage for sensitive apps)
2. **HTTPS**: Always use HTTPS in production
3. **Input Validation**: Client-side + server-side validation
4. **XSS Protection**: Sanitize user inputs
5. **CSRF Protection**: Implement CSRF tokens if needed
6. **Rate Limiting**: Handle API rate limits gracefully

---

## 📊 Summary

### Total APIs: **12 Endpoints**
- 1 Health Check
- 2 Authentication
- 1 School Setup
- 4 User Management
- 3 Attendance
- 3 Notifications

### User Roles: **3**
- SCHOOL_ADMIN (full access)
- TEACHER (attendance marking)
- PARENT (read-only)

### Frontend Screens: **~25-30 Screens**
- 2 Authentication screens
- 1 School setup screen
- 8-10 Admin screens
- 5-6 Teacher screens
- 4-5 Parent screens
- 3-4 Common/shared screens
- Error pages

---

**Last Updated**: December 24, 2025

