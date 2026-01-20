import { z } from 'zod';

/**
 * Create class request validation schema
 */
export const createClassSchema = z.object({
  body: z.object({
    standardId: z.string().uuid('Invalid standard ID format'),
    boardId: z.string().uuid('Invalid board ID format'),
    section: z
      .string()
      .min(1, 'Section is required')
      .max(10, 'Section is too long')
      .regex(/^[A-Z]$/, 'Section must be a single uppercase letter (A-Z)'),
    capacity: z
      .number()
      .int('Capacity must be an integer')
      .min(1, 'Capacity must be at least 1')
      .max(200, 'Capacity cannot exceed 200')
      .optional()
      .default(60),
  }),
});

/**
 * Get classes query validation schema
 */
export const getClassesSchema = z.object({
  query: z.object({
    academicYearId: z.string().uuid('Invalid academic year ID format').optional(),
  }),
});

/**
 * Get standards and boards schema (for dropdowns)
 */
export const getStandardsBoardsSchema = z.object({
  query: z.object({}).optional(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>['body'];
export type GetClassesQuery = z.infer<typeof getClassesSchema>['query'];
