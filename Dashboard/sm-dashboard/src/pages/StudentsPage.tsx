import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { studentService, type Student, type Class, type VerifyImportResponse, type Standard, type StudentRowWithStatus } from '../services/studentService';
import { useAuth } from '../contexts/AuthContext';

const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
    errorMap: () => ({ message: 'Gender is required' }),
  }),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
  className: z.string().min(1, 'Class is required (e.g., 10, 1st, 10th)'),
  division: z.string().min(1, 'Division is required (e.g., A, B)').max(10, 'Division must be a single letter or short code'),
  parentName: z.string().min(1, 'Parent name is required'),
  parentMobile: z.string().regex(/^\d{10}$/, 'Parent mobile must be exactly 10 digits'),
  parentEmail: z.string().email('Invalid parent email address'),
});

const updateStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  rollNumber: z.string().min(1, 'Roll number is required').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format').optional(),
  className: z.string().min(1, 'Class is required (e.g., 10, 1st, 10th)').optional(),
  division: z.string().min(1, 'Division is required (e.g., A, B)').max(10, 'Division must be a single letter or short code').optional(),
  parentName: z.string().min(1, 'Parent name is required').optional(),
  parentMobile: z.string().regex(/^\d{10}$/, 'Parent mobile must be exactly 10 digits').optional(),
  parentEmail: z.string().email('Invalid parent email address').optional(),
});

type CreateStudentFormData = z.infer<typeof createStudentSchema>;
type UpdateStudentFormData = z.infer<typeof updateStudentSchema>;

type BulkImportStep = 'instructions' | 'upload' | 'verify' | 'import';

export default function StudentsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportStep, setBulkImportStep] = useState<BulkImportStep>('instructions');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerifyImportResponse | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [editableRows, setEditableRows] = useState<StudentRowWithStatus[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
  });

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: updateErrors },
    reset: resetUpdate,
    setValue: setUpdateValue,
  } = useForm<UpdateStudentFormData>({
    resolver: zodResolver(updateStudentSchema),
  });

  useEffect(() => {
    if (user?.role === 'SCHOOL_ADMIN') {
      loadStudents();
      loadClasses();
      loadStandards();
    }
  }, [user, page, selectedClassId]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 10 };
      if (selectedClassId) params.classId = selectedClassId;
      const response = await studentService.getStudents(params);
      setStudents(response.students);
      setTotalPages(response.totalPages);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const classesList = await studentService.getClasses();
      setClasses(classesList);
    } catch (error: any) {
      console.error('Failed to load classes:', error);
    }
  };

  const loadStandards = async () => {
    try {
      const standardsList = await studentService.getStandards();
      setStandards(standardsList);
    } catch (error: any) {
      console.error('Failed to load standards:', error);
    }
  };

  const onSubmit = async (data: CreateStudentFormData) => {
    setError('');
    setSuccess('');

    try {
      setSubmitting(true);
      await studentService.createStudent(data);
      setSuccess('Student created successfully!');
      reset();
      setShowDrawer(false);
      await loadStudents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setUpdateValue('firstName', student.firstName);
    setUpdateValue('lastName', student.lastName);
    setUpdateValue('rollNumber', student.rollNumber);
    setUpdateValue('gender', student.gender as 'MALE' | 'FEMALE' | 'OTHER');
    setUpdateValue('dateOfBirth', new Date(student.dateOfBirth).toISOString().split('T')[0]);
    // Map standard name to display name for dropdown
    const standardName = student.class.standard?.name || '';
    const standard = standards.find(s => s.name === standardName);
    setUpdateValue('className', standard?.displayName || standardName);
    setUpdateValue('division', student.class.section || '');
    setUpdateValue('parentName', `${student.parent.firstName} ${student.parent.lastName}`);
    setUpdateValue('parentMobile', student.parent.user.phone || '');
    setUpdateValue('parentEmail', student.parent.user.email);
    setError('');
  };

  const handleUpdateSubmit = async (data: UpdateStudentFormData) => {
    if (!editingStudent) return;

    setError('');
    setSuccess('');

    try {
      setSubmitting(true);
      await studentService.updateStudent(editingStudent.id, data);
      setSuccess('Student updated successfully!');
      setEditingStudent(null);
      resetUpdate();
      await loadStudents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      setDeleting(true);
      await studentService.deleteStudent(showDeleteConfirm);
      setSuccess('Student deleted successfully!');
      setShowDeleteConfirm(null);
      await loadStudents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete student');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const blob = await studentService.downloadSampleExcel();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_import_sample.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      setError('Failed to download sample file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setBulkImportStep('verify');
      // Reset previous data
      setEditableRows([]);
      setVerificationResult(null);
      setError('');
      
      // Parse file immediately to show data
      try {
        setSubmitting(true);
        const result = await studentService.parseImportFile(file);
        setEditableRows(result.allRows);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to parse file');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleVerifyFile = async () => {
    if (editableRows.length === 0) return;

    try {
      setVerifying(true);
      setVerifyProgress(0);
      setError('');
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setVerifyProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Verify using edited rows data
      const result = await studentService.verifyRows(editableRows);
      
      clearInterval(progressInterval);
      setVerifyProgress(100);
      
      setVerificationResult(result);
      setEditableRows(result.allRows);
      
      setTimeout(() => {
        setVerifyProgress(0);
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to verify data');
      setVerifyProgress(0);
    } finally {
      setVerifying(false);
    }
  };

  const handleRowUpdate = (rowNumber: number, field: keyof StudentRowWithStatus, value: string) => {
    setEditableRows(prev => prev.map(row => {
      if (row.rowNumber === rowNumber) {
        const updated = { ...row, [field]: value, status: 'pending' as const };
        // Clear validatedData if row was previously valid
        if (updated.validatedData) {
          updated.validatedData = undefined;
        }
        return updated;
      }
      return row;
    }));
    // Clear verification result when data is edited
    if (verificationResult) {
      setVerificationResult(null);
    }
  };

  const handleImportStudents = async () => {
    if (!verificationResult || verificationResult.validRows.length === 0) return;

    try {
      setImporting(true);
      setImportProgress(0);
      setError('');
      
      // Simulate progress (since we don't have real-time progress from API)
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await studentService.importStudents(verificationResult.validRows);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      setTimeout(() => {
        setSuccess(`Successfully imported ${result.success} student(s)!`);
        setShowBulkImport(false);
        setBulkImportStep('instructions');
        setSelectedFile(null);
        setVerificationResult(null);
        setImportProgress(0);
        loadStudents();
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import students');
      setImportProgress(0);
    } finally {
      setImporting(false);
    }
  };

  const resetBulkImport = () => {
    setBulkImportStep('instructions');
    setSelectedFile(null);
    setVerificationResult(null);
    setEditableRows([]);
    setVerifyProgress(0);
    setImportProgress(0);
    setError('');
  };

  if (user?.role !== 'SCHOOL_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Only School Administrators can manage students.</p>
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
              <h1 className="text-xl font-bold text-gray-900">Student Management</h1>
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
            <h2 className="text-2xl font-bold text-gray-900">Students</h2>
            <p className="text-sm text-gray-600 mt-1">Create and manage student records</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowBulkImport(true);
                resetBulkImport();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Bulk Import
            </button>
            <button
              onClick={() => {
                setShowDrawer(true);
                setError('');
                setSuccess('');
                reset();
                setEditingStudent(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Student
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
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

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No students found. Create your first student above.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Roll
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{student.rollNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{student.gender}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.class.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {student.parent.firstName} {student.parent.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{student.parent.user.email}</div>
                          <div className="text-xs text-gray-500">{student.parent.user.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(student)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(student.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Student Drawer (Right Side) */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowDrawer(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingStudent ? 'Update Student' : 'Add New Student'}
                </h2>
                <button
                  onClick={() => {
                    setShowDrawer(false);
                    reset();
                    setEditingStudent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {editingStudent ? (
                <form onSubmit={handleSubmitUpdate(handleUpdateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
                      <input
                        {...registerUpdate('rollNumber')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {updateErrors.rollNumber && (
                        <p className="mt-1 text-sm text-red-600">{updateErrors.rollNumber.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                      <select
                        {...registerUpdate('gender')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {updateErrors.gender && (
                        <p className="mt-1 text-sm text-red-600">{updateErrors.gender.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                      <input
                        {...registerUpdate('dateOfBirth')}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {updateErrors.dateOfBirth && (
                        <p className="mt-1 text-sm text-red-600">{updateErrors.dateOfBirth.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                      <select
                        {...registerUpdate('className')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Class</option>
                        {standards.map((std) => (
                          <option key={std.id} value={std.displayName}>
                            {std.displayName}
                          </option>
                        ))}
                      </select>
                      {updateErrors.className && (
                        <p className="mt-1 text-sm text-red-600">{updateErrors.className.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Division *</label>
                      <input
                        {...registerUpdate('division')}
                        type="text"
                        placeholder="e.g., A, B"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Enter division (e.g., A, B)</p>
                      {updateErrors.division && (
                        <p className="mt-1 text-sm text-red-600">{updateErrors.division.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name *</label>
                      <input
                        {...registerUpdate('parentName')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {updateErrors.parentName && (
                        <p className="mt-1 text-sm text-red-600">{updateErrors.parentName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parent Mobile *</label>
                      <input
                        {...registerUpdate('parentMobile')}
                        type="text"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {updateErrors.parentMobile && (
                        <p className="mt-1 text-sm text-red-600">{updateErrors.parentMobile.message}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email *</label>
                      <input
                        {...registerUpdate('parentEmail')}
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {updateErrors.parentEmail && (
                        <p className="mt-1 text-sm text-red-600">{updateErrors.parentEmail.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDrawer(false);
                        resetUpdate();
                        setEditingStudent(null);
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
                      {submitting ? 'Updating...' : 'Update Student'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
                      <input
                        {...register('rollNumber')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.rollNumber && (
                        <p className="mt-1 text-sm text-red-600">{errors.rollNumber.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                      <select
                        {...register('gender')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {errors.gender && (
                        <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                      <input
                        {...register('dateOfBirth')}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.dateOfBirth && (
                        <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                      <select
                        {...register('className')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Class</option>
                        {standards.map((std) => (
                          <option key={std.id} value={std.displayName}>
                            {std.displayName}
                          </option>
                        ))}
                      </select>
                      {errors.className && (
                        <p className="mt-1 text-sm text-red-600">{errors.className.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Division *</label>
                      <input
                        {...register('division')}
                        type="text"
                        placeholder="e.g., A, B"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Enter division (e.g., A, B)</p>
                      {errors.division && (
                        <p className="mt-1 text-sm text-red-600">{errors.division.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name *</label>
                      <input
                        {...register('parentName')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.parentName && (
                        <p className="mt-1 text-sm text-red-600">{errors.parentName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parent Mobile *</label>
                      <input
                        {...register('parentMobile')}
                        type="text"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.parentMobile && (
                        <p className="mt-1 text-sm text-red-600">{errors.parentMobile.message}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email *</label>
                      <input
                        {...register('parentEmail')}
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.parentEmail && (
                        <p className="mt-1 text-sm text-red-600">{errors.parentEmail.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDrawer(false);
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
                      {submitting ? 'Creating...' : 'Create Student'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Student</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this student? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Bulk Import Students</h2>
              <button
                onClick={() => {
                  setShowBulkImport(false);
                  resetBulkImport();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {bulkImportStep === 'instructions' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                    <li>Download the sample Excel file</li>
                    <li>Fill in student data following the format shown below</li>
                    <li>Upload the completed file for verification</li>
                  </ol>
                </div>
                
                {/* Static Example Table */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Example Format:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Division</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parent Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parent Mobile</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parent Email</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-3 py-2 text-gray-900">John</td>
                          <td className="px-3 py-2 text-gray-900">Doe</td>
                          <td className="px-3 py-2 text-gray-900">101</td>
                          <td className="px-3 py-2 text-gray-900">MALE</td>
                          <td className="px-3 py-2 text-gray-900">2010-05-15</td>
                          <td className="px-3 py-2 text-gray-900">10</td>
                          <td className="px-3 py-2 text-gray-900">A</td>
                          <td className="px-3 py-2 text-gray-900">Jane Doe</td>
                          <td className="px-3 py-2 text-gray-900">9876543210</td>
                          <td className="px-3 py-2 text-gray-900">jane@example.com</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-gray-900">Mary</td>
                          <td className="px-3 py-2 text-gray-900">Smith</td>
                          <td className="px-3 py-2 text-gray-900">102</td>
                          <td className="px-3 py-2 text-gray-900">FEMALE</td>
                          <td className="px-3 py-2 text-gray-900">2011-08-20</td>
                          <td className="px-3 py-2 text-gray-900">9</td>
                          <td className="px-3 py-2 text-gray-900">B</td>
                          <td className="px-3 py-2 text-gray-900">John Smith</td>
                          <td className="px-3 py-2 text-gray-900">9876543211</td>
                          <td className="px-3 py-2 text-gray-900">john@example.com</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleDownloadSample}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Download Sample .xlsx
                  </button>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowBulkImport(false);
                      resetBulkImport();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setBulkImportStep('upload')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next: Upload File
                  </button>
                </div>
              </div>
            )}

            {bulkImportStep === 'upload' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Choose File (.xlsx)</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {selectedFile && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Selected:</span> {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Click "Next" to view and edit data, then click "Verify" to validate.</p>
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setBulkImportStep('instructions')}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFile) {
                        setBulkImportStep('verify');
                      }
                    }}
                    disabled={!selectedFile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Next: View Data
                  </button>
                </div>
              </div>
            )}

            {bulkImportStep === 'verify' && selectedFile && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Student Data {editableRows.length > 0 && `(${editableRows.length} rows)`}
                  </h3>
                  <button
                    onClick={handleVerifyFile}
                    disabled={verifying || !selectedFile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>

                {!editableRows.length && !verifying && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      Click "Verify" button to load and validate student data from the uploaded file.
                    </p>
                  </div>
                )}

                {verifying && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">Verifying data...</span>
                      <span className="text-sm text-blue-700">{verifyProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${verifyProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {editableRows.length > 0 && (
                  <>
                    <div className="overflow-x-auto max-h-[60vh] border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Division</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parent Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parent Mobile</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parent Email</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {editableRows.map((row) => (
                            <tr key={row.rowNumber} className={row.status === 'invalid' ? 'bg-red-50' : row.status === 'duplicate' ? 'bg-yellow-50' : row.status === 'valid' ? 'bg-green-50' : ''}>
                              <td className="px-3 py-2">
                                <div className="flex items-center space-x-2">
                                  {row.status === 'valid' && (
                                    <div className="w-4 h-4 bg-green-500 rounded-full" title="Valid"></div>
                                  )}
                                  {row.status === 'invalid' && (
                                    <div className="w-4 h-4 bg-red-500 rounded-full" title="Invalid"></div>
                                  )}
                                  {row.status === 'duplicate' && (
                                    <div className="w-4 h-4 bg-yellow-500 rounded-full" title="Duplicate"></div>
                                  )}
                                  {row.status === 'pending' && (
                                    <div className="w-4 h-4 bg-gray-300 rounded-full" title="Pending"></div>
                                  )}
                                  {row.errors && row.errors.length > 0 && (
                                    <span className="text-xs text-red-600" title={row.errors.join(', ')}>
                                      {row.errors.length} error(s)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-gray-900">{row.rowNumber}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.firstName}
                                  onChange={(e) => handleRowUpdate(row.rowNumber, 'firstName', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.lastName}
                                  onChange={(e) => handleRowUpdate(row.rowNumber, 'lastName', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.rollNumber}
                                  onChange={(e) => handleRowUpdate(row.rowNumber, 'rollNumber', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={row.gender}
                                  onChange={(e) => handleRowUpdate(row.rowNumber, 'gender', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                >
                                  <option value="">Select</option>
                                  <option value="MALE">MALE</option>
                                  <option value="FEMALE">FEMALE</option>
                                  <option value="OTHER">OTHER</option>
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={row.dateOfBirth}
                                  onChange={(e) => handleRowUpdate(row.rowNumber, 'dateOfBirth', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.className}
                                  onChange={(e) => handleRowUpdate(row.rowNumber, 'className', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.division}
                                  onChange={(e) => handleRowUpdate(row.rowNumber, 'division', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.parentName}
                                  onChange={(e) => handleRowUpdate(row.rowNumber, 'parentName', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.parentMobile}
                                  onChange={(e) => handleRowUpdate(row.rowNumber, 'parentMobile', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="email"
                                  value={row.parentEmail}
                                  onChange={(e) => handleRowUpdate(row.rowNumber, 'parentEmail', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {verificationResult && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>Valid: {verificationResult.validRows.length}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span>Invalid: {verificationResult.invalidRows.length}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span>Duplicate: {editableRows.filter(r => r.status === 'duplicate').length}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Error Messages */}
                {verificationResult && verificationResult.invalidRows.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-2">
                      Validation Errors ({verificationResult.invalidRows.length} row(s) with errors):
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {verificationResult.invalidRows.map((invalidRow, idx) => (
                        <div key={idx} className="bg-white border border-red-300 rounded p-2">
                          <div className="font-medium text-red-900 text-sm mb-1">
                            Row {invalidRow.rowNumber}:
                          </div>
                          <ul className="list-disc list-inside space-y-1">
                            {invalidRow.errors.map((error, errorIdx) => (
                              <li key={errorIdx} className="text-xs text-red-700">{error}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setBulkImportStep('upload');
                      setSelectedFile(null);
                      setEditableRows([]);
                      setVerificationResult(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  {verificationResult && verificationResult.validRows.length > 0 && (
                    <button
                      onClick={() => setBulkImportStep('import')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Import {verificationResult.validRows.length} Valid Students
                    </button>
                  )}
                </div>
              </div>
            )}

            {bulkImportStep === 'import' && verificationResult && (
              <div className="space-y-4">
                {!importing ? (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        Ready to import <span className="font-medium">{verificationResult.validRows.length} students</span>.
                        This action will create all students in the database.
                      </p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        onClick={() => setBulkImportStep('verify')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleImportStudents}
                        disabled={importing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Confirm Import
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 font-medium mb-2">
                        Importing {verificationResult.validRows.length} students...
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${importProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">{importProgress}% complete</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
