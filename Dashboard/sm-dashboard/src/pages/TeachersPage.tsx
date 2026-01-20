import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { teacherService, type Teacher } from '../services/teacherService';
import { useAuth } from '../contexts/AuthContext';

const createTeacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
});

const updateTeacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
});

type CreateTeacherFormData = z.infer<typeof createTeacherSchema>;
type UpdateTeacherFormData = z.infer<typeof updateTeacherSchema>;

export default function TeachersPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showPassword, setShowPassword] = useState<Map<string, boolean>>(new Map());
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTeacherFormData>({
    resolver: zodResolver(createTeacherSchema),
  });

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: updateErrors },
    reset: resetUpdate,
    setValue: setUpdateValue,
  } = useForm<UpdateTeacherFormData>({
    resolver: zodResolver(updateTeacherSchema),
  });

  useEffect(() => {
    if (user?.role === 'SCHOOL_ADMIN') {
      loadTeachers();
    }
  }, [user]);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const teachersList = await teacherService.listTeachers();
      setTeachers(teachersList);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CreateTeacherFormData) => {
    setError('');
    setSuccess('');

    try {
      const teacherData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        employeeId: data.employeeId || undefined,
      };

      await teacherService.createTeacher(teacherData);

      setSuccess('Teacher created successfully!');
      reset();
      setShowForm(false);
      await loadTeachers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create teacher');
    }
  };

  const handleCheckboxChange = (teacherId: string) => {
    setSelectedTeachers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId);
      } else {
        newSet.add(teacherId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTeachers.size === teachers.length) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(teachers.map((t) => t.id)));
    }
  };

  const handleUpdateStatus = async (isActive: boolean) => {
    if (selectedTeachers.size === 0) {
      setError('Please select at least one teacher');
      return;
    }

    try {
      setUpdating(true);
      setError('');
      await teacherService.updateTeacherStatus(Array.from(selectedTeachers), isActive);
      setSuccess(`${selectedTeachers.size} teacher(s) ${isActive ? 'activated' : 'deactivated'} successfully!`);
      setSelectedTeachers(new Set());
      await loadTeachers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update teacher status');
    } finally {
      setUpdating(false);
    }
  };

  const togglePasswordVisibility = (teacherId: string) => {
    setShowPassword((prev) => {
      const newMap = new Map(prev);
      newMap.set(teacherId, !newMap.get(teacherId));
      return newMap;
    });
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setUpdateValue('firstName', teacher.firstName);
    setUpdateValue('lastName', teacher.lastName);
    setUpdateValue('email', teacher.email);
    setUpdateValue('phone', teacher.phone || '');
    setUpdateValue('employeeId', teacher.employeeId || '');
    setError('');
    setSuccess('');
  };

  const handleUpdateSubmit = async (data: UpdateTeacherFormData) => {
    if (!editingTeacher) return;

    setError('');
    setSuccess('');

    try {
      const updateData: any = {};
      if (data.firstName) updateData.firstName = data.firstName;
      if (data.lastName) updateData.lastName = data.lastName;
      if (data.email) updateData.email = data.email;
      if (data.password && data.password !== '') updateData.password = data.password;
      if (data.phone !== undefined) updateData.phone = data.phone || null;
      if (data.employeeId !== undefined) updateData.employeeId = data.employeeId || null;

      await teacherService.updateTeacher(editingTeacher.id, updateData);
      setSuccess('Teacher updated successfully!');
      setEditingTeacher(null);
      resetUpdate();
      await loadTeachers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update teacher');
    }
  };

  const handleDelete = async (teacherId: string) => {
    try {
      setDeleting(true);
      setError('');
      await teacherService.deleteTeacher(teacherId);
      setSuccess('Teacher deleted successfully!');
      setShowDeleteConfirm(null);
      await loadTeachers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete teacher');
    } finally {
      setDeleting(false);
    }
  };

  if (user?.role !== 'SCHOOL_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Only School Administrators can manage teachers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">Teacher Management</h1>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-gray-700 hover:text-blue-600 font-medium"
              >
                Dashboard
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                    {user?.role}
                  </span>
                  <span className="font-medium text-gray-700">{user?.email}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Teachers</h2>
            <p className="text-sm text-gray-600 mt-1">Create and manage teacher accounts</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setError('');
              setSuccess('');
              reset();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ Add Teacher'}
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Teacher</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    {...register('firstName')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    {...register('lastName')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    {...register('password')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Min 6 characters"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    {...register('phone')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    {...register('employeeId')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    reset();
                    setError('');
                    setSuccess('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Teacher
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Teachers List</h2>
            <p className="text-sm text-gray-600 mt-1">All teachers with their login credentials</p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No teachers found. Create your first teacher above.</p>
            </div>
          ) : (
            <>
              {selectedTeachers.size > 0 && (
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedTeachers.size} teacher(s) selected
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdateStatus(true)}
                      disabled={updating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {updating ? 'Updating...' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(false)}
                      disabled={updating}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {updating ? 'Updating...' : 'Deactivate'}
                    </button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.size === teachers.length && teachers.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email (Login)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Password
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Classes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teachers.map((teacher) => {
                      const password = teacher.password; // Get password from API response
                      const isPasswordVisible = showPassword.get(teacher.id);
                      return (
                        <tr key={teacher.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedTeachers.has(teacher.id)}
                              onChange={() => handleCheckboxChange(teacher.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {teacher.firstName} {teacher.lastName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono">{teacher.email}</div>
                            <div className="text-xs text-gray-500">Login Email</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {password ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-900 font-mono">
                                  {isPasswordVisible ? password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(teacher.id)}
                                  className="text-gray-500 hover:text-gray-700"
                                  title={isPasswordVisible ? 'Hide password' : 'Show password'}
                                >
                                  {isPasswordVisible ? (
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.794m0 0L21 21"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Not available</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {teacher.employeeId || <span className="text-gray-400">-</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {teacher.phone || <span className="text-gray-400">-</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {teacher.classes.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {teacher.classes.map((cls) => (
                                    <span
                                      key={cls.id}
                                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {cls.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">No classes assigned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${teacher.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}
                            >
                              {teacher.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(teacher)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit teacher"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(teacher.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete teacher"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Update Teacher Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Update Teacher</h2>
              <button
                onClick={() => {
                  setEditingTeacher(null);
                  resetUpdate();
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitUpdate(handleUpdateSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    {...registerUpdate('firstName')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {updateErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{updateErrors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    {...registerUpdate('lastName')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {updateErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{updateErrors.lastName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    {...registerUpdate('email')}
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {updateErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{updateErrors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (leave empty to keep current)
                  </label>
                  <input
                    {...registerUpdate('password')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Min 6 characters"
                  />
                  {updateErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{updateErrors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    {...registerUpdate('phone')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    {...registerUpdate('employeeId')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTeacher(null);
                    resetUpdate();
                    setError('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Teacher</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this teacher? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
