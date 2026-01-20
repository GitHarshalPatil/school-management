import { Router } from 'express';
import { loginController, refreshTokenController } from './auth.controller';
import { errorHandler } from '../../middlewares/errorHandler';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get access + refresh tokens
 * @access  Public
 */
router.post('/login', loginController);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', refreshTokenController);

// Apply error handler
router.use(errorHandler);

export default router;

