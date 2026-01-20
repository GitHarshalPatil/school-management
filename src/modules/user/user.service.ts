import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../utils/password';
import {
  ConflictError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../../utils/errors';

const prisma = new PrismaClient();

export interface CreateTeacherInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  employeeId?: string;
  classIds?: string[];
}

export interface TeacherWithClasses {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  email: string;
  phone: string | null;
  password: string | null; // Plain text password
  isActive: boolean;
  classes: Array<{
    id: string;
    name: string;
    section: string;
    standard: string;
    board: string;
  }>;
}

export interface AssignTeacherToClassInput {
  teacherId: string;
  classIds: string[];
}

export interface UpdateTeacherStatusInput {
  teacherIds: string[];
  isActive: boolean;
}

export interface UpdateTeacherInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  employeeId?: string | null;
  classIds?: string[];
}

/**
 * Create a new teacher
 */
export async function createTeacher(
  schoolId: string,
  input: CreateTeacherInput
): Promise<TeacherWithClasses> {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new ConflictError('Email already exists');
  }

  // Check if employeeId already exists (if provided)
  if (input.employeeId) {
    const existingEmployee = await prisma.teacherProfile.findUnique({
      where: { employeeId: input.employeeId },
    });

    if (existingEmployee) {
      throw new ConflictError('Employee ID already exists');
    }
  }

  // Get TEACHER role
  const teacherRole = await prisma.role.findUnique({
    where: { name: 'TEACHER' },
  });

  if (!teacherRole) {
    throw new NotFoundError('TEACHER role not found. Please run database seed first.');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Validate classes if provided
  if (input.classIds && input.classIds.length > 0) {
    const classes = await prisma.class.findMany({
      where: {
        id: { in: input.classIds },
        schoolId,
      },
    });

    if (classes.length !== input.classIds.length) {
      const foundClassIds = classes.map((c) => c.id);
      const missingClasses = input.classIds.filter((id) => !foundClassIds.includes(id));
      throw new NotFoundError(`Classes not found: ${missingClasses.join(', ')}`);
    }
  }

  // Create teacher in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create user
    const user = await tx.user.create({
      data: {
        schoolId,
        roleId: teacherRole.id,
        email: input.email,
        passwordHash,
        phone: input.phone,
        isActive: true,
      },
    });

    // 2. Create teacher profile (store plain text password for credentials)
    const teacherProfile = await tx.teacherProfile.create({
      data: {
        userId: user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        employeeId: input.employeeId,
        password: input.password, // Store plain text password
      },
    });

    // 3. Assign to classes if provided
    if (input.classIds && input.classIds.length > 0) {
      await Promise.all(
        input.classIds.map((classId) =>
          tx.teacherClass.create({
            data: {
              teacherId: teacherProfile.id,
              classId,
            },
          })
        )
      );
    }

    return { user, teacherProfile };
  });

  // Fetch created teacher with classes
  const teacher = await getTeacherById(result.teacherProfile.id, schoolId);
  if (!teacher) {
    throw new Error('Failed to retrieve created teacher');
  }

  return teacher;
}

/**
 * Get teacher by ID with classes
 */
export async function getTeacherById(
  teacherId: string,
  schoolId: string
): Promise<TeacherWithClasses | null> {
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: {
      id: teacherId,
      user: {
        schoolId,
      },
    },
    include: {
      user: true,
      teacherClasses: {
        include: {
          class: {
            include: {
              standard: true,
              board: true,
            },
          },
        },
      },
    },
  });

  if (!teacherProfile) {
    return null;
  }

  return {
    id: teacherProfile.id,
    userId: teacherProfile.userId,
    firstName: teacherProfile.firstName,
    lastName: teacherProfile.lastName,
    employeeId: teacherProfile.employeeId,
    email: teacherProfile.user.email,
    phone: teacherProfile.user.phone,
    password: teacherProfile.password, // Include plain text password
    isActive: teacherProfile.user.isActive,
    classes: teacherProfile.teacherClasses.map((tc) => ({
      id: tc.class.id,
      name: tc.class.name,
      section: tc.class.section,
      standard: tc.class.standard.name,
      board: tc.class.board.name,
    })),
  };
}

/**
 * List all teachers in school
 */
export async function listTeachers(schoolId: string): Promise<TeacherWithClasses[]> {
  const teacherProfiles = await prisma.teacherProfile.findMany({
    where: {
      user: {
        schoolId,
        role: {
          name: 'TEACHER',
        },
      },
    },
    include: {
      user: true,
      teacherClasses: {
        include: {
          class: {
            include: {
              standard: true,
              board: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return teacherProfiles.map((tp) => ({
    id: tp.id,
    userId: tp.userId,
    firstName: tp.firstName,
    lastName: tp.lastName,
    employeeId: tp.employeeId,
    email: tp.user.email,
    phone: tp.user.phone,
    password: tp.password, // Include plain text password
    isActive: tp.user.isActive,
    classes: tp.teacherClasses.map((tc) => ({
      id: tc.class.id,
      name: tc.class.name,
      section: tc.class.section,
      standard: tc.class.standard.name,
      board: tc.class.board.name,
    })),
  }));
}

/**
 * Assign teacher to classes
 */
export async function assignTeacherToClass(
  schoolId: string,
  input: AssignTeacherToClassInput
): Promise<TeacherWithClasses> {
  // Verify teacher exists and belongs to school
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: {
      id: input.teacherId,
      user: {
        schoolId,
        role: {
          name: 'TEACHER',
        },
      },
    },
  });

  if (!teacherProfile) {
    throw new NotFoundError('Teacher not found');
  }

  // Validate classes exist and belong to school
  const classes = await prisma.class.findMany({
    where: {
      id: { in: input.classIds },
      schoolId,
    },
  });

  if (classes.length !== input.classIds.length) {
    const foundClassIds = classes.map((c) => c.id);
    const missingClasses = input.classIds.filter((id) => !foundClassIds.includes(id));
    throw new NotFoundError(`Classes not found: ${missingClasses.join(', ')}`);
  }

  // Get existing assignments
  const existingAssignments = await prisma.teacherClass.findMany({
    where: {
      teacherId: input.teacherId,
      classId: { in: input.classIds },
    },
  });

  const existingClassIds = existingAssignments.map((ea) => ea.classId);
  const newClassIds = input.classIds.filter((id) => !existingClassIds.includes(id));

  if (newClassIds.length === 0) {
    throw new ValidationError('Teacher is already assigned to all specified classes');
  }

  // Create new assignments
  await Promise.all(
    newClassIds.map((classId) =>
      prisma.teacherClass.create({
        data: {
          teacherId: input.teacherId,
          classId,
        },
      })
    )
  );

  // Return updated teacher
  const teacher = await getTeacherById(input.teacherId, schoolId);
  if (!teacher) {
    throw new Error('Failed to retrieve teacher');
  }

  return teacher;
}

/**
 * Get parent by ID
 */
export async function getParentById(
  parentId: string,
  requesterUserId: string,
  requesterRole: string,
  schoolId: string
): Promise<any> {
  const parentProfile = await prisma.parentProfile.findFirst({
    where: {
      id: parentId,
      user: {
        schoolId,
      },
    },
    include: {
      user: {
        include: {
          role: true,
        },
      },
      students: {
        include: {
          class: {
            include: {
              standard: true,
              board: true,
            },
          },
        },
      },
    },
  });

  if (!parentProfile) {
    throw new NotFoundError('Parent not found');
  }

  // Check access: Parent can only view their own profile, Admin can view any
  if (requesterRole !== 'SCHOOL_ADMIN' && parentProfile.userId !== requesterUserId) {
    throw new ForbiddenError('You do not have permission to view this parent profile');
  }

  return {
    id: parentProfile.id,
    userId: parentProfile.userId,
    firstName: parentProfile.firstName,
    lastName: parentProfile.lastName,
    relation: parentProfile.relation,
    occupation: parentProfile.occupation,
    email: parentProfile.user.email,
    phone: parentProfile.user.phone,
    isActive: parentProfile.user.isActive,
    students: parentProfile.students.map((s) => ({
      id: s.id,
      admissionNumber: s.admissionNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      class: {
        id: s.class.id,
        name: s.class.name,
        standard: s.class.standard.name,
        board: s.class.board.name,
      },
    })),
  };
}

/**
 * Update teacher status (active/inactive)
 */
export async function updateTeacherStatus(
  schoolId: string,
  input: UpdateTeacherStatusInput
): Promise<{ updated: number }> {
  // Verify all teachers exist and belong to school
  const teacherProfiles = await prisma.teacherProfile.findMany({
    where: {
      id: { in: input.teacherIds },
      user: {
        schoolId,
        role: {
          name: 'TEACHER',
        },
      },
    },
    include: {
      user: true,
    },
  });

  if (teacherProfiles.length !== input.teacherIds.length) {
    const foundTeacherIds = teacherProfiles.map((tp) => tp.id);
    const missingTeachers = input.teacherIds.filter((id) => !foundTeacherIds.includes(id));
    throw new NotFoundError(`Teachers not found: ${missingTeachers.join(', ')}`);
  }

  // Update all teachers' status
  const userIds = teacherProfiles.map((tp) => tp.userId);

  const result = await prisma.user.updateMany({
    where: {
      id: { in: userIds },
      schoolId,
    },
    data: {
      isActive: input.isActive,
    },
  });

  return { updated: result.count };
}

/**
 * Update teacher by ID
 */
export async function updateTeacher(
  teacherId: string,
  schoolId: string,
  input: UpdateTeacherInput
): Promise<TeacherWithClasses> {
  // Verify teacher exists and belongs to school
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: {
      id: teacherId,
      user: {
        schoolId,
        role: {
          name: 'TEACHER',
        },
      },
    },
    include: {
      user: true,
    },
  });

  if (!teacherProfile) {
    throw new NotFoundError('Teacher not found');
  }

  // Check if email is being updated and if it's already taken
  if (input.email && input.email !== teacherProfile.user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already exists');
    }
  }

  // Check if employeeId is being updated and if it's already taken
  if (input.employeeId && input.employeeId !== teacherProfile.employeeId) {
    const existingEmployee = await prisma.teacherProfile.findUnique({
      where: { employeeId: input.employeeId },
    });

    if (existingEmployee) {
      throw new ConflictError('Employee ID already exists');
    }
  }

  // Validate classes if provided
  if (input.classIds && input.classIds.length > 0) {
    const classes = await prisma.class.findMany({
      where: {
        id: { in: input.classIds },
        schoolId,
      },
    });

    if (classes.length !== input.classIds.length) {
      const foundClassIds = classes.map((c) => c.id);
      const missingClasses = input.classIds.filter((id) => !foundClassIds.includes(id));
      throw new NotFoundError(`Classes not found: ${missingClasses.join(', ')}`);
    }
  }  // Update in transaction
  await prisma.$transaction(async (tx) => {
    // Update user if email or password changed
    if (input.email || input.password || input.phone !== undefined) {
      const updateData: any = {};
      if (input.email) updateData.email = input.email;
      if (input.password) {
        updateData.passwordHash = await hashPassword(input.password);
      }
      if (input.phone !== undefined) updateData.phone = input.phone;

      await tx.user.update({
        where: { id: teacherProfile.userId },
        data: updateData,
      });
    }

    // Update teacher profile
    const profileUpdateData: any = {};
    if (input.firstName !== undefined) profileUpdateData.firstName = input.firstName;
    if (input.lastName !== undefined) profileUpdateData.lastName = input.lastName;
    if (input.employeeId !== undefined) profileUpdateData.employeeId = input.employeeId;
    
    // Update password in profile if provided
    if (input.password) {
      profileUpdateData.password = input.password;
    }

    await tx.teacherProfile.update({
      where: { id: teacherId },
      data: profileUpdateData,
    });    // Update class assignments if provided
    if (input.classIds !== undefined) {
      // Remove existing assignments
      await tx.teacherClass.deleteMany({
        where: { teacherId },
      });

      // Create new assignments
      if (input.classIds.length > 0) {
        await Promise.all(
          input.classIds.map((classId) =>
            tx.teacherClass.create({
              data: {
                teacherId,
                classId,
              },
            })
          )
        );
      }
    }
  });

  // Fetch updated teacher with classes
  const teacher = await getTeacherById(teacherId, schoolId);
  if (!teacher) {
    throw new Error('Failed to retrieve updated teacher');
  }

  return teacher;
}

/**
 * Delete teacher by ID
 */
export async function deleteTeacher(
  teacherId: string,
  schoolId: string
): Promise<void> {
  // Verify teacher exists and belongs to school
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: {
      id: teacherId,
      user: {
        schoolId,
        role: {
          name: 'TEACHER',
        },
      },
    },
    include: {
      user: true,
    },
  });

  if (!teacherProfile) {
    throw new NotFoundError('Teacher not found');
  }

  // Delete in transaction (cascade will handle related records)
  await prisma.$transaction(async (tx) => {
    // Delete teacher profile (this will cascade delete teacher_classes)
    await tx.teacherProfile.delete({
      where: { id: teacherId },
    });    // Delete user
    await tx.user.delete({
      where: { id: teacherProfile.userId },
    });
  });
}
