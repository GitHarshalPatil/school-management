import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateTokenPair, JWTPayload, verifyRefreshToken } from '../../utils/jwt';
import { UnauthorizedError } from '../../utils/errors';

const prisma = new PrismaClient();

export interface LoginResult {
  user: {
    id: string;
    email: string;
    role: string;
    roleName: string;
    isActive: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshTokenResult {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Authenticate user and generate tokens
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  // Find user with role
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is inactive');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const payload: JWTPayload = {
    userId: user.id,
    role: user.role.name,
    email: user.email,
  };

  const tokens = generateTokenPair(payload);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role.name,
      roleName: user.role.name,
      isActive: user.isActive,
    },
    tokens,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<RefreshTokenResult> {
  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    // Generate new token pair
    const newPayload: JWTPayload = {
      userId: user.id,
      role: user.role.name,
      email: user.email,
    };

    const tokens = generateTokenPair(newPayload);

    return { tokens };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid refresh token');
  }
}

/**
 * Hash password utility (for use in other modules)
 */
export async function hashUserPassword(password: string): Promise<string> {
  return hashPassword(password);
}

