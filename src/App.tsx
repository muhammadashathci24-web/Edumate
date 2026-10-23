import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { SignInPage } from './pages/SignInPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { FacultyDashboard } from './pages/faculty/FacultyDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ShieldAlert, LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const { profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading EduMate portal...</span>
      </div>
    );
  }

  // Not signed in
  if (!profile) {
    return <SignInPage />;
  }

  // Account disabled check
  if (profile.status === 'disabled') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div className="card-body" style={{ padding: '2.5rem 1.5rem' }}>
            <ShieldAlert size={48} style={{ color: 'var(--color-danger)', margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Account Deactivated
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Your EduMate institutional account has been deactivated by the college administration.
              Please reach out to your department office for assistance.
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => signOut()}>
              <LogOut size={16} /> Return to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Role-based Router
  return (
    <div className="app-container">
      <Navbar />
      <main style={{ flex: 1 }}>
        {profile.role === 'admin' && <AdminDashboard />}
        {profile.role === 'faculty' && <FacultyDashboard />}
        {profile.role === 'student' && <StudentDashboard />}
        {profile.role !== 'admin' && profile.role !== 'faculty' && profile.role !== 'student' && (
          <div className="main-content">
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                <ShieldAlert size={40} style={{ color: 'var(--color-danger)', margin: '0 auto 1rem auto' }} />
                <h3>Unauthorized Role</h3>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  Your account does not possess a valid role assignment.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: '1rem' }}
                  onClick={() => signOut()}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
