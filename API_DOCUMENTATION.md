# School Management System - Backend API Documentation

**For Frontend Developer Integration**

---

## 🚀 Server Information

- **Base URL**: `http://localhost:3000`
- **Environment**: Development
- **Health Check**: `http://localhost:3000/health`
- **API Documentation (Swagger)**: `http://localhost:3000/api/docs`

---

## 🔐 Authentication

### Token-Based Authentication
- **Type**: JWT (JSON Web Tokens)
- **Header Format**: `Authorization: Bearer <access_token>`
- **Access Token Expiry**: 15 minutes (default)
- **Refresh Token Expiry**: 7 days (default)

### Token Structure
The JWT payload contains:
```json
{
  "userId": "uuid",
  "schoolId": "uuid",
  "role": "SCHOOL_ADMIN" | "TEACHER" | "PARENT",
  "email": "string"
}
```

---

## 📊 Database Information

- **Database Name**: `school_management`
- **Database Type**: MySQL
- **Host**: `localhost:3306`

### Pre-seeded Data
The following data is already available in the database:

1. **Roles** (3):
   - `SCHOOL_ADMIN` - School administrator with full system access
   - `TEACHER` - Teacher with attendance marking and class management access
   - `PARENT` - Parent with read-only access to student information

2. **Boards** (4):
   - `CBSE` - Central Board of Secondary Education
   - `STATE` - State Board of Education
   - `ICSE` - Indian Certificate of Secondary Education
   - `GENERAL` - General Education Board

3. **Standards** (13):
   - Nursery (Order: 0)
   - LKG (Order: 1)
   - UKG (Order: 2)
   - 1st through 10th (Order: 3-12)

### Database Tables
- `roles` - User roles
- `boards` - Education boards
- `standards` - Grade/class standards
- `standard_boards` - Junction table (standard-board combinations)
- `schools` - School information
- `academic_years` - Academic year details
- `classes` - Class/section information
- `users` - User accounts
- `teacher_profiles` - Teacher details
- `parent_profiles` - Parent details
- `teacher_classes` - Teacher-class assignments
- `students` - Student information
- `attendances` - Attendance sessions
- `attendance_records` - Individual student attendance records
- `device_tokens` - Push notification device tokens
- `notifications` - Notification records
- `notification_deliveries` - Notification delivery tracking

---

## 📍 API Endpoints

### 1. Health Check

**GET** `/health`
- **Access**: Public
- **Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-24T11:21:26.933Z"
}
```

---

### 2. Authentication Endpoints

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
- **Success Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "admin@school.com",
      "role": "SCHOOL_ADMIN",
      "schoolId": "uuid"
    }
  }
}
```
- **Error Response** (401/400):
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

#### 2.2 Refresh Token
**POST** `/api/auth/refresh`
- **Access**: Public
- **Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Success Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token_here"
  }
}
```

---

### 3. School Management Endpoints

#### 3.1 School Setup (One-time)
**POST** `/api/school/setup`
- **Access**: Public (one-time only)
- **Content-Type**: `multipart/form-data` (for logo upload)
- **Request Body** (Form Data):
  - `schoolName` (string, required)
  - `address` (string, optional)
  - `contactNumber` (string, optional, min 10 digits)
  - `schoolEmail` (string, optional, valid email)
  - `adminName` (string, required)
  - `adminEmail` (string, required, valid email)
  - `adminPassword` (string, required, min 6 characters)
  - `standardsWithBoards` (JSON string, array, required)
    ```json
    [
      { "standard": "1st", "board": "CBSE" },
      { "standard": "2nd", "board": "CBSE" }
    ]
    ```
  - `academicYearName` (string, required, format: "2024-2025" or "2024-25")
  - `academicYearStartDate` (string, required, format: "YYYY-MM-DD")
  - `academicYearEndDate` (string, required, format: "YYYY-MM-DD")
  - `logo` (file, optional, image file)

- **Success Response** (201):
```json
{
  "success": true,
  "data": {
    "school": { ... },
    "admin": { ... },
    "academicYear": { ... }
  }
}
```

**Note**: This endpoint can only be called once. After initial setup, it will reject subsequent requests.

---

### 4. User Management Endpoints

All user endpoints require authentication.

#### 4.1 Create Teacher
**POST** `/api/user/teacher`
- **Access**: `SCHOOL_ADMIN` only
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
- **Note**: `classIds` is optional. Classes can be assigned later.

#### 4.2 List Teachers
**GET** `/api/user/teachers`
- **Access**: `SCHOOL_ADMIN` only
- **Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@school.com",
      "employeeId": "EMP001",
      "classes": [...]
    }
  ]
}
```

#### 4.3 Assign Teacher to Classes
**POST** `/api/user/teacher/assign`
- **Access**: `SCHOOL_ADMIN` only
- **Request Body**:
```json
{
  "teacherId": "uuid",
  "classIds": ["uuid1", "uuid2", "uuid3"]
}
```

#### 4.4 Get Parent Profile
**GET** `/api/user/parent/:id`
- **Access**: Parent themselves or `SCHOOL_ADMIN`
- **URL Params**: `id` (UUID) - Parent user ID
- **Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com",
    "relation": "Mother",
    "students": [...]
  }
}
```

---

### 5. Attendance Management Endpoints

#### 5.1 Mark Attendance
**POST** `/api/attendance/mark`
- **Access**: `TEACHER` only (must be assigned to the class)
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
  - `TEACHER` (own classes only)
  - `SCHOOL_ADMIN` (all classes)
  - `PARENT` (own child's class only)
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
- **Access**: `SCHOOL_ADMIN` only
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

### 6. Notification Endpoints

#### 6.1 Register Device Token
**POST** `/api/notification/device`
- **Access**: Authenticated users
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
- **Access**: `SCHOOL_ADMIN` only
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
- **Response** (202): Notification is queued for processing

#### 6.3 List Notifications
**GET** `/api/notification/list`
- **Access**: Authenticated users
- **Query Parameters**:
  - `limit` (optional): Number of notifications (1-100, default varies)
- **Response**:
  - Admin: All notifications
  - Other users: Only their own notifications

---

## 📁 File Uploads

- **Endpoint**: `/uploads/*`
- **Supported**: Profile photos, school logos
- **Upload Location**: `uploads/` directory
- **Access**: Files are served statically at `http://localhost:3000/uploads/filename.ext`

---

## 🔒 Authorization Rules

### Role-Based Access Control:

1. **SCHOOL_ADMIN**:
   - Full access to all endpoints
   - Can create teachers, students, classes
   - Can edit attendance
   - Can send notifications
   - Can view all data

2. **TEACHER**:
   - Can mark attendance for assigned classes only
   - Can view attendance for assigned classes
   - Cannot edit attendance (except during marking)
   - Can view own notifications

3. **PARENT**:
   - Can view own child's attendance
   - Can view own notifications
   - Can view own profile
   - Read-only access

---


---

## 🔑 Important Notes for Frontend

1. **Authentication Flow**:
   - Login to get `accessToken` and `refreshToken`
   - Store both tokens securely (localStorage/sessionStorage)
   - Include `accessToken` in `Authorization` header for all protected routes
   - When `accessToken` expires (401), use `refreshToken` to get a new `accessToken`
   - If `refreshToken` expires, redirect to login

2. **Token Refresh Strategy**:
   - Implement automatic token refresh when receiving 401
   - Use refresh token endpoint before forcing re-login

3. **Error Handling**:
   - Check `success` field in response
   - Display `error` message to user
   - Handle validation errors from `details` object

4. **Date Formats**:
   - Always use `YYYY-MM-DD` format for dates
   - Academic year can be `YYYY-YY` or `YYYY-YYYY`

5. **UUID Format**:
   - All IDs are UUIDs (v4)
   - Validate UUID format before sending requests

6. **File Uploads**:
   - Use `multipart/form-data` for file uploads
   - School setup endpoint accepts logo file

7. **CORS**:
   - Currently enabled for all origins (development)
   - Update for production

8. **Pagination**:
   - Currently not implemented, but consider for large datasets
   - Some endpoints may need pagination added later

---

## 🛠️ Testing the API

You can test all endpoints using:
1. **Swagger UI**: `http://localhost:3000/api/docs`
2. **Postman/Insomnia**: Import OpenAPI spec from `/api/docs`
3. **cURL**: Use the examples above

---

## 📞 Support

For API documentation updates or questions, refer to:
- Swagger UI at `/api/docs`
- OpenAPI JSON at `/api/docs` (view source)

---

**Last Updated**: December 24, 2025

