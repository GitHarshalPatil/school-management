import { z } from 'zod';

/**
 * Attendance status enum
 */
export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
} as const;

/**
 * Mark attendance request validation schema
 */
export const markAttendanceSchema = z.object({
  body: z.object({
    classId: z.string().uuid('Invalid class ID format'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD'),
    attendanceRecords: z
      .array(
        z.object({
          studentId: z.string().uuid('Invalid student ID format'),
          status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], {
            errorMap: () => ({ message: 'Status must be PRESENT, ABSENT, LATE, or EXCUSED' }),
          }),
          remarks: z.string().max(255, 'Remarks too long').optional(),
        })
      )
      .min(1, 'At least one attendance record is required'),
    notes: z.string().max(1000, 'Notes too long').optional(),
  }),
});

/**
 * View attendance by class params validation schema
 */
export const viewAttendanceParamsSchema = z.object({
  params: z.object({
    classId: z.string().uuid('Invalid class ID format'),
  }),
  query: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD')
      .optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in format YYYY-MM-DD')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in format YYYY-MM-DD')
      .optional(),
  }),
});

/**
 * Edit attendance request validation schema
 */
export const editAttendanceSchema = z.object({
  params: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD'),
    classId: z.string().uuid('Invalid class ID format'),
  }),
  body: z.object({
    attendanceRecords: z
      .array(
        z.object({
          studentId: z.string().uuid('Invalid student ID format'),
          status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], {
            errorMap: () => ({ message: 'Status must be PRESENT, ABSENT, LATE, or EXCUSED' }),
          }),
          remarks: z.string().max(255, 'Remarks too long').optional(),
        })
      )
      .min(1, 'At least one attendance record is required'),
    notes: z.string().max(1000, 'Notes too long').optional(),
  }),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>['body'];
export type ViewAttendanceParams = z.infer<typeof viewAttendanceParamsSchema>['params'];
export type ViewAttendanceQuery = z.infer<typeof viewAttendanceParamsSchema>['query'];
export type EditAttendanceInput = z.infer<typeof editAttendanceSchema>['body'];
export type EditAttendanceParams = z.infer<typeof editAttendanceSchema>['params'];

