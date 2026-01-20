import { PrismaClient } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../utils/errors';
import type { CreateClassInput } from './class.schema';

const prisma = new PrismaClient();

export interface ClassWithDetails {
  id: string;
  name: string;
  section: string;
  capacity: number;
  standard: { id: string; name: string; order: number };
  board: { id: string; name: string };
  academicYear: { id: string; name: string };
  studentCount?: number;
}

/**
 * Get current academic year for a school
 */
async function getCurrentAcademicYear(schoolId: string): Promise<string> {
  const academicYear = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      isCurrent: true,
    },
  });

  if (!academicYear) {
    throw new NotFoundError(
      'No current academic year found. Please set up academic year first.'
    );
  }

  return academicYear.id;
}

/**
 * Create a new class
 */
export async function createClass(
  schoolId: string,
  input: CreateClassInput
): Promise<ClassWithDetails> {
  // Get current academic year
  const academicYearId = await getCurrentAcademicYear(schoolId);

  // Verify standard exists
  const standard = await prisma.standard.findUnique({
    where: { id: input.standardId },
  });

  if (!standard) {
    throw new NotFoundError('Standard not found');
  }

  // Verify board exists
  const board = await prisma.board.findUnique({
    where: { id: input.boardId },
  });

  if (!board) {
    throw new NotFoundError('Board not found');
  }

  // Verify standard-board combination exists (should be created during school setup)
  const standardBoard = await prisma.standardBoard.findFirst({
    where: {
      standardId: input.standardId,
      boardId: input.boardId,
    },
  });

  if (!standardBoard) {
    throw new NotFoundError(
      `Standard-Board combination (${standard.name} - ${board.name}) not found. Please ensure it was added during school setup.`
    );
  }

  // Normalize section to uppercase
  const section = input.section.toUpperCase().trim();

  // Check if class already exists
  const existing = await prisma.class.findFirst({
    where: {
      academicYearId,
      standardId: input.standardId,
      boardId: input.boardId,
      section,
    },
  });

  if (existing) {
    throw new ConflictError(
      `Class ${standard.name} ${section} - ${board.name} already exists for this academic year`
    );
  }

  // Create class
  const classRecord = await prisma.class.create({
    data: {
      schoolId,
      academicYearId,
      standardId: input.standardId,
      boardId: input.boardId,
      section,
      name: `${standard.name} ${section} - ${board.name}`,
      capacity: input.capacity || 60,
    },
    include: {
      standard: true,
      board: true,
      academicYear: true,
      _count: {
        select: {
          students: true,
        },
      },
    },
  });

  return {
    id: classRecord.id,
    name: classRecord.name,
    section: classRecord.section,
    capacity: classRecord.capacity,
    standard: {
      id: classRecord.standard.id,
      name: classRecord.standard.name,
      order: classRecord.standard.order,
    },
    board: {
      id: classRecord.board.id,
      name: classRecord.board.name,
    },
    academicYear: {
      id: classRecord.academicYear.id,
      name: classRecord.academicYear.name,
    },
    studentCount: classRecord._count.students,
  };
}

/**
 * Get classes for a school
 */
export async function getClasses(
  schoolId: string,
  academicYearId?: string
): Promise<ClassWithDetails[]> {
  let finalAcademicYearId = academicYearId;

  // If no academic year specified, use current one
  if (!finalAcademicYearId) {
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (currentYear) {
      finalAcademicYearId = currentYear.id;
    }
  }

  const where: any = { schoolId };
  if (finalAcademicYearId) {
    where.academicYearId = finalAcademicYearId;
  }

  const classes = await prisma.class.findMany({
    where,
    include: {
      standard: true,
      board: true,
      academicYear: true,
      _count: {
        select: {
          students: true,
        },
      },
    },
    orderBy: [
      { standard: { order: 'asc' } },
      { section: 'asc' },
    ],
  });

  return classes.map((cls) => ({
    id: cls.id,
    name: cls.name,
    section: cls.section,
    capacity: cls.capacity,
    standard: {
      id: cls.standard.id,
      name: cls.standard.name,
      order: cls.standard.order,
    },
    board: {
      id: cls.board.id,
      name: cls.board.name,
    },
    academicYear: {
      id: cls.academicYear.id,
      name: cls.academicYear.name,
    },
    studentCount: cls._count.students,
  }));
}

/**
 * Get available standards and boards for a school
 * Returns all boards from database and standards configured during school setup
 */
export async function getStandardsAndBoards(schoolId: string): Promise<{
  standards: Array<{ id: string; name: string; order: number }>;
  boards: Array<{ id: string; name: string }>;
  standardBoards: Array<{ standardId: string; boardId: string; standardName: string; boardName: string }>;
}> {
  // Get all standard-board combinations (these are created during school setup)
  const standardBoards = await prisma.standardBoard.findMany({
    include: {
      standard: true,
      board: true,
    },
    orderBy: [
      { standard: { order: 'asc' } },
      { board: { name: 'asc' } },
    ],
  });

  // Get unique standards from standard-board combinations
  const standardsMap = new Map<string, { id: string; name: string; order: number }>();
  standardBoards.forEach((sb) => {
    if (!standardsMap.has(sb.standard.id)) {
      standardsMap.set(sb.standard.id, {
        id: sb.standard.id,
        name: sb.standard.name,
        order: sb.standard.order,
      });
    }
  });

  // Get ALL boards from database (not just from standard-board combinations)
  const allBoards = await prisma.board.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return {
    standards: Array.from(standardsMap.values()).sort((a, b) => a.order - b.order),
    boards: allBoards.map((b) => ({
      id: b.id,
      name: b.name,
    })),
    standardBoards: standardBoards.map((sb) => ({
      standardId: sb.standard.id,
      boardId: sb.board.id,
      standardName: sb.standard.name,
      boardName: sb.board.name,
    })),
  };
}
