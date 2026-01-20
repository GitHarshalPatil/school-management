# Complete Testing Guide - Frontend & Backend Integration

## ✅ Integration Status: READY FOR TESTING

The frontend and backend are properly integrated. Follow this guide to test everything.

---

## 📋 Prerequisites Checklist

Before testing, ensure you have:

- [ ] Node.js >= 20.19.4 installed
- [ ] MySQL database running
- [ ] Redis running (for notifications - optional but recommended)
- [ ] Android Studio installed (for Android testing)
- [ ] Android Emulator or Physical Device ready
- [ ] Firebase project created (for push notifications)

---

## 🔧 STEP 1: Backend Setup & Testing

### 1.1 Navigate to Backend Directory

```bash
cd C:\smbackend
```

### 1.2 Install Backend Dependencies

```bash
npm install
```

### 1.3 Configure Environment Variables

Create `.env` file in the backend root directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Database (Update with your MySQL credentials)
DATABASE_URL="mysql://username:password@localhost:3306/school_management"

# JWT Secrets (Generate strong random strings)
JWT_ACCESS_SECRET=your_super_secret_access_key_here_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis (Optional - for notifications)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Firebase (Optional - for push notifications)
FCM_SERVER_KEY=
FCM_PROJECT_ID=

# OneSignal (Optional)
ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
```

**Important**: Generate strong JWT secrets:
```bash
# On Windows PowerShell:
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
```

### 1.4 Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (creates tables)
npm run prisma:migrate

# Seed database (creates roles, boards, standards)
npm run prisma:seed
```

### 1.5 Start Backend Server

```bash
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3000
📝 Environment: development
🔗 Health check: http://localhost:3000/health
🔐 Auth API: http://localhost:3000/api/auth
```

### 1.6 Test Backend API

Open browser and test:

1. **Health Check**: http://localhost:3000/health
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Swagger Documentation**: http://localhost:3000/api/docs
   - Should show API documentation UI

3. **Test Login** (using Swagger or Postman):
   - First, you need to setup school (see below)
   - Then login with admin credentials

---

## 📱 STEP 2: Frontend Setup & Testing

### 2.1 Navigate to Frontend Directory

```bash
cd C:\smbackend\Frontend\smfrontend
```

### 2.2 Install Frontend Dependencies

```bash
npm install
```

**Note**: This may take 5-10 minutes. If you get errors:
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then reinstall

### 2.3 Configure API Base URL

**For Android Emulator:**
The default configuration (`http://10.0.2.2:3000`) should work. No changes needed.

**For Physical Android Device:**
1. Find your computer's IP address:
   ```bash
   # Windows PowerShell:
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. Update `src/config/constants.ts`:
   ```typescript
   export const API_BASE_URL = __DEV__
     ? 'http://192.168.1.100:3000' // Replace with your IP
     : 'http://localhost:3000';
   ```

**Important**: 
- Backend and phone must be on the same WiFi network
- Windows Firewall may block connections - allow port 3000

### 2.4 Setup Firebase (Optional but Recommended)

1. Go to https://console.firebase.google.com/
2. Create new project or select existing
3. Add Android app:
   - Package name: `com.smfrontend`
   - Download `google-services.json`
4. Place file in: `android/app/google-services.json`

**Note**: Push notifications won't work without this, but app will still function.

### 2.5 Start Metro Bundler

```bash
npm start
```

**Expected Output:**
```
Welcome to Metro!
...
```

Keep this terminal open.

### 2.6 Run Android App

**In a NEW terminal** (keep Metro running):

```bash
cd C:\smbackend\Frontend\smfrontend
npm run android
```

**Expected Behavior:**
- Android emulator/device should launch
- App should build and install
- App should open automatically

---

## 🧪 STEP 3: Integration Testing

### Test Flow 1: School Setup (First Time Only)

1. **Open App** → Should show Login screen
2. **Check if school is already setup:**
   - If you see login screen → School is NOT setup
   - If you can login → School is already setup (skip to Test Flow 2)

3. **If school NOT setup**, you need to setup via API:
   - Use Swagger UI: http://localhost:3000/api/docs
   - Or use Postman/curl
   - Call `POST /api/school/setup` with school data

**OR** - Navigate to School Setup screen in app (if implemented)

### Test Flow 2: Login & Authentication

1. **Open App** → Login Screen appears
2. **Enter Credentials:**
   - Email: `admin@school.com` (or your admin email from setup)
   - Password: Your admin password
3. **Click "Sign In"**
4. **Expected Result:**
   - Loading indicator appears
   - App navigates to Admin Dashboard
   - No errors in console

**Check Console Logs:**
- Should see: "Device token registered successfully"
- No red error messages

### Test Flow 3: Admin Dashboard

1. **After Login** → Should see Admin Dashboard
2. **Verify:**
   - Welcome message with email
   - Statistics cards (Teachers, Classes, etc.)
   - Navigation buttons visible

### Test Flow 4: Teacher Management

1. **Click "Manage Teachers"** or navigate to Teachers tab
2. **Click "Add Teacher"**
3. **Fill Form:**
   - First Name: Test
   - Last Name: Teacher
   - Email: test.teacher@school.com
   - Password: password123
   - Other fields (optional)
4. **Click "Create Teacher"**
5. **Expected Result:**
   - Success message
   - Redirects to Teacher List
   - New teacher appears in list

### Test Flow 5: API Calls Verification

**Check Backend Logs:**
- Should see API requests coming in
- Should see successful responses

**Check Frontend Console:**
- Open React Native Debugger or check Metro logs
- Should see API calls
- No network errors

---

## 🔍 STEP 4: Testing Checklist

### Backend Tests

- [ ] Health check endpoint works: `GET /health`
- [ ] Swagger UI accessible: `http://localhost:3000/api/docs`
- [ ] Database connected (check server logs)
- [ ] School setup endpoint works (if not already setup)
- [ ] Login endpoint works
- [ ] Token generation works

### Frontend Tests

- [ ] App builds successfully
- [ ] App launches on device/emulator
- [ ] Login screen displays correctly
- [ ] Can enter email and password
- [ ] Login button works
- [ ] Navigation works after login
- [ ] Dashboard displays
- [ ] API calls succeed (check network tab)
- [ ] No console errors

### Integration Tests

- [ ] Login flow works end-to-end
- [ ] Token stored correctly
- [ ] API calls include Authorization header
- [ ] Token refresh works (wait 15+ minutes or manually expire token)
- [ ] Logout works
- [ ] Protected routes redirect when not authenticated

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Server won't start
- **Solution**: Check `.env` file exists and has all required variables
- **Solution**: Check MySQL is running
- **Solution**: Check port 3000 is not in use

**Problem**: Database connection error
- **Solution**: Verify DATABASE_URL in `.env`
- **Solution**: Check MySQL is running: `mysql -u root -p`
- **Solution**: Create database: `CREATE DATABASE school_management;`

**Problem**: Migration errors
- **Solution**: Drop database and recreate
- **Solution**: Check Prisma schema is correct

### Frontend Issues

**Problem**: App won't build
- **Solution**: Clean build: `cd android && ./gradlew clean && cd ..`
- **Solution**: Clear Metro cache: `npm start -- --reset-cache`
- **Solution**: Delete `node_modules` and reinstall

**Problem**: Cannot connect to backend
- **Solution**: Check API_BASE_URL in `src/config/constants.ts`
- **Solution**: For physical device, use computer's IP, not localhost
- **Solution**: Check Windows Firewall allows port 3000
- **Solution**: Ensure backend is running
- **Solution**: Check both devices on same network

**Problem**: Login fails
- **Solution**: Check backend is running
- **Solution**: Check API URL is correct
- **Solution**: Check network tab for error details
- **Solution**: Verify credentials are correct

**Problem**: White screen or app crashes
- **Solution**: Check Metro bundler is running
- **Solution**: Check console for errors
- **Solution**: Restart Metro: `npm start -- --reset-cache`
- **Solution**: Rebuild app: `npm run android`

**Problem**: Push notifications not working
- **Solution**: Verify `google-services.json` is in `android/app/`
- **Solution**: Check Firebase project configuration
- **Solution**: Verify device token registration in backend logs

### Network Issues

**Problem**: Network request failed
- **Solution**: Check backend is running
- **Solution**: Check API URL (use IP for physical device)
- **Solution**: Check firewall settings
- **Solution**: Try `http://10.0.2.2:3000` for emulator

---

## 📊 Quick Test Commands

### Backend Health Check
```bash
curl http://localhost:3000/health
```

### Test Login (using curl)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@school.com\",\"password\":\"your_password\"}"
```

### Check Backend Logs
- Watch terminal where `npm run dev` is running
- Should see incoming requests

### Check Frontend Logs
- Watch Metro bundler terminal
- Use React Native Debugger
- Check Android Logcat: `adb logcat`

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Backend server runs without errors
2. ✅ Frontend app builds and launches
3. ✅ Login screen appears
4. ✅ Can login successfully
5. ✅ Dashboard appears after login
6. ✅ Can navigate between screens
7. ✅ API calls succeed (check network tab)
8. ✅ No red errors in console
9. ✅ Data persists after app restart (tokens stored)

---

## 🚀 Next Steps After Testing

Once basic testing passes:

1. Test all screens
2. Test all API endpoints
3. Test push notifications
4. Test token refresh
5. Test error handling
6. Test offline scenarios
7. Complete remaining screen implementations

---

## 📞 Need Help?

If you encounter issues:

1. Check console logs (both frontend and backend)
2. Check network requests in browser DevTools
3. Verify all configuration files
4. Check this guide's troubleshooting section
5. Review error messages carefully

---

## 🎯 Quick Start Summary

```bash
# Terminal 1 - Backend
cd C:\smbackend
npm install
# Setup .env file
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev

# Terminal 2 - Frontend Metro
cd C:\smbackend\Frontend\smfrontend
npm install
npm start

# Terminal 3 - Frontend Android
cd C:\smbackend\Frontend\smfrontend
npm run android
```

**That's it!** Your app should now be running and ready to test! 🎉
















