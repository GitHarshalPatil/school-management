# School Management System - Backend

Backend API for School Management System built with Node.js, Express, Prisma, and MySQL.

## Architecture

- **Single School, Single Database** - One school per backend instance
- **Microservice-style Modular Monolith** - Domain-separated services within a single Express app
- **REST APIs Only** - No GraphQL, no WebSockets

## Tech Stack

- Node.js + Express.js
- Prisma ORM + MySQL
- JWT (Access + Refresh tokens)
- Swagger (OpenAPI 3.0)
- Multer (Local file uploads)
- Bull + Redis (Background jobs)
- Firebase Cloud Messaging (FCM)
- OneSignal (Push notifications)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Generate Prisma Client:
```bash
npm run prisma:generate
```

4. Run migrations:
```bash
npm run prisma:migrate
```

5. Seed database:
```bash
npm run prisma:seed
```

6. Start development server:
```bash
npm run dev
```

## API Documentation

Once the server is running, access Swagger documentation at:
- `http://localhost:3000/api/docs`

## Project Structure

```
src/
 └── modules/
     └── <module-name>/
         ├── <module>.route.ts
         ├── <module>.controller.ts
         ├── <module>.service.ts
         └── <module>.schema.ts (validation)

prisma/
 └── schema.prisma

middlewares/
utils/
uploads/
swagger/
```

## Roles

- **SCHOOL_ADMIN** - Full access
- **TEACHER** - Attendance marking, assigned classes
- **PARENT** - Read-only access

## Development Status

✅ Step 1: Database schema (Prisma)  
✅ Step 2: Database seeding  
✅ Step 3: Auth module  
✅ Step 4: School Setup module  
✅ Step 5: User & Teacher Management  
✅ Step 6: Attendance module  
✅ Step 7: Notification & Push module  
✅ Step 8: Swagger documentation

## Run the project (step by step)

1) Install dependencies  
```bash
npm install
```

2) Copy env and configure secrets/DB/Redis/Providers  
```bash
cp .env.example .env
# edit .env with DATABASE_URL, JWT_*, REDIS_*, ONESIGNAL_*, FCM_*
```

3) Generate Prisma client  
```bash
npm run prisma:generate
```

4) Run migrations  
```bash
npm run prisma:migrate
```

5) Seed master data (roles/standards/boards)  
```bash
npm run prisma:seed
```

6) Start the API server  
```bash
npm run dev
# server at http://localhost:3000
# Swagger UI: http://localhost:3000/api/docs
```

7) Start the notification worker (separate terminal)  
```bash
npm run build   # or use ts-node in dev
node dist/modules/notification/notification.worker.js
# or: npx ts-node src/modules/notification/notification.worker.ts
```

## Notes
- Redis is required for the notification queue (Bull). Set REDIS_* in .env.  
- OneSignal/FCM keys are optional; if missing, sends are skipped but APIs continue.  
- Uploads are served from `/uploads` (logo upload in school setup).  
- All endpoints are documented in Swagger at `/api/docs`.  
