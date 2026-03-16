import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Cpu, BarChart3, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from './Login';

export default function LandingPage() {
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  // Redirect after login
  React.useEffect(() => {
    if (currentUser && userRole) {
      if (userRole === 'super_admin') navigate('/superadmin');
      else if (userRole === 'school_admin') navigate('/schooladmin');
      else if (userRole === 'teacher') navigate('/teacher');
      else if (userRole === 'student') navigate('/student');
    }
  }, [currentUser, userRole, navigate]);

  return (
    <div className="app-container" style={{ background: 'var(--bg-primary)', overflowX: 'hidden', position: 'relative', minHeight: '100vh' }}>
      <style>{`
        @keyframes mesh-pulse {
          0% { transform: scale(1) translate(0, 0); opacity: 0.5; }
          33% { transform: scale(1.3) translate(10%, -10%); opacity: 0.8; }
          66% { transform: scale(0.9) translate(-5%, 15%); opacity: 0.6; }
          100% { transform: scale(1) translate(0, 0); opacity: 0.5; }
        }
        @keyframes blur-in {
          from { filter: blur(20px); opacity: 0; transform: translateY(40px); }
          to { filter: blur(0); opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-right {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .mesh-container {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          z-index: -1; pointer-events: none; overflow: hidden;
          background: #f8fafc;
        }
        .mesh-circle {
          position: absolute; border-radius: 50%; filter: blur(120px);
          animation: mesh-pulse 20s ease-in-out infinite;
        }
        .c1 { width: 70vw; height: 70vw; background: rgba(37, 99, 235, 0.12); top: -20%; left: -10%; }
        .c2 { width: 60vw; height: 60vw; background: rgba(124, 58, 237, 0.12); bottom: -10%; right: -10%; animation-delay: -7s; }
        .c3 { width: 50vw; height: 50vw; background: rgba(8, 145, 178, 0.08); top: 30%; right: 10%; animation-delay: -14s; }

        .glass-nav {
          background: rgba(255, 255, 255, 0.6) !important;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          padding: 1.25rem 3rem;
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.6) !important;
          backdrop-filter: blur(16px) saturate(200%);
          -webkit-backdrop-filter: blur(16px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.6) !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.04) !important;
        }

        .hero-title {
          font-size: clamp(2.5rem, 5vw, 4.5rem);
          line-height: 1.1;
          letter-spacing: -0.05em;
          font-weight: 800;
          background: linear-gradient(135deg, #0f172a 0%, #2563eb 50%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .reveal { animation: blur-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .slide-in { animation: slide-right 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }

        .ref-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.5);
          transition: all 0.3s;
        }
        .ref-item:hover {
          background: rgba(255, 255, 255, 0.8);
          transform: translateX(10px);
        }

        @media (max-width: 1024px) {
          .glass-nav { padding: 1rem 1.5rem; }
          .main-grid { 
            grid-template-columns: 1fr !important; 
            padding-top: 8rem !important;
            gap: 3rem !important;
            text-align: center;
          }
          .hero-title { font-size: 3rem; }
          .hero-p { margin: 0 auto 3rem !important; }
          .ref-grid { margin: 0 auto !important; }
          .ref-item { text-align: left; }
        }

        @media (max-width: 640px) {
          .hero-title { font-size: 2.25rem; }
          .ref-item { padding: 1rem; }
          .glass-nav span { display: none; }
        }
      `}</style>

      {/* Premium Mesh Background */}
      <div className="mesh-container">
        <div className="mesh-circle c1"></div>
        <div className="mesh-circle c2"></div>
        <div className="mesh-circle c3"></div>
      </div>

      {/* Navbar */}
      <nav className="glass-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--grad-blue)', padding: '10px', borderRadius: '12px' }}>
            <Shield size={24} color="white" />
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', fontFamily: 'Space Grotesk' }}>
            Exam<span style={{ color: 'var(--accent-blue)' }}>Portal</span>
          </span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
          Professional Management Suite
        </div>
      </nav>

      {/* Main Content: Split Hero */}
      <main className="main-grid" style={{ 
        padding: '10rem 3rem 5rem', 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', 
        gap: '4rem', 
        maxWidth: '1440px', 
        margin: '0 auto', 
        minHeight: '100vh',
        alignItems: 'center'
      }}>
        
        {/* Left Side: Brief Branding & Reference */}
        <div className="reveal">
          <div style={{ 
            display: 'inline-flex', 
            padding: '0.6rem 1.2rem', 
            background: 'rgba(37,99,235,0.08)', 
            borderRadius: '100px', 
            color: 'var(--accent-blue)', 
            fontWeight: 700, 
            fontSize: '0.85rem', 
            marginBottom: '2rem' 
          }}>
            V2.0 · INTELLIGENCE-DRIVEN
          </div>
          <h1 className="hero-title" style={{ marginBottom: '2rem' }}>
            Next-Gen CBT <br /> Infrastructure.
          </h1>
          <p className="hero-p" style={{ 
            fontSize: '1.2rem', 
            color: 'var(--text-secondary)', 
            marginBottom: '4rem', 
            lineHeight: 1.6, 
            maxWidth: '540px' 
          }}>
            A condensed, elite examination ecosystem designed for uncompromising performance. 
            Access your portal directly or explore the reference suite.
          </p>

          <div className="ref-grid" style={{ display: 'grid', gap: '1.25rem', maxWidth: '400px' }}>
            <div className="ref-item">
              <div style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', padding: '10px', borderRadius: '12px' }}>
                <Cpu size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>AI-Engine v3</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Automated paper generation</div>
              </div>
            </div>
            <div className="ref-item">
              <div style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)', padding: '10px', borderRadius: '12px' }}>
                <Shield size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Secure Proct</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Zero-trust exam environment</div>
              </div>
            </div>
            <div className="ref-item">
              <div style={{ background: 'var(--accent-cyan-light)', color: 'var(--accent-cyan)', padding: '10px', borderRadius: '12px' }}>
                <BarChart3 size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>ELITE Analytics</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Deep performance insights</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Integrated Login form */}
        <div className="reveal" style={{ animationDelay: '200ms' }}>
          <div className="glass-card" style={{ 
            padding: '1.5rem', 
            borderRadius: '32px', 
            boxShadow: '0 30px 60px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255,255,255,0.8)',
            overflow: 'hidden'
          }}>
            <LoginForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '3rem', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem', position: 'relative', zIndex: 1 }}>
        <p>© 2026 ExamPortal Corporate. Powered by Makemyportal.</p>
      </footer>
    </div>
  );
}
