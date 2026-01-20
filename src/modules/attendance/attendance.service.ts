import { PrismaClient } from '@prisma/client';
import {
  ConflictError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../../utils/errors';
import {
  MarkAttendanceInput,
  ViewAttendanceQuery,
  EditAttendanceInput,
} from './attendance.schema';

const prisma = new PrismaClient();

export interface AttendanceRecord {
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string;
}

export interface AttendanceData {
  id: string;
  classId: string;
  className: string;
  date: string;
  markedBy: string;
  markedByName?: string;
  totalPresent: number;
  totalAbsent: number;
  notes: string | null;
  records: Array<{
    id: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    status: string;
    remarks: string | null;
  }>;
}

/**
 * Check if teacher is assigned to class
 */
async function isTeacherAssignedToClass(
  teacherUserId: string,
  classId: string
): Promise<boolean> {
  const assignment = await prisma.teacherClass.findFirst({
    where: {
      classId,
      teacher: {
        userId: teacherUserId,
      },
    },
  });

  return !!assignment;
}

/**
 * Validate students belong to class
 */
async function validateStudentsInClass(
  studentIds: string[],
  classId: string,
  schoolId: string
): Promise<void> {
  const students = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      classId,
      schoolId,
    },
  });

  if (students.length !== studentIds.length) {
    const foundStudentIds = students.map((s) => s.id);
    const missingStudents = studentIds.filter((id) => !foundStudentIds.includes(id));
    throw new ValidationError(`Students not found in class: ${missingStudents.join(', ')}`);
  }
}

/**
 * Mark attendance for a class
 * Teacher only - must be assigned to the class
 */
export async function markAttendance(
  schoolId: string,
  teacherUserId: string,
  input: MarkAttendanceInput
): Promise<AttendanceData> {
  // Validate class exists and belongs to school
  const classRecord = await prisma.class.findFirst({
    where: {
      id: input.classId,
      schoolId,
    },
    include: {
      standard: true,
      board: true,
    },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  // Check if teacher is assigned to this class
  const isAssigned = await isTeacherAssignedToClass(teacherUserId, input.classId);
  if (!isAssigned) {
    throw new ForbiddenError('You are not assigned to this class');
  }

  // Validate date is not in the future
  const attendanceDate = new Date(input.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  attendanceDate.setHours(0, 0, 0, 0);

  if (attendanceDate > today) {
    throw new ValidationError('Cannot mark attendance for future dates');
  }

  // Check if attendance already exists for this date
  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      classId_date: {
        classId: input.classId,
        date: attendanceDate,
      },
    },
  });

  if (existingAttendance) {
    throw new ConflictError('Attendance already marked for this date');
  }

  // Validate all students belong to this class
  const studentIds = input.attendanceRecords.map((r) => r.studentId);
  await validateStudentsInClass(studentIds, input.classId, schoolId);

  // Calculate totals
  const totalPresent = input.attendanceRecords.filter(
    (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EXCUSED'
  ).length;
  const totalAbsent = input.attendanceRecords.filter((r) => r.status === 'ABSENT').length;

  // Create attendance and records in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create attendance
    const attendance = await tx.attendance.create({
      data: {
        classId: input.classId,
        date: attendanceDate,
        markedBy: teacherUserId,
        totalPresent,
        totalAbsent,
        notes: input.notes,
      },
    });

    // Create attendance records
    await Promise.all(
      input.attendanceRecords.map((record) =>
        tx.attendanceRecord.create({
          data: {
            attendanceId: attendance.id,
            studentId: record.studentId,
            status: record.status,
            remarks: record.remarks,
          },
        })
      )
    );

    return attendance;
  });

  // Fetch complete attendance data
  return getAttendanceById(result.id, schoolId);
}

/**
 * Get attendance by ID
 */
async function getAttendanceById(attendanceId: string, schoolId: string): Promise<AttendanceData> {
  const attendance = await prisma.attendance.findFirst({
    where: {
      id: attendanceId,
      class: {
        schoolId,
      },
    },
    include: {
      class: {
        include: {
          standard: true,
          board: true,
        },
      },
      attendanceRecords: {
        include: {
          student: true,
        },
        orderBy: {
          student: {
            firstName: 'asc',
          },
        },
      },
    },
  });

  if (!attendance) {
    throw new NotFoundError('Attendance not found');
  }

  // Get marked by user name
  const markedByUser = await prisma.user.findUnique({
    where: { id: attendance.markedBy },
    include: {
      teacherProfile: true,
    },
  });

  const markedByName = markedByUser?.teacherProfile
    ? `${markedByUser.teacherProfile.firstName} ${markedByUser.teacherProfile.lastName}`
    : undefined;

  return {
    id: attendance.id,
    classId: attendance.classId,
    className: attendance.class.name,
    date: attendance.date.toISOString().split('T')[0],
    markedBy: attendance.markedBy,
    markedByName,
    totalPresent: attendance.totalPresent,
    totalAbsent: attendance.totalAbsent,
    notes: attendance.notes,
    records: attendance.attendanceRecords.map((ar) => ({
      id: ar.id,
      studentId: ar.studentId,
      studentName: `${ar.student.firstName} ${ar.student.lastName}`,
      admissionNumber: ar.student.admissionNumber,
      status: ar.status,
      remarks: ar.remarks,
    })),
  };
}

/**
 * View attendance for a class
 * Teacher: own classes only
 * Admin: all classes
 * Parent: own child only
 */
export async function viewAttendance(
  schoolId: string,
  classId: string,
  query: ViewAttendanceQuery,
  requesterUserId: string,
  requesterRole: string
): Promise<AttendanceData[]> {
  // Validate class exists and belongs to school
  const classRecord = await prisma.class.findFirst({
    where: {
      id: classId,
      schoolId,
    },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  // Role-based access control
  if (requesterRole === 'TEACHER') {
    // Teacher can only view their assigned classes
    const isAssigned = await isTeacherAssignedToClass(requesterUserId, classId);
    if (!isAssigned) {
      throw new ForbiddenError('You are not assigned to this class');
    }
  } else if (requesterRole === 'PARENT') {
    // Parent can only view if their child is in this class
    const parentProfile = await prisma.parentProfile.findFirst({
      where: {
        userId: requesterUserId,
        students: {
          some: {
            classId,
          },
        },
      },
    });

    if (!parentProfile) {
      throw new ForbiddenError('You do not have access to this class');
    }
  }
  // SCHOOL_ADMIN can access all classes

  // Build date filter
  const dateFilter: any = {};
  if (query.date) {
    dateFilter.date = new Date(query.date);
  } else if (query.startDate && query.endDate) {
    dateFilter.date = {
      gte: new Date(query.startDate),
      lte: new Date(query.endDate),
    };
  }

  // Fetch attendance records
  const attendances = await prisma.attendance.findMany({
    where: {
      classId,
      ...dateFilter,
    },
    include: {
      attendanceRecords: {
        include: {
          student: true,
        },
        orderBy: {
          student: {
            firstName: 'asc',
          },
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  // If parent, filter to only show their child's records
  if (requesterRole === 'PARENT') {
    const parentProfile = await prisma.parentProfile.findFirst({
      where: {
        userId: requesterUserId,
      },
      include: {
        students: true,
      },
    });

    if (parentProfile) {
      const childIds = parentProfile.students.map((s) => s.id);
      return attendances
        .map((attendance) => ({
          ...attendance,
          attendanceRecords: attendance.attendanceRecords.filter((ar) =>
            childIds.includes(ar.studentId)
          ),
        }))
        .filter((attendance) => attendance.attendanceRecords.length > 0)
        .map((attendance) => ({
          id: attendance.id,
          classId: attendance.classId,
          className: classRecord.name,
          date: attendance.date.toISOString().split('T')[0],
          markedBy: attendance.markedBy,
          totalPresent: attendance.attendanceRecords.length,
          totalAbsent: 0,
          notes: attendance.notes,
          records: attendance.attendanceRecords.map((ar) => ({
            id: ar.id,
            studentId: ar.studentId,
            studentName: `${ar.student.firstName} ${ar.student.lastName}`,
            admissionNumber: ar.student.admissionNumber,
            status: ar.status,
            remarks: ar.remarks,
          })),
        }));
    }
  }

  // Get marked by user names
  const markedByUserIds = [...new Set(attendances.map((a) => a.markedBy))];
  const markedByUsers = await prisma.user.findMany({
    where: {
      id: { in: markedByUserIds },
    },
    include: {
      teacherProfile: true,
    },
  });

  const userMap = new Map(
    markedByUsers.map((u) => [
      u.id,
      u.teacherProfile
        ? `${u.teacherProfile.firstName} ${u.teacherProfile.lastName}`
        : undefined,
    ])
  );

  return attendances.map((attendance) => ({
    id: attendance.id,
    classId: attendance.classId,
    className: classRecord.name,
    date: attendance.date.toISOString().split('T')[0],
    markedBy: attendance.markedBy,
    markedByName: userMap.get(attendance.markedBy),
    totalPresent: attendance.totalPresent,
    totalAbsent: attendance.totalAbsent,
    notes: attendance.notes,
    records: attendance.attendanceRecords.map((ar) => ({
      id: ar.id,
      studentId: ar.studentId,
      studentName: `${ar.student.firstName} ${ar.student.lastName}`,
      admissionNumber: ar.student.admissionNumber,
      status: ar.status,
      remarks: ar.remarks,
    })),
  }));
}

/**
 * Edit attendance
 * Admin only
 */
export async function editAttendance(
  schoolId: string,
  classId: string,
  date: string,
  input: EditAttendanceInput
): Promise<AttendanceData> {
  // Validate class exists and belongs to school
  const classRecord = await prisma.class.findFirst({
    where: {
      id: classId,
      schoolId,
    },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Find existing attendance
  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      classId_date: {
        classId,
        date: attendanceDate,
      },
    },
  });

  if (!existingAttendance) {
    throw new NotFoundError('Attendance not found for this date');
  }

  // Validate all students belong to this class
  const studentIds = input.attendanceRecords.map((r) => r.studentId);
  await validateStudentsInClass(studentIds, classId, schoolId);

  // Calculate new totals
  const totalPresent = input.attendanceRecords.filter(
    (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EXCUSED'
  ).length;
  const totalAbsent = input.attendanceRecords.filter((r) => r.status === 'ABSENT').length;

  // Update in transaction
  await prisma.$transaction(async (tx) => {
    // Update attendance
    await tx.attendance.update({
      where: { id: existingAttendance.id },
      data: {
        totalPresent,
        totalAbsent,
        notes: input.notes,
      },
    });

    // Delete existing records
    await tx.attendanceRecord.deleteMany({
      where: { attendanceId: existingAttendance.id },
    });

    // Create new records
    await Promise.all(
      input.attendanceRecords.map((record) =>
        tx.attendanceRecord.create({
          data: {
            attendanceId: existingAttendance.id,
            studentId: record.studentId,
            status: record.status,
            remarks: record.remarks,
          },
        })
      )
    );
  });

  // Return updated attendance
  return getAttendanceById(existingAttendance.id, schoolId);
}

