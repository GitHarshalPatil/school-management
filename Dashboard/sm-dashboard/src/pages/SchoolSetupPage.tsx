import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { schoolService } from '../services/schoolService';
import { useAuth } from '../contexts/AuthContext';

const STANDARDS = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const BOARDS = ['CBSE', 'STATE', 'ICSE', 'GENERAL'];

const schoolSetupSchema = z.object({
    schoolName: z.string().min(1, 'School name is required'),
    address: z.string().optional(),
    contactNumber: z.string().optional(),
    schoolEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    adminName: z.string().min(1, 'Admin name is required'),
    adminEmail: z.string().email('Invalid email address'),
    adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
    academicYearName: z.string().regex(/^\d{4}-\d{2,4}$/, 'Format: YYYY-YY or YYYY-YYYY'),
    academicYearStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
    academicYearEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
});

type SchoolSetupFormData = z.infer<typeof schoolSetupSchema>;

export default function SchoolSetupPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [standardsWithBoards, setStandardsWithBoards] = useState<Array<{ standard: string; board: string }>>([]);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SchoolSetupFormData>({
        resolver: zodResolver(schoolSetupSchema),
    });

    const addStandardBoard = () => {
        setStandardsWithBoards([...standardsWithBoards, { standard: '', board: '' }]);
    };

    const removeStandardBoard = (index: number) => {
        setStandardsWithBoards(standardsWithBoards.filter((_, i) => i !== index));
    };

    const updateStandardBoard = (index: number, field: 'standard' | 'board', value: string) => {
        const updated = [...standardsWithBoards];
        updated[index] = { ...updated[index], [field]: value };
        setStandardsWithBoards(updated);
    };

    const onSubmit = async (data: SchoolSetupFormData) => {
        if (standardsWithBoards.length === 0) {
            setError('Please add at least one standard-board combination');
            return;
        }

        const invalidPairs = standardsWithBoards.some(sb => !sb.standard || !sb.board);
        if (invalidPairs) {
            setError('Please fill all standard-board combinations');
            return;
        }

        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            await schoolService.setupSchool({
                ...data,
                standardsWithBoards,
                logo: logoFile || undefined,
            });
            setSuccess('School setup completed successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Setup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">School Setup</h2>
                        <p className="mt-2 text-sm text-gray-600">Complete the initial setup for your school</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    School Name *
                                </label>
                                <input
                                    {...register('schoolName')}
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                                {errors.schoolName && (
                                    <p className="mt-1 text-sm text-red-600">{errors.schoolName.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    School Email
                                </label>
                                <input
                                    {...register('schoolEmail')}
                                    type="email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                                {errors.schoolEmail && (
                                    <p className="mt-1 text-sm text-red-600">{errors.schoolEmail.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Address
                                </label>
                                <input
                                    {...register('address')}
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contact Number
                                </label>
                                <input
                                    {...register('contactNumber')}
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    School Logo
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Account</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admin Name *
                                    </label>
                                    <input
                                        {...register('adminName')}
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {errors.adminName && (
                                        <p className="mt-1 text-sm text-red-600">{errors.adminName.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admin Email *
                                    </label>
                                    <input
                                        {...register('adminEmail')}
                                        type="email"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {errors.adminEmail && (
                                        <p className="mt-1 text-sm text-red-600">{errors.adminEmail.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admin Password *
                                    </label>
                                    <input
                                        {...register('adminPassword')}
                                        type="password"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {errors.adminPassword && (
                                        <p className="mt-1 text-sm text-red-600">{errors.adminPassword.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Year</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Academic Year Name * (e.g., 2024-2025)
                                    </label>
                                    <input
                                        {...register('academicYearName')}
                                        type="text"
                                        placeholder="2024-2025"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {errors.academicYearName && (
                                        <p className="mt-1 text-sm text-red-600">{errors.academicYearName.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Date * (YYYY-MM-DD)
                                    </label>
                                    <input
                                        {...register('academicYearStartDate')}
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {errors.academicYearStartDate && (
                                        <p className="mt-1 text-sm text-red-600">{errors.academicYearStartDate.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        End Date * (YYYY-MM-DD)
                                    </label>
                                    <input
                                        {...register('academicYearEndDate')}
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {errors.academicYearEndDate && (
                                        <p className="mt-1 text-sm text-red-600">{errors.academicYearEndDate.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Standards & Boards</h3>
                                <button
                                    type="button"
                                    onClick={addStandardBoard}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Add Standard-Board
                                </button>
                            </div>

                            {standardsWithBoards.map((sb, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <select
                                        value={sb.standard}
                                        onChange={(e) => updateStandardBoard(index, 'standard', e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Standard</option>
                                        {STANDARDS.map((std) => (
                                            <option key={std} value={std}>
                                                {std}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={sb.board}
                                        onChange={(e) => updateStandardBoard(index, 'board', e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Board</option>
                                        {BOARDS.map((board) => (
                                            <option key={board} value={board}>
                                                {board}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={() => removeStandardBoard(index)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end space-x-4 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Setting up...' : 'Complete Setup'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

