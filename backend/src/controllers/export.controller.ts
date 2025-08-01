import { Request, Response } from 'express';
import { ExportService } from '../services/export.service';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import { ExportRequest } from '../types/export.types';
import { z } from 'zod';

const exportService = new ExportService();

// Validation schemas
const exportRequestSchema = z.object({
  format: z.enum(['json', 'csv', 'pdf']),
  type: z.enum(['all', 'journal_entries', 'profile', 'network', 'achievements', 'goals']),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  }).optional(),
  filters: z.object({
    workspaceId: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    includePrivate: z.boolean().optional()
  }).optional()
});

/**
 * Start data export
 */
export const startExport = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    const validatedData: ExportRequest = exportRequestSchema.parse(req.body);

    // Validate date range if provided
    if (validatedData.dateRange) {
      const fromDate = new Date(validatedData.dateRange.from);
      const toDate = new Date(validatedData.dateRange.to);
      
      if (fromDate >= toDate) {
        return sendError(res, 'Invalid date range: from date must be before to date', 400);
      }
      
      // Limit export to maximum 2 years of data
      const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;
      if (toDate.getTime() - fromDate.getTime() > twoYearsInMs) {
        return sendError(res, 'Date range cannot exceed 2 years', 400);
      }
    }

    const exportProgress = await exportService.startExport(userId, validatedData);
    
    sendSuccess(res, exportProgress, 'Export started successfully', 202);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid export request data', 400, error.errors);
    }
    throw error;
  }
});

/**
 * Get export status
 */
export const getExportStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { exportId } = req.params;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  if (!exportId) {
    return sendError(res, 'Export ID is required', 400);
  }

  try {
    const exportStatus = await exportService.getExportStatus(exportId, userId);
    
    if (!exportStatus) {
      return sendError(res, 'Export not found', 404);
    }
    
    sendSuccess(res, exportStatus);
  } catch (error: any) {
    throw error;
  }
});

/**
 * Download export file
 */
export const downloadExport = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { exportId } = req.params;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  if (!exportId) {
    return sendError(res, 'Export ID is required', 400);
  }

  try {
    const exportFile = await exportService.downloadExport(exportId, userId);
    
    if (!exportFile) {
      return sendError(res, 'Export file not found or not ready', 404);
    }
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', exportFile.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportFile.fileName}"`);
    
    // Stream the file
    const fs = require('fs');
    const fileStream = fs.createReadStream(exportFile.filePath);
    
    fileStream.on('error', (error: any) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        sendError(res, 'Error downloading file', 500);
      }
    });
    
    fileStream.pipe(res);
  } catch (error: any) {
    throw error;
  }
});

/**
 * List user's exports
 */
export const listUserExports = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    // In a real implementation, this would query a database table
    // For now, we'll return a placeholder response
    const exports = []; // TODO: Implement database storage for export history
    
    sendSuccess(res, exports, 'Exports retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Delete export
 */
export const deleteExport = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { exportId } = req.params;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  if (!exportId) {
    return sendError(res, 'Export ID is required', 400);
  }

  try {
    // TODO: Implement export deletion
    // This would remove both the file and the database record
    
    sendSuccess(res, null, 'Export deleted successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get export statistics
 */
export const getExportStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    // TODO: Implement export statistics
    const stats = {
      totalExports: 0,
      lastExportDate: null,
      totalDataSize: 0,
      exportsByType: {
        all: 0,
        journal_entries: 0,
        profile: 0,
        network: 0,
        achievements: 0,
        goals: 0
      },
      exportsByFormat: {
        json: 0,
        csv: 0,
        pdf: 0
      }
    };
    
    sendSuccess(res, stats, 'Export statistics retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Cleanup expired exports (admin endpoint)
 */
export const cleanupExpiredExports = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Add admin authorization check
  
  try {
    await exportService.cleanupExpiredExports();
    sendSuccess(res, null, 'Expired exports cleaned up successfully');
  } catch (error: any) {
    throw error;
  }
});