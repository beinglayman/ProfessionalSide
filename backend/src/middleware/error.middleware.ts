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
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
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
          code: error.code,
          message: error.message,
          meta: error.meta,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        res.status(400).json({
          success: false,
          error: 'Database operation failed',
          details: error.message, // Temporarily include in production
          errorCode: error.code
        });
        return;
    }
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('🔍 PRISMA VALIDATION ERROR:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(400).json({
      success: false,
      error: 'Invalid data provided',
      details: error.message // Temporarily include in production
    });
    return;
  }

  // Other Prisma client errors
  if (error instanceof Prisma.PrismaClientInitializationError || 
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error('🔍 PRISMA CONNECTION ERROR:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      errorCode: error.errorCode || 'unknown'
    });
    res.status(500).json({
      success: false,
      error: 'Database connection error',
      details: error.message // Temporarily include in production
    });
    return;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired'
    });
    return;
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details || error.message
    });
    return;
  }

  // Zod validation errors
  if (error.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.errors
    });
    return;
  }

  // File upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: 'File too large'
    });
    return;
  }

  // Default error
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error
    })
  });
};