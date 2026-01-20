import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import authRoutes from './modules/auth/auth.route';
import schoolRoutes from './modules/school/school.route';
import userRoutes from './modules/user/user.route';
import attendanceRoutes from './modules/attendance/attendance.route';
import notificationRoutes from './modules/notification/notification.route';
import studentRoutes from './modules/students/student.routes';
import classRoutes from './modules/classes/class.routes';
import { errorHandler } from './middlewares/errorHandler';
import swaggerDocument from './swagger/openapi.json';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/user', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = env.port;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${env.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
});

export default app;

