import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare a password with a hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate JWT access token
 */
export const generateAccessToken = (userId: string, email: string): string => {
  const payload: JwtPayload = {
    userId,
    email,
    type: 'access'
  };
  
  return (jwt.sign as any)(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'inchronicle-api',
    audience: 'inchronicle-app'
  });
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (userId: string, email: string): string => {
  const payload: JwtPayload = {
    userId,
    email,
    type: 'refresh'
  };
  
  return (jwt.sign as any)(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'inchronicle-api',
    audience: 'inchronicle-app'
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'inchronicle-api',
      audience: 'inchronicle-app'
    }) as JwtPayload;
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate token pair (access + refresh)
 */
export const generateTokenPair = (userId: string, email: string) => {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, email)
  };
};