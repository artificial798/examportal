import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Shield, GraduationCap, Users, Building2, LogIn, KeyRound, Mail, Hash, User } from 'lucide-react';

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

export default function Login() {
  const [activeRole, setActiveRole] = useState('student');
  const [identifier, setIdentifier] = useState('');  // roll no / name / email
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  // Already logged in? Redirect.
  useEffect(() => {
    if (currentUser && userRole) {
      redirectByRole(userRole);
    }
  }, [currentUser, userRole]);

  const redirectByRole = (role) => {
    if (role === 'super_admin')  navigate('/superadmin');
    else if (role === 'school_admin') navigate('/schooladmin');
    else if (role === 'teacher') navigate('/teacher');
    else if (role === 'student') navigate('/student');
  };

  const currentRoleCfg = ROLES.find(r => r.id === activeRole);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let emailToUse = identifier.trim();

      // ── Student: lookup email by roll number ──
      if (activeRole === 'student') {
        const snap = await getDocs(query(collection(db, 'students'), where('rollNo', '==', identifier.trim())));
        if (snap.empty) {
          setError('No student found with this Roll Number.');
          setLoading(false);
          return;
        }
        emailToUse = snap.docs[0].data().email;
      }

      // ── Teacher: lookup email by name ──
      if (activeRole === 'teacher') {
        const snap = await getDocs(query(collection(db, 'teachers'), where('name', '==', identifier.trim())));
        if (snap.empty) {
          // Also try email-based login for teachers (fallback)
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
      // AuthContext will handle role detection & redirect

    } catch (err) {
      const msgs = {
        'auth/wrong-password':      'Incorrect password. Please try again.',
        'auth/invalid-credential':  'Invalid credentials. Please check and try again.',
        'auth/user-not-found':      'No account found. Check your credentials.',
        'auth/too-many-requests':   'Too many attempts. Please wait a moment.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
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

  // Field 1 icon + label
  const fieldIcon = activeRole === 'student'  ? <Hash size={16} />
    : activeRole === 'teacher' ? <User size={16} />
    : <Mail size={16} />;

  const field1Label = activeRole === 'student'  ? 'Roll Number'
    : activeRole === 'teacher' ? 'Full Name'
    : 'Email Address';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #eff6ff 0%, #f8f4ff 50%, #ecfeff 100%)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width:'100%', maxWidth:480 }} className="animate-slide-up">

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ display:'inline-flex', padding:'0.9rem', background:'var(--grad-blue)', borderRadius:'var(--radius-xl)', marginBottom:'1rem', boxShadow:'0 8px 24px var(--accent-blue-glow)' }}>
            <Shield size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize:'1.7rem', fontFamily:'Space Grotesk', marginBottom:'0.3rem' }} className="gradient-text-blue">ExamPortal</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>Select your role and sign in</p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:'1.5rem', background:'#fff', padding:6, borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-sm)', border:'1px solid var(--border-light)' }}>
          {ROLES.map(role => {
            const isActive = activeRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => switchRole(role.id)}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                  padding:'0.75rem 0.5rem',
                  borderRadius:'var(--radius-md)',
                  border: isActive ? `1.5px solid ${role.color}30` : '1.5px solid transparent',
                  background: isActive ? role.lightBg : 'transparent',
                  cursor:'pointer',
                  transition:'all .2s',
                  fontFamily:'inherit',
                }}
              >
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: isActive ? `${role.color}20` : 'var(--bg-tertiary)',
                  color: isActive ? role.color : 'var(--text-muted)',
                  transition:'all .2s',
                }}>
                  <role.icon size={18} />
                </div>
                <span style={{
                  fontSize:'0.7rem', fontWeight: isActive ? 700 : 500,
                  color: isActive ? role.color : 'var(--text-muted)',
                  textAlign:'center', lineHeight:1.2,
                }}>
                  {role.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding:'2rem', borderTop: `3px solid ${currentRoleCfg.color}` }}>
          {/* Card Header */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem' }}>
            <div style={{ width:44, height:44, borderRadius:'var(--radius-md)', background: currentRoleCfg.lightBg, display:'flex', alignItems:'center', justifyContent:'center', color: currentRoleCfg.color }}>
              <currentRoleCfg.icon size={22}/>
            </div>
            <div>
              <h2 style={{ fontSize:'1.1rem', marginBottom:2 }}>{currentRoleCfg.label} Login</h2>
              <p style={{ fontSize:'0.8rem' }}>
                {activeRole === 'student'
                  ? 'Enter your roll number and password'
                  : activeRole === 'teacher'
                  ? 'Enter your name and portal password'
                  : 'Enter your email and password'}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding:'0.75rem 1rem', background:'var(--accent-rose-light)', color:'var(--accent-rose)', borderRadius:'var(--radius-md)', marginBottom:'1.25rem', border:'1px solid rgba(225,29,72,.15)', fontSize:'0.875rem', fontWeight:500 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {/* Field 1 */}
            <div>
              <label className="input-label">{field1Label}</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', top:'50%', left:12, transform:'translateY(-50%)', color:'var(--text-muted)', display:'flex' }}>
                  {fieldIcon}
                </span>
                <input
                  className="input-field"
                  style={{ paddingLeft:38 }}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  placeholder={currentRoleCfg.placeholder1}
                  type={activeRole === 'school_admin' || activeRole === 'super_admin' ? 'email' : 'text'}
                  autoComplete="off"
                />
              </div>
              {activeRole === 'teacher' && (
                <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>
                  Tip: Enter your full name exactly as registered, or your email address.
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div style={{ position:'relative' }}>
                <KeyRound size={16} style={{ position:'absolute', top:'50%', left:12, transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
                <input
                  className="input-field"
                  style={{ paddingLeft:38 }}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{
                width:'100%',
                padding:'0.75rem',
                marginTop:'0.25rem',
                fontSize:'0.95rem',
                background: currentRoleCfg.grad,
                color:'#fff',
                boxShadow: `0 4px 15px ${currentRoleCfg.color}30`,
              }}
            >
              {loading
                ? 'Verifying…'
                : <><LogIn size={17}/> Sign In as {currentRoleCfg.label}</>}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:'1.25rem', fontSize:'0.78rem', color:'var(--text-muted)' }}>
          Exam Portal · Powered by Firebase · All rights reserved
        </p>
      </div>
    </div>
  );
}
