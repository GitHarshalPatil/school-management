# Quick Setup Instructions

## Step 1: Database Setup

Run these commands in order:

```bash
# 1. Generate Prisma Client
npm run prisma:generate

# 2. Run database migrations
npm run prisma:migrate

# 3. Seed the database (creates roles, boards, standards)
npm run prisma:seed

# 4. Create Super Admin user
npm run create-super-admin
```

## Step 2: Environment Variables

Make sure you have a `.env` file in the root directory. Copy from `.env.example` if needed:

```env
DATABASE_URL="mysql://username:password@localhost:3306/school_management"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
```

## Step 3: Start Backend Server

```bash
npm run dev
```

## Step 4: Start Dashboard (in separate terminal)

```bash
cd Dashboard/sm-dashboard
npm install  # Only needed first time
npm run dev
```

## Step 5: Login

Open browser to `http://localhost:5173` (or the port shown)

**Default Super Admin Credentials:**
- Email: `superadmin@school.com`
- Password: `SuperAdmin123!`

These credentials are shown on the login page.

## Super Admin Flow

1. **Login** with Super Admin credentials
2. **Dashboard** shows Super Admin panel
3. **Setup School** - Click "Setup School" button to create first school
4. **After School Setup** - You can create School Admin users for that school

## Notes

- Super Admin credentials are displayed on the login page
- After first login, change the password for security
- Super Admin can create schools and manage system-wide settings
- School Admin can manage teachers, students, and school-specific data




