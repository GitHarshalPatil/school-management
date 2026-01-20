import { z } from 'zod';

/**
 * Create student request validation schema
 */
export const createStudentSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name is too long'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name is too long'),
    rollNumber: z
      .string()
      .min(1, 'Roll number is required')
      .max(50, 'Roll number is too long'),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
      errorMap: () => ({ message: 'Gender must be MALE, FEMALE, or OTHER' }),
    }),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
      .transform((str) => new Date(str)),
    className: z
      .string()
      .min(1, 'Class is required')
      .max(50, 'Class name is too long'),
    division: z
      .string()
      .min(1, 'Division is required')
      .max(10, 'Division is too long'),
    parentName: z
      .string()
      .min(1, 'Parent name is required')
      .max(100, 'Parent name is too long'),
    parentMobile: z
      .string()
      .regex(/^\d{10}$/, 'Parent mobile must be exactly 10 digits'),
    parentEmail: z
      .string()
      .email('Invalid parent email format')
      .min(1, 'Parent email is required'),
  }),
});

/**
 * Get students query validation schema
 */
export const getStudentsQuerySchema = z.object({
  query: z.object({
    classId: z.string().uuid('Invalid class ID format').optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().min(1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .pipe(z.number().int().min(1).max(100)),
  }),
});

/**
 * Update student request validation schema
 */
export const updateStudentSchema = z.object({
  params: z.object({
    studentId: z.string().uuid('Invalid student ID format'),
  }),
  body: z.object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name is too long')
      .optional(),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name is too long')
      .optional(),
    rollNumber: z
      .string()
      .min(1, 'Roll number is required')
      .max(50, 'Roll number is too long')
      .optional(),
    gender: z
      .enum(['MALE', 'FEMALE', 'OTHER'], {
        errorMap: () => ({ message: 'Gender must be MALE, FEMALE, or OTHER' }),
      })
      .optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
      .transform((str) => new Date(str))
      .optional(),
    className: z
      .string()
      .min(1, 'Class is required')
      .max(50, 'Class name is too long')
      .optional(),
    division: z
      .string()
      .min(1, 'Division is required')
      .max(10, 'Division is too long')
      .optional(),
    parentName: z
      .string()
      .min(1, 'Parent name is required')
      .max(100, 'Parent name is too long')
      .optional(),
    parentMobile: z
      .string()
      .regex(/^\d{10}$/, 'Parent mobile must be exactly 10 digits')
      .optional(),
    parentEmail: z
      .string()
      .email('Invalid parent email format')
      .optional(),
  }),
});

/**
 * Delete student params validation schema
 */
export const deleteStudentSchema = z.object({
  params: z.object({
    studentId: z.string().uuid('Invalid student ID format'),
  }),
});

/**
 * Bulk import verify request validation schema
 */
export const verifyImportSchema = z.object({
  body: z.object({
    // File will be handled by multer middleware
  }),
});

/**
 * Verify rows request validation schema
 */
export const verifyRowsSchema = z.object({
  body: z.object({
    rows: z.array(
      z.object({
        rowNumber: z.number().int().positive('Row number must be positive'),
        firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
        lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
        rollNumber: z.string().min(1, 'Roll number is required').max(50, 'Roll number is too long'),
        gender: z.string().min(1, 'Gender is required'),
        dateOfBirth: z.string().min(1, 'Date of birth is required'),
        className: z.string().min(1, 'Class is required').max(50, 'Class name is too long'),
        division: z.string().min(1, 'Division is required').max(10, 'Division is too long'),
        parentName: z.string().min(1, 'Parent name is required').max(100, 'Parent name is too long'),
        parentMobile: z.string().min(1, 'Parent mobile is required'),
        parentEmail: z.string().min(1, 'Parent email is required'),
      })
    ).min(1, 'At least one row is required'),
  }),
});

/**
 * Bulk import request validation schema
 */
export const importStudentsSchema = z.object({
  body: z.object({
    verifiedRows: z
      .array(
        z.object({
          firstName: z.string(),
          lastName: z.string(),
          rollNumber: z.string(),
          gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
          dateOfBirth: z.string(),
          classId: z.string().uuid(),
          parentName: z.string(),
          parentMobile: z.string(),
          parentEmail: z.string().email(),
        })
      )
      .min(1, 'At least one student is required'),
  }),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>['body'];
export type GetStudentsQuery = z.infer<typeof getStudentsQuerySchema>['query'];
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>['body'];
export type UpdateStudentParams = z.infer<typeof updateStudentSchema>['params'];
export type DeleteStudentParams = z.infer<typeof deleteStudentSchema>['params'];
export type ImportStudentsInput = z.infer<typeof importStudentsSchema>['body'];
