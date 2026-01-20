import api from '../config/api';
import type { SchoolInfo, SchoolSetupData } from '../types';

export type { SchoolInfo, SchoolSetupData };

export const schoolService = {
    async setupSchool(data: SchoolSetupData): Promise<any> {
        const formData = new FormData();
        formData.append('schoolName', data.schoolName);
        if (data.address) formData.append('address', data.address);
        if (data.contactNumber) formData.append('contactNumber', data.contactNumber);
        if (data.schoolEmail) formData.append('schoolEmail', data.schoolEmail);
        formData.append('adminName', data.adminName);
        formData.append('adminEmail', data.adminEmail);
        formData.append('adminPassword', data.adminPassword);
        formData.append('standardsWithBoards', JSON.stringify(data.standardsWithBoards));
        formData.append('academicYearName', data.academicYearName);
        formData.append('academicYearStartDate', data.academicYearStartDate);
        formData.append('academicYearEndDate', data.academicYearEndDate);
        if (data.logo) formData.append('logo', data.logo);

        const response = await api.post('/api/school/setup', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.data;
    },

    async getSchoolInfo(): Promise<SchoolInfo> {
        const response = await api.get('/api/school/info');
        return response.data.data;
    },
};

