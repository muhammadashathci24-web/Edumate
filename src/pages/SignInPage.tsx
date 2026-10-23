import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '../components/Alert';
import { GraduationCap, Lock, Mail, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

export const SignInPage: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both your college email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for evaluation / local testing
  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo@12345');
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: 'var(--color-bg-page)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #1e3a8a, #0f766e)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <GraduationCap size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
            EduMate
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem', marginTop: '0.25rem' }}>
            Student Support & Academic Records Portal
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="card-body" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>
              Sign In
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Sign in with your official college credentials to access your dashboard.
            </p>

            {error && <Alert type="danger" message={error} onClose={() => setError(null)} />}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="college-email">
                  College Email Address <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '0.8rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-subtle)',
                    }}
                  />
                  <input
                    id="college-email"
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="e.g. yourname.demo@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <span className="form-helper">Use your registered institutional email address.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="account-password">
                  Password <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '0.8rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-subtle)',
                    }}
                  />
                  <input
                    id="account-password"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
                disabled={submitting}
              >
                {submitting ? 'Authenticating...' : 'Sign In to Portal'}
                {!submitting && <ArrowRight size={18} />}
              </button>
            </form>

            {/* Note on account creation */}
            <div
              style={{
                marginTop: '1.75rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
              }}
            >
              <ShieldCheck size={16} style={{ color: 'var(--color-secondary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Restricted Access:</strong> Accounts are provisioned and managed by the college administration.
                Self-registration is disabled. If you do not have credentials, contact your department office.
              </div>
            </div>
          </div>
        </div>

        {/* Development / Demo Quick-Fill Bar */}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--color-warning)',
              marginBottom: '0.5rem',
            }}
          >
            <HelpCircle size={15} />
            <span>Local Evaluation & Demo Accounts (Password: Demo@12345)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillDemoAccount('admin@college.edu')}
            >
              Admin Demo
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillDemoAccount('faculty.aiml1@college.edu')}
            >
              Faculty (AIML 3-A & 3-B)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillDemoAccount('faculty.aiml2@college.edu')}
            >
              Faculty (AIML 3-C)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillDemoAccount('aarav.demo@college.edu')}
            >
              Student (AIML 3-A)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
