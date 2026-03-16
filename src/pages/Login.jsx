import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Shield, GraduationCap, Users, Building2, LogIn, KeyRound, Mail, Hash, User, Home } from 'lucide-react';

/* ──────────────────────────────────────────────────
   ROLE TABS CONFIG
────────────────────────────────────────────────── */
const ROLES = [
  {
    id: 'student',
    label: 'Student',
    icon: Users,
    color: 'var(--accent-cyan)',
    lightBg: 'var(--accent-cyan-light)',
    grad: 'var(--grad-cyan)',
    fields: 'rollno',   // login with roll number + password
    placeholder1: 'Your Roll Number (e.g. 2024001)',
    placeholder2: 'Password',
  },
  {
    id: 'teacher',
    label: 'Teacher',
    icon: GraduationCap,
    color: 'var(--accent-purple)',
    lightBg: 'var(--accent-purple-light)',
    grad: 'var(--grad-purple)',
    fields: 'name',     // login with name + password
    placeholder1: 'Your Full Name',
    placeholder2: 'Password',
  },
  {
    id: 'school_admin',
    label: 'School Admin',
    icon: Building2,
    color: 'var(--accent-blue)',
    lightBg: 'var(--accent-blue-light)',
    grad: 'var(--grad-blue)',
    fields: 'email',
    placeholder1: 'Admin Email Address',
    placeholder2: 'Password',
  },
  {
    id: 'super_admin',
    label: 'Super Admin',
    icon: Shield,
    color: '#dc2626',
    lightBg: '#fff1f2',
    grad: 'var(--grad-rose)',
    fields: 'email',
    placeholder1: 'Super Admin Email',
    placeholder2: 'Password',
  },
];

export function LoginForm({ onLoginSuccess }) {
  const [activeRole, setActiveRole] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, userRole } = useAuth();

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && ROLES.find(r => r.id === roleParam)) {
      setActiveRole(roleParam);
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let emailToUse = identifier.trim();

      if (activeRole === 'student') {
        const snap = await getDocs(query(collection(db, 'students'), where('rollNo', '==', identifier.trim())));
        if (snap.empty) {
          setError('No student found with this Roll Number.');
          setLoading(false);
          return;
        }
        emailToUse = snap.docs[0].data().email;
      }

      if (activeRole === 'teacher') {
        const snap = await getDocs(query(collection(db, 'teachers'), where('name', '==', identifier.trim())));
        if (snap.empty) {
          if (!identifier.includes('@')) {
            setError('No teacher found with this name. Try entering your email instead.');
            setLoading(false);
            return;
          }
          emailToUse = identifier.trim();
        } else {
          emailToUse = snap.docs[0].data().email;
        }
      }

      await signInWithEmailAndPassword(auth, emailToUse, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      const msgs = {
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid credentials.',
        'auth/user-not-found': 'No account found.',
      };
      setError(msgs[err.code] || `Error: ${err.message}`);
    }
    setLoading(false);
  };

  const switchRole = (roleId) => {
    setActiveRole(roleId);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  const currentRoleCfg = ROLES.find(r => r.id === activeRole);
  const fieldIcon = activeRole === 'student' ? <Hash size={16} /> : activeRole === 'teacher' ? <User size={16} /> : <Mail size={16} />;
  const field1Label = activeRole === 'student' ? 'Roll Number' : activeRole === 'teacher' ? 'Full Name' : 'Email Address';

  return (
    <div style={{ width: '100%' }}>
      {/* Role Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ROLES.filter(r => r.id !== 'super_admin').length}, 1fr)`, gap: 8, marginBottom: '1.5rem', background: '#fff', padding: 6, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
        {ROLES.filter(r => r.id !== 'super_admin').map(role => {
          const isActive = activeRole === role.id;
          return (
            <button key={role.id} onClick={() => switchRole(role.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0.75rem 0.5rem',
              borderRadius: 'var(--radius-md)', border: isActive ? `1.5px solid ${role.color}30` : '1.5px solid transparent',
              background: isActive ? role.lightBg : 'transparent', cursor: 'pointer', transition: 'all .2s'
            }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? `${role.color}20` : 'var(--bg-tertiary)', color: isActive ? role.color : 'var(--text-muted)' }}>
                <role.icon size={16} />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500, color: isActive ? role.color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1 }}>{role.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card glass-card" style={{ padding: '2rem', borderTop: `4px solid ${currentRoleCfg.color}` }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'Space Grotesk' }}>{currentRoleCfg.label} Login</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{currentRoleCfg.placeholder1} and password</p>

        {error && <div style={{ padding: '0.75rem', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid rgba(225,29,72,.1)', fontSize: '0.85rem' }}>⚠ {error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">{field1Label}</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>{fieldIcon}</span>
              <input className="input-field" style={{ paddingLeft: 38 }} value={identifier} onChange={e => setIdentifier(e.target.value)} required placeholder={currentRoleCfg.placeholder1} type={activeRole === 'school_admin' || activeRole === 'super_admin' ? 'email' : 'text'} />
            </div>
          </div>
          <div>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input-field" style={{ paddingLeft: 38 }} type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" className="btn" disabled={loading} style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', background: currentRoleCfg.grad, color: '#fff', borderRadius: '12px' }}>
            {loading ? 'Verifying...' : <><LogIn size={18} /> Sign In</>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();
  
  useEffect(() => {
    if (currentUser && userRole) {
      if (userRole === 'super_admin') navigate('/superadmin');
      else if (userRole === 'school_admin') navigate('/schooladmin');
      else if (userRole === 'teacher') navigate('/teacher');
      else if (userRole === 'student') navigate('/student');
    }
  }, [currentUser, userRole, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--grad-blue)', borderRadius: '20px', marginBottom: '1rem' }}>
            <Shield size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '2rem', fontFamily: 'Space Grotesk' }} className="gradient-text-blue">ExamPortal</h1>
        </div>
        
        <LoginForm />

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ border: 'none', color: 'var(--text-muted)' }}>
            <Home size={16} /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
