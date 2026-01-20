import { z } from 'zod';

/**
 * Create teacher request validation schema
 */
export const createTeacherSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name is too long'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name is too long'),
    email: z
      .string()
      .email('Invalid email format')
      .min(1, 'Email is required'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password is too long'),
    phone: z
      .string()
      .max(20, 'Phone number is too long')
      .optional(),
    employeeId: z
      .string()
      .max(50, 'Employee ID is too long')
      .optional(),
    classIds: z
      .array(z.string().uuid('Invalid class ID format'))
      .optional(),
  }),
});

/**
 * Assign teacher to class request validation schema
 */
export const assignTeacherToClassSchema = z.object({
  body: z.object({
    teacherId: z.string().uuid('Invalid teacher ID format'),
    classIds: z
      .array(z.string().uuid('Invalid class ID format'))
      .min(1, 'At least one class ID is required'),
  }),
});

/**
 * Get parent by ID params validation schema
 */
export const getParentParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid parent ID format'),
  }),
});

/**
 * Update teacher status request validation schema
 */
export const updateTeacherStatusSchema = z.object({
  body: z.object({
    teacherIds: z
      .array(z.string().uuid('Invalid teacher ID format'))
      .min(1, 'At least one teacher ID is required'),
    isActive: z.boolean(),
  }),
});

/**
 * Update teacher request validation schema
 */
export const updateTeacherSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher ID format'),
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
    email: z
      .string()
      .email('Invalid email format')
      .optional(),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password is too long')
      .optional(),
    phone: z
      .string()
      .max(20, 'Phone number is too long')
      .optional()
      .nullable(),
    employeeId: z
      .string()
      .max(50, 'Employee ID is too long')
      .optional()
      .nullable(),
    classIds: z
      .array(z.string().uuid('Invalid class ID format'))
      .optional(),
  }),
});

/**
 * Delete teacher request validation schema
 */
export const deleteTeacherSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher ID format'),
  }),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>['body'];
export type AssignTeacherToClassInput = z.infer<typeof assignTeacherToClassSchema>['body'];
export type GetParentParams = z.infer<typeof getParentParamsSchema>['params'];
export type UpdateTeacherStatusInput = z.infer<typeof updateTeacherStatusSchema>['body'];
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>['body'];
export type UpdateTeacherParams = z.infer<typeof updateTeacherSchema>['params'];
export type DeleteTeacherParams = z.infer<typeof deleteTeacherSchema>['params'];

