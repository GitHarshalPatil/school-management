# Dashboard Application Flow

## Architecture Overview

### Component Hierarchy
```
App
└── BrowserRouter (provides routing context)
    └── AuthProvider (manages authentication state)
        └── Routes
            ├── /login → LoginPage
            ├── /setup → SchoolSetupPage
            └── /dashboard → DashboardPage (ProtectedRoute)
```

## Authentication Flow

### 1. Initial Load
- User visits the app
- `AuthProvider` checks localStorage for stored user
- If user exists → set user state
- If no user → user remains null

### 2. Login Process
```
User enters credentials
    ↓
LoginPage calls authService.login()
    ↓
POST /api/auth/login
    ↓
Backend validates credentials
    ↓
Backend returns: { user, tokens: { accessToken, refreshToken } }
    ↓
authService.storeUser() saves to localStorage
    ↓
AuthContext updates user state
    ↓
LoginPage navigates to /dashboard
```

### 3. Protected Routes
- `ProtectedRoute` component checks `isAuthenticated`
- If not authenticated → redirect to `/login`
- If authenticated → render protected content

### 4. Logout Process
```
User clicks logout
    ↓
AuthContext.logout() called
    ↓
Clears localStorage (tokens, user)
    ↓
Sets user state to null
    ↓
Navigates to /login
```

## Backend API Flow

### Authentication Endpoints

#### POST /api/auth/login
**Request:**
```json
{
  "email": "admin@school.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@school.com",
      "role": "SCHOOL_ADMIN",
      "isActive": true
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

#### POST /api/auth/refresh
**Request:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "new_jwt_token",
      "refreshToken": "new_jwt_refresh_token"
    }
  }
}
```

### School Endpoints

#### POST /api/school/setup
**Request:** multipart/form-data
- schoolName (string)
- address (string, optional)
- contactNumber (string, optional)
- schoolEmail (string, optional)
- adminName (string)
- adminEmail (string)
- adminPassword (string)
- standardsWithBoards (JSON string, array)
- academicYearName (string)
- academicYearStartDate (string, YYYY-MM-DD)
- academicYearEndDate (string, YYYY-MM-DD)
- logo (file, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "School setup completed successfully",
    "school": { "id": "uuid", "name": "School Name" },
    "admin": { "email": "admin@school.com" },
    "academicYear": { "id": "uuid", "name": "2024-2025" },
    "standardsBoards": [...]
  }
}
```

#### GET /api/school/info
**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "School Name",
    "logo": "/uploads/logo.png",
    "address": "School Address",
    "phone": "1234567890",
    "email": "school@example.com",
    "isActive": true
  }
}
```

## Token Management

### Access Token
- Stored in localStorage as `accessToken`
- Expires in 15 minutes (default)
- Included in `Authorization: Bearer <token>` header
- Auto-refreshed when expired (401 response)

### Refresh Token
- Stored in localStorage as `refreshToken`
- Expires in 7 days (default)
- Used to get new access token
- Cleared on logout

### Token Refresh Flow
```
API Request with expired accessToken
    ↓
401 Unauthorized response
    ↓
API interceptor catches 401
    ↓
POST /api/auth/refresh with refreshToken
    ↓
Get new accessToken
    ↓
Retry original request
```

## School Setup Flow

### First Time Setup
1. User navigates to `/setup`
2. Fills out school setup form
3. Submits form data (multipart/form-data)
4. Backend creates:
   - School record
   - Admin user account
   - Academic year
   - Standard-board assignments
5. Redirects to `/login`

### After Setup
- School setup endpoint returns error if school already exists
- Users can login with admin credentials
- School info available via `/api/school/info`

## Dashboard Flow

### Dashboard Page Load
1. User navigates to `/dashboard`
2. `ProtectedRoute` checks authentication
3. If authenticated:
   - `DashboardPage` loads
   - Fetches school info if user has schoolId
   - Displays user role and school information
4. If not authenticated:
   - Redirects to `/login`

## Error Handling

### API Errors
- Network errors → displayed in UI
- 401 errors → auto token refresh
- 403 errors → redirect to login
- Validation errors → shown in form

### Authentication Errors
- Invalid credentials → error message on login page
- Expired tokens → auto refresh or redirect to login
- Missing tokens → redirect to login

## State Management

### AuthContext State
```typescript
{
  user: User | null,
  isLoading: boolean,
  isAuthenticated: boolean,
  login: (email, password) => Promise<void>,
  logout: () => void
}
```

### LocalStorage Keys
- `accessToken` - JWT access token
- `refreshToken` - JWT refresh token
- `user` - User object (JSON stringified)

## Security Considerations

1. **Tokens stored in localStorage** - Consider httpOnly cookies for production
2. **CORS enabled** - Configure allowed origins in production
3. **Password hashing** - Backend uses bcrypt
4. **JWT secrets** - Must be strong and kept secure
5. **Token expiration** - Short-lived access tokens for security







