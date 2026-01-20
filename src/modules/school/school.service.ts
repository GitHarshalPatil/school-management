import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../utils/password';
import { ConflictError, ValidationError, NotFoundError } from '../../utils/errors';

const prisma = new PrismaClient();

export interface SchoolSetupInput {
  schoolName: string;
  address?: string;
  contactNumber?: string;
  schoolEmail?: string;
  logoPath?: string;
  adminEmail: string;
  adminPassword: string;
  standardsWithBoards: Array<{ standard: string; board: string }>;
  academicYearName: string;
  academicYearStartDate: string;
  academicYearEndDate: string;
}

export interface SchoolSetupResult {
  school: {
    id: string;
    name: string;
  };
  admin: {
    id: string;
    email: string;
  };
  academicYear: {
    id: string;
    name: string;
  };
  standardsBoards: Array<{
    standard: string;
    board: string;
  }>;
}

/**
 * Setup school - one-time initialization
 * Creates school, admin user, academic year, and standard-board assignments
 */
export async function setupSchool(input: SchoolSetupInput): Promise<SchoolSetupResult> {
  // Check if school already exists
  const existingSchool = await prisma.school.findFirst();

  if (existingSchool) {
    throw new ConflictError('School has already been set up. Only one school is allowed.');
  }

  // Validate date range
  const startDate = new Date(input.academicYearStartDate);
  const endDate = new Date(input.academicYearEndDate);

  if (startDate >= endDate) {
    throw new ValidationError('Academic year start date must be before end date');
  }

  // Validate standards and boards exist
  const standardNames = input.standardsWithBoards.map((sb) => sb.standard);
  const boardNames = input.standardsWithBoards.map((sb) => sb.board);

  const [standards, boards] = await Promise.all([
    prisma.standard.findMany({
      where: { name: { in: standardNames } },
    }),
    prisma.board.findMany({
      where: { name: { in: boardNames } },
    }),
  ]);

  // Check if all standards exist
  const foundStandardNames = standards.map((s) => s.name);
  const missingStandards = standardNames.filter((name) => !foundStandardNames.includes(name));

  if (missingStandards.length > 0) {
    throw new NotFoundError(`Standards not found: ${missingStandards.join(', ')}`);
  }

  // Check if all boards exist
  const foundBoardNames = boards.map((b) => b.name);
  const missingBoards = boardNames.filter((name) => !foundBoardNames.includes(name));

  if (missingBoards.length > 0) {
    throw new NotFoundError(`Boards not found: ${missingBoards.join(', ')}`);
  }

  // Get SCHOOL_ADMIN role
  const adminRole = await prisma.role.findUnique({
    where: { name: 'SCHOOL_ADMIN' },
  });

  if (!adminRole) {
    throw new NotFoundError('SCHOOL_ADMIN role not found. Please run database seed first.');
  }

  // Hash admin password
  const passwordHash = await hashPassword(input.adminPassword);

  // Create everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create school
    const school = await tx.school.create({
      data: {
        name: input.schoolName,
        address: input.address,
        phone: input.contactNumber,
        email: input.schoolEmail,
        logo: input.logoPath,
        isActive: true,
      },
    });

    // 2. Create admin user
    const admin = await tx.user.create({
      data: {
        schoolId: school.id,
        roleId: adminRole.id,
        email: input.adminEmail,
        passwordHash,
        isActive: true,
      },
    });

    // 3. Create academic year (set as current)
    const academicYear = await tx.academicYear.create({
      data: {
        schoolId: school.id,
        name: input.academicYearName,
        startDate: startDate,
        endDate: endDate,
        isCurrent: true,
      },
    });

    // 4. Create standard-board assignments
    const standardBoardMap = new Map<string, string>();
    standards.forEach((s) => {
      standardBoardMap.set(s.name, s.id);
    });
    const boardMap = new Map<string, string>();
    boards.forEach((b) => {
      boardMap.set(b.name, b.id);
    });

    const standardBoardRecords = input.standardsWithBoards.map((sb) => ({
      standardId: standardBoardMap.get(sb.standard)!,
      boardId: boardMap.get(sb.board)!,
    }));

    // Check for duplicates
    const uniquePairs = new Set(
      standardBoardRecords.map((sb) => `${sb.standardId}-${sb.boardId}`)
    );

    if (uniquePairs.size !== standardBoardRecords.length) {
      throw new ValidationError('Duplicate standard-board pairs are not allowed');
    }

    // Create standard-board records
    await Promise.all(
      standardBoardRecords.map((sb) =>
        tx.standardBoard.create({
          data: sb,
        })
      )
    );

    return {
      school,
      admin,
      academicYear,
      standardsBoards: input.standardsWithBoards,
    };
  });

  return {
    school: {
      id: result.school.id,
      name: result.school.name,
    },
    admin: {
      id: result.admin.id,
      email: result.admin.email,
    },
    academicYear: {
      id: result.academicYear.id,
      name: result.academicYear.name,
    },
    standardsBoards: result.standardsBoards,
  };
}

/**
 * Get school information by ID
 */
export async function getSchoolInfo(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      logo: true,
      address: true,
      phone: true,
      email: true,
      isActive: true,
    },
  });  if (!school) {
    throw new NotFoundError('School not found');
  }

  return school;
}

/**
 * Get current school information (for authenticated users)
 */
export async function getCurrentSchoolInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      schoolId: true,
      school: {
        select: {
          id: true,
          name: true,
          logo: true,
          address: true,
          phone: true,
          email: true,
          isActive: true,
        },
      },
    },
  });  if (!user || !user.school) {
    throw new NotFoundError('School not found');
  }  return user.school;
}

/**
 * Update school information
 */
export interface UpdateSchoolInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoPath?: string;
}

export async function updateSchoolInfo(userId: string, input: UpdateSchoolInput) {
  // Get user's school
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true },
  });

  if (!user || !user.schoolId) {
    throw new NotFoundError('School not found');
  }

  // Update school
  const updatedSchool = await prisma.school.update({
    where: { id: user.schoolId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.email && { email: input.email }),
      ...(input.phone && { phone: input.phone }),
      ...(input.address && { address: input.address }),
      ...(input.logoPath && { logo: input.logoPath }),
    },
    select: {
      id: true,
      name: true,
      logo: true,
      address: true,
      phone: true,
      email: true,
      isActive: true,
    },
  });

  return updatedSchool;
}
