# React Native App Updates

## Changes Made

### 1. Removed School Setup from React Native
- Removed `SchoolSetup` from navigation types
- Updated `EntryScreen` to remove "Setup New School" button
- School setup is now only available in the web dashboard

### 2. Added School Info Editing in Profile
- Updated `ProfileScreen` with edit functionality
- Users can now update:
  - School name (required)
  - School email
  - School logo (select from gallery)

### 3. Backend Updates
- Added `PUT /api/school/info` endpoint
- Allows authenticated users to update their school information
- Supports logo upload via multipart/form-data

## New Dependencies

### react-native-image-picker
Added to `package.json` for selecting images from device gallery.

**Installation:**
```bash
cd Frontend/smfrontend
npm install
```

**For Android:**
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

**For iOS:**
Add to `ios/smfrontend/Info.plist`:
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to select school logo</string>
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take photos</string>
```

## Profile Screen Features

### View Mode
- Displays school information (name, email, phone, address, logo)
- Shows account information (email, role, status)
- "Edit" button to enter edit mode

### Edit Mode
- **Logo Selection:**
  - Tap "Select Logo" button
  - Opens device image gallery
  - Selected image preview shown
  - Can change logo before saving

- **School Name:**
  - Required field
  - Text input for editing

- **School Email:**
  - Optional field
  - Email validation

- **Actions:**
  - "Cancel" - Discards changes
  - "Save" - Updates school info via API

## API Endpoints

### PUT /api/school/info
**Headers:**
- `Authorization: Bearer <accessToken>`
- `Content-Type: multipart/form-data`

**Request Body (FormData):**
- `name` (string, optional) - School name
- `email` (string, optional) - School email
- `phone` (string, optional) - School phone
- `address` (string, optional) - School address
- `logo` (file, optional) - School logo image

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated School Name",
    "email": "updated@school.com",
    "logo": "/uploads/new-logo.jpg",
    ...
  }
}
```

## Usage Flow

1. User logs in to React Native app
2. Navigates to Profile tab
3. Views current school information
4. Taps "Edit" button
5. Can:
   - Select new logo from gallery
   - Update school name
   - Update school email
6. Taps "Save" to update
7. School info refreshes automatically
8. Success message displayed

## Error Handling

- Validation errors shown in alerts
- Network errors handled gracefully
- Loading states during save operation
- Cancel button to discard changes

## Design

- Clean, reusable design
- Consistent with app theme
- Responsive layout
- Loading indicators
- Error feedback







