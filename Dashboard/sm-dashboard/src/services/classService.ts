import api from '../config/api';

export interface CreateClassData {
  standardId: string;
  boardId: string;
  section: string; // Single letter A-Z
  capacity?: number;
}

export interface Class {
  id: string;
  name: string;
  section: string;
  capacity: number;
  standard: { id: string; name: string; order: number };
  board: { id: string; name: string };
  academicYear: { id: string; name: string };
  studentCount?: number;
}

export interface Standard {
  id: string;
  name: string;
  order: number;
}

export interface Board {
  id: string;
  name: string;
}

export interface StandardBoard {
  standardId: string;
  boardId: string;
  standardName: string;
  boardName: string;
}

export interface StandardsAndBoards {
  standards: Standard[];
  boards: Board[];
  standardBoards: StandardBoard[];
}

export const classService = {
  async createClass(data: CreateClassData): Promise<Class> {
    const response = await api.post('/api/classes', data);
    return response.data.data;
  },

  async getClasses(academicYearId?: string): Promise<Class[]> {
    const params = academicYearId ? { academicYearId } : {};
    const response = await api.get('/api/classes', { params });
    return response.data.data;
  },

  async getStandardsAndBoards(): Promise<StandardsAndBoards> {
    const response = await api.get('/api/classes/standards-boards');
    return response.data.data;
  },
};
