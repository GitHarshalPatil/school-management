import { z } from 'zod';

/**
 * Standard-Board pair validation schema
 */
const standardBoardSchema = z.object({
  standard: z.string().min(1, 'Standard name is required'),
  board: z.string().min(1, 'Board name is required'),
});

/**
 * School setup request validation schema
 */
export const schoolSetupSchema = z.object({
  body: z.object({
    schoolName: z
      .string()
      .min(1, 'School name is required')
      .max(255, 'School name is too long'),
    address: z.string().optional(),
    contactNumber: z
      .string()
      .min(10, 'Contact number must be at least 10 digits')
      .max(20, 'Contact number is too long')
      .optional(),
    schoolEmail: z
      .string()
      .email('Invalid email format')
      .optional(),
    adminName: z
      .string()
      .min(1, 'Admin name is required')
      .max(200, 'Admin name is too long'),
    adminEmail: z
      .string()
      .email('Invalid email format')
      .min(1, 'Admin email is required'),
    adminPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password is too long'),
    // Can be sent either as JSON string (from multipart/form-data)
    // or as a parsed array. We normalize it to an array here.
    standardsWithBoards: z.preprocess((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return parsed;
        } catch {
          return value;
        }
      }
      return value;
    },
    z
      .array(standardBoardSchema)
      .min(1, 'At least one standard-board pair is required')),
    academicYearName: z
      .string()
      .min(1, 'Academic year name is required')
      .max(100, 'Academic year name is too long')
      .regex(/^\d{4}-\d{2,4}$/, 'Academic year must be in format YYYY-YY or YYYY-YYYY (e.g., 2024-25 or 2024-2025)'),
    academicYearStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in format YYYY-MM-DD'),
    academicYearEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in format YYYY-MM-DD'),
  }),
});

export type SchoolSetupInput = z.infer<typeof schoolSetupSchema>['body'];

