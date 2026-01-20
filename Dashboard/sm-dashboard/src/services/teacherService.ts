import api from '../config/api';

export interface CreateTeacherData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  employeeId?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  qualification?: string;
  classIds?: string[];
}

export interface Teacher {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  email: string;
  phone: string | null;
  password: string | null; // Plain text password from database
  isActive: boolean;
  classes: Array<{
    id: string;
    name: string;
    section: string;
    standard: string;
    board: string;
  }>;
}

export interface TeacherWithPassword extends Teacher {
  password?: string; // Only available immediately after creation
}

export interface UpdateTeacherData {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  employeeId?: string | null;
  dateOfBirth?: string | null;
  joiningDate?: string | null;
  qualification?: string | null;
  classIds?: string[];
}

export const teacherService = {
  async createTeacher(data: CreateTeacherData): Promise<TeacherWithPassword> {
    const response = await api.post('/api/user/teacher', data);
    return response.data.data;
  },

  async listTeachers(): Promise<Teacher[]> {
    const response = await api.get('/api/user/teachers');
    return response.data.data;
  },

  async updateTeacherStatus(teacherIds: string[], isActive: boolean): Promise<{ updated: number }> {
    const response = await api.put('/api/user/teachers/status', {
      teacherIds,
      isActive,
    });
    return response.data.data;
  },

  async updateTeacher(teacherId: string, data: UpdateTeacherData): Promise<Teacher> {
    const response = await api.put(`/api/user/teacher/${teacherId}`, data);
    return response.data.data;
  },

  async deleteTeacher(teacherId: string): Promise<void> {
    await api.delete(`/api/user/teacher/${teacherId}`);
  },
};

