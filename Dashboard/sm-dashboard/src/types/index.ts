export interface User {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT';
  schoolId?: string;
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface SchoolInfo {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface SchoolSetupData {
  schoolName: string;
  address?: string;
  contactNumber?: string;
  schoolEmail?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  standardsWithBoards: Array<{ standard: string; board: string }>;
  academicYearName: string;
  academicYearStartDate: string;
  academicYearEndDate: string;
  logo?: File;
}

