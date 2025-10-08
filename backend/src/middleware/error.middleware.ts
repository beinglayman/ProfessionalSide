import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', {
    message: (error as any).message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch ((error as any).code) {
      case 'P2002':
        res.status(409).json({
          success: false,
          error: 'A record with this data already exists',
          details: error.meta
        });
        return;
      
      case 'P2025':
        res.status(404).json({
          success: false,
          error: 'Record not found',
          details: error.meta
        });
        return;
      
      case 'P2003':
        res.status(400).json({
          success: false,
          error: 'Foreign key constraint failed',
          details: error.meta
        });
        return;
      
      default:
        // Temporarily include error details in production for debugging
        console.error('🔍 UNKNOWN PRISMA ERROR:', {
          code: (error as any).code,
          message: (error as any).message,
          meta: error.meta,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        res.status(400).json({
          success: false,
          error: 'Database operation failed',
          details: (error as any).message, // Temporarily include in production
          errorCode: (error as any).code
        });
        return;
    }
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('🔍 PRISMA VALIDATION ERROR:', {
      message: (error as any).message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(400).json({
      success: false,
      error: 'Invalid data provided',
      details: (error as any).message // Temporarily include in production
    });
    return;
  }

  // Other Prisma client errors - use defensive checking
  if ((error as any).name && ((error as any).name.includes('PrismaClient') || (error as any).code)) {
    console.error('🔍 PRISMA CONNECTION ERROR:', {
      name: (error as any).name,
      message: (error as any).message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      errorCode: error.errorCode || (error as any).code || 'unknown'
    });
    res.status(500).json({
      success: false,
      error: 'Database connection error',
      details: (error as any).message // Temporarily include in production
    });
    return;
  }

  // JWT errors
  if ((error as any).name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
    return;
  }

  if ((error as any).name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired'
    });
    return;
  }

  // Validation errors
  if ((error as any).name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details || (error as any).message
    });
    return;
  }

  // Zod validation errors
  if ((error as any).name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.errors
    });
    return;
  }

  // File upload errors
  if ((error as any).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: 'File too large'
    });
    return;
  }

  // Default error
  const statusCode = error.statusCode || error.status || 500;
  const message = (error as any).message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error
    })
  });
};