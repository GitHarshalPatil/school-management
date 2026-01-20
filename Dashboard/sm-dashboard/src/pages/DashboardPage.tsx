import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { schoolService } from '../services/schoolService';
import type { SchoolInfo } from '../types';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (user?.schoolId) {
        try {
          const info = await schoolService.getSchoolInfo();
          setSchoolInfo(info);
        } catch (error) {
          console.error('Failed to fetch school info:', error);
        }
      }
      setLoading(false);
    };

    fetchSchoolInfo();
  }, [user]);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Administrator';
      case 'SCHOOL_ADMIN':
        return 'School Administrator';
      case 'TEACHER':
        return 'Teacher';
      case 'PARENT':
        return 'Parent';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">School Management Dashboard</h1>
              {user?.role === 'SCHOOL_ADMIN' && (
                <>
                  <button
                    onClick={() => navigate('/teachers')}
                    className="text-sm text-gray-700 hover:text-blue-600 font-medium"
                  >
                    Teachers
                  </button>
                  <button
                    onClick={() => navigate('/classes')}
                    className="text-sm text-gray-700 hover:text-blue-600 font-medium"
                  >
                    Classes
                  </button>
                  <button
                    onClick={() => navigate('/students')}
                    className="text-sm text-gray-700 hover:text-blue-600 font-medium"
                  >
                    Students
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${user?.role === 'SUPER_ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : user?.role === 'SCHOOL_ADMIN'
                        ? 'bg-blue-100 text-blue-700'
                        : user?.role === 'TEACHER'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome!</h2>
              <p className="text-gray-600 mb-2">
                You are logged in as <span className="font-semibold">{getRoleDisplayName(user?.role || '')}</span>
              </p>
              {user?.role === 'SUPER_ADMIN' && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800 font-semibold mb-1">Master Administrator</p>
                  <p className="text-xs text-purple-700">
                    You have system-wide access. You can manage schools and system settings.
                  </p>
                </div>
              )}
              {user?.role === 'SCHOOL_ADMIN' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-semibold mb-1">School Administrator</p>
                  <p className="text-xs text-blue-700">
                    You have full access to manage your school, teachers, and students.
                  </p>
                </div>
              )}
            </div>

            {user?.role === 'SUPER_ADMIN' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Super Admin Actions</h3>
                <div className="space-y-4">
                  {!schoolInfo && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-3">
                        No school has been set up yet. You can set up the first school.
                      </p>
                      <button
                        onClick={() => navigate('/setup')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Setup School
                      </button>
                    </div>
                  )}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800 font-semibold mb-2">System Management</p>
                    <p className="text-xs text-purple-700">
                      As Super Admin, you have access to all system features. You can manage schools, view all data, and configure system settings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {schoolInfo && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">School Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">School Name</p>
                    <p className="text-lg font-medium text-gray-900">{schoolInfo.name}</p>
                  </div>
                  {schoolInfo.logo && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">School Logo</p>
                      <img
                        src={`http://localhost:3000${schoolInfo.logo}`}
                        alt="School Logo"
                        className="h-20 w-20 object-contain"
                      />
                    </div>
                  )}
                  {schoolInfo.email && (
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900">{schoolInfo.email}</p>
                    </div>
                  )}
                  {schoolInfo.phone && (
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="text-gray-900">{schoolInfo.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {user?.role === 'SCHOOL_ADMIN' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => navigate('/teachers')}
                    className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-left transition-colors"
                  >
                    <h4 className="font-semibold text-gray-900 mb-1">Manage Teachers</h4>
                    <p className="text-sm text-gray-600">Create and manage teacher accounts</p>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Features</h3>
              <p className="text-gray-600">
                Dashboard features will be available based on your role. More features coming soon!
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

