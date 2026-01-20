import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { classService, type Class, type Standard, type Board } from '../services/classService';
import { useAuth } from '../contexts/AuthContext';

const createClassSchema = z.object({
  standardId: z.string().min(1, 'Standard is required'),
  boardId: z.string().min(1, 'Board is required'),
  section: z
    .string()
    .min(1, 'Section is required')
    .max(1, 'Section must be a single letter')
    .regex(/^[A-Z]$/i, 'Section must be a letter (A-Z)'),
  capacity: z
    .number()
    .int()
    .min(1, 'Capacity must be at least 1')
    .max(200, 'Capacity cannot exceed 200')
    .optional()
    .default(60),
});

type CreateClassFormData = z.infer<typeof createClassSchema>;

export default function ClassesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CreateClassFormData>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      capacity: 60,
    },
  });

  const selectedStandard = watch('standardId');
  const selectedBoard = watch('boardId');

  useEffect(() => {
    if (user?.role === 'SCHOOL_ADMIN') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesList, standardsBoards] = await Promise.all([
        classService.getClasses(),
        classService.getStandardsAndBoards(),
      ]);
      setClasses(classesList);
      setStandards(standardsBoards.standards);
      setBoards(standardsBoards.boards);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CreateClassFormData) => {
    setError('');
    setSuccess('');

    try {
      setSubmitting(true);
      await classService.createClass({
        ...data,
        section: data.section.toUpperCase(),
      });
      setSuccess('Class created successfully!');
      reset();
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create class');
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'SCHOOL_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Only School Administrators can manage classes.</p>
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
              <h1 className="text-xl font-bold text-gray-900">Class Management</h1>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-gray-700 hover:text-blue-600 font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/students')}
                className="text-sm text-gray-700 hover:text-blue-600 font-medium"
              >
                Students
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
            <h2 className="text-2xl font-bold text-gray-900">Classes</h2>
            <p className="text-sm text-gray-600 mt-1">Create and manage classes for your school</p>
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
            {showForm ? 'Cancel' : '+ Create Class'}
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Class</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Standard *
                  </label>
                  <select
                    {...register('standardId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Standard</option>
                    {standards.map((standard) => (
                      <option key={standard.id} value={standard.id}>
                        {standard.name}
                      </option>
                    ))}
                  </select>
                  {errors.standardId && (
                    <p className="mt-1 text-sm text-red-600">{errors.standardId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Board *
                  </label>
                  <select
                    {...register('boardId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Board</option>
                    {boards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name}
                      </option>
                    ))}
                  </select>
                  {errors.boardId && (
                    <p className="mt-1 text-sm text-red-600">{errors.boardId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section * (A-Z)
                  </label>
                  <input
                    {...register('section')}
                    type="text"
                    maxLength={1}
                    placeholder="A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 uppercase"
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.section && (
                    <p className="mt-1 text-sm text-red-600">{errors.section.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity
                  </label>
                  <input
                    {...register('capacity', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.capacity && (
                    <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
                  )}
                </div>
              </div>
              {selectedStandard && selectedBoard && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Class Name:</strong>{' '}
                    {standards.find((s) => s.id === selectedStandard)?.name} {watch('section')?.toUpperCase() || 'A'} -{' '}
                    {boards.find((b) => b.id === selectedBoard)?.name}
                  </p>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    reset();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Classes Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No classes found. Create your first class above.</p>
              <p className="text-sm text-gray-400">
                Classes are required before you can add students.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Standard
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Board
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Students
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Academic Year
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{cls.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{cls.standard.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{cls.board.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{cls.section}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{cls.capacity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {cls.studentCount || 0} / {cls.capacity}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{cls.academicYear.name}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
