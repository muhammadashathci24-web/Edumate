import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  const roleLabel = {
    admin: 'Administrator',
    faculty: 'Faculty Member',
    student: 'Student',
  }[profile.role] || profile.role;

  const badgeClass = {
    admin: 'badge-admin',
    faculty: 'badge-faculty',
    student: 'badge-student',
  }[profile.role] || 'badge-student';

  const displayName =
    profile.name && profile.name !== 'Demo System Administrator'
      ? profile.name
      : profile.role === 'admin'
      ? 'Administrator'
      : profile.email || 'User';

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand-wrapper">
          <div className="brand-logo-icon" aria-hidden="true">
            <GraduationCap size={20} />
          </div>
          <div>
            <div className="brand-title">EduMate</div>
            <div className="brand-subtitle">Student Support Portal</div>
          </div>
        </div>

        <div className="nav-user-actions">
          <div className="user-identity">
            <span className="user-name-text" title={displayName}>
              {displayName}
            </span>
            <span className={`badge ${badgeClass}`}>{roleLabel}</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => signOut()}
            aria-label="Sign out of account"
            title="Sign Out"
          >
            <LogOut size={16} />
            <span style={{ display: 'inline-block' }}>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
