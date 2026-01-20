import api from '../config/api';

export interface CreateStudentData {
    firstName: string;
    lastName: string;
    rollNumber: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth: string; // YYYY-MM-DD
    className: string; // e.g., "10", "1st", "10th"
    division: string; // e.g., "A", "B"
    parentName: string;
    parentMobile: string;
    parentEmail: string;
}

export interface Student {
    id: string;
    firstName: string;
    lastName: string;
    rollNumber: string;
    gender: string;
    dateOfBirth: string;
    isActive: boolean;
    class: {
        id: string;
        name: string;
        section: string;
        standard: { name: string };
        board: { name: string };
    };
    parent: {
        id: string;
        firstName: string;
        lastName: string;
        user: {
            email: string;
            phone: string | null;
        };
    };
    createdAt: string;
    updatedAt: string;
}

export interface UpdateStudentData {
    firstName?: string;
    lastName?: string;
    rollNumber?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth?: string; // YYYY-MM-DD
    className?: string; // e.g., "10", "1st", "10th"
    division?: string; // e.g., "A", "B"
    parentName?: string;
    parentMobile?: string;
    parentEmail?: string;
}

export interface GetStudentsResponse {
    students: Student[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface Class {
    id: string;
    name: string;
    section: string;
    standard: { name: string };
    board: { name: string };
}

export interface StudentRowWithStatus {
    rowNumber: number;
    firstName: string;
    lastName: string;
    rollNumber: string;
    gender: string;
    dateOfBirth: string;
    className: string;
    division: string;
    parentName: string;
    parentMobile: string;
    parentEmail: string;
    status: 'pending' | 'valid' | 'invalid' | 'duplicate';
    errors?: string[];
    validatedData?: {
        firstName: string;
        lastName: string;
        rollNumber: string;
        gender: 'MALE' | 'FEMALE' | 'OTHER';
        dateOfBirth: string;
        classId: string;
        parentName: string;
        parentMobile: string;
        parentEmail: string;
    };
}

export interface VerifyImportResponse {
    validRows: Array<{
        firstName: string;
        lastName: string;
        rollNumber: string;
        gender: 'MALE' | 'FEMALE' | 'OTHER';
        dateOfBirth: string;
        classId: string;
        parentName: string;
        parentMobile: string;
        parentEmail: string;
    }>;
    invalidRows: Array<{
        rowNumber: number;
        errors: string[];
    }>;
    allRows: StudentRowWithStatus[];
}

export interface ImportStudentsResponse {
    success: number;
    failed: number;
}

export interface Standard {
    id: string;
    name: string; // Database name (LKG, UKG, 1st, 2nd, etc.)
    displayName: string; // Display name (Junior KG, Senior KG, 1, 2, etc.)
    order: number;
}

export const studentService = {
    async createStudent(data: CreateStudentData): Promise<Student> {
        const response = await api.post('/api/students', data);
        return response.data.data;
    },

    async getStudents(params?: {
        classId?: string;
        page?: number;
        limit?: number;
    }): Promise<GetStudentsResponse> {
        const queryParams = new URLSearchParams();
        if (params?.classId) queryParams.append('classId', params.classId);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        const response = await api.get(
            `/api/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
        );
        return response.data.data;
    },

    async updateStudent(studentId: string, data: UpdateStudentData): Promise<Student> {
        const response = await api.put(`/api/students/${studentId}`, data);
        return response.data.data;
    },

    async deleteStudent(studentId: string): Promise<void> {
        await api.delete(`/api/students/${studentId}`);
    },

    async getClasses(): Promise<Class[]> {
        const response = await api.get('/api/students/classes');
        return response.data.data;
    },

    async getStandards(): Promise<Standard[]> {
        const response = await api.get('/api/students/standards');
        return response.data.data;
    },

    async downloadSampleExcel(): Promise<Blob> {
        const response = await api.get('/api/students/import/sample', {
            responseType: 'blob',
        });
        return response.data;
    },

    async parseImportFile(file: File): Promise<{ allRows: StudentRowWithStatus[] }> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/api/students/import/parse', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.data;
    },

    async verifyImportFile(file: File): Promise<VerifyImportResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/api/students/import/verify', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.data;
    },

    async verifyRows(rows: StudentRowWithStatus[]): Promise<VerifyImportResponse> {
        const response = await api.post('/api/students/import/verify-rows', {
            rows: rows.map(row => ({
                rowNumber: row.rowNumber,
                firstName: row.firstName,
                lastName: row.lastName,
                rollNumber: row.rollNumber,
                gender: row.gender,
                dateOfBirth: row.dateOfBirth,
                className: row.className,
                division: row.division,
                parentName: row.parentName,
                parentMobile: row.parentMobile,
                parentEmail: row.parentEmail,
            })),
        });
        return response.data.data;
    },

    async importStudents(verifiedRows: VerifyImportResponse['validRows']): Promise<ImportStudentsResponse> {
        const response = await api.post('/api/students/import', {
            verifiedRows,
        });
        return response.data.data;
    },
};
