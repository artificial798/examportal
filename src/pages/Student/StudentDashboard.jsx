import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, Award, LogOut, User, BookOpen, CheckCircle2, Download } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { downloadDetailedResult } from '../../services/pdfService';

export default function StudentDashboard() {
  const navigate   = useNavigate();
  const { currentUser } = useAuth();
  const [exams, setExams]       = useState([]);
  const [results, setResults]   = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('exams'); // 'exams' | 'results'

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        // Get student profile
        const stuSnap = await getDocs(query(collection(db,'students'), where('uid','==',currentUser.uid)));
        if (!stuSnap.empty) setStudentInfo({ id: stuSnap.docs[0].id, ...stuSnap.docs[0].data() });

        // Get user doc for schoolId & subjects
        const userDoc = await getDoc(doc(db,'users', currentUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const schoolId = userData.schoolId;

        // Load exams for this school — filter Active + class in JS
        if (schoolId) {
          const sDoc = await getDoc(doc(db, 'schools', schoolId));
          if (sDoc.exists()) {
            const sd = sDoc.data();
            setSchoolProfile({
              logoBase64: sd.logoBase64 || '',
              address:    sd.address    || '',
              phone:      sd.phone      || '',
              board:      sd.board      || '',
              schoolCode: sd.schoolCode || '',
              principal:  sd.principal  || '',
              tagline:    sd.tagline    || '',
              name:       sd.name       || ''
            });
          }

          const snap = await getDocs(query(collection(db,'exams'), where('schoolId','==',schoolId)));
          const stuData      = stuSnap.empty ? {} : stuSnap.docs[0].data();
          const studentClass = (stuData.class || userData.class || '').trim().toLowerCase();

          const filtered = snap.docs
            .map(d => ({ id:d.id, ...d.data() }))
            .filter(exam => {
              // Must be Active
              if (exam.status !== 'Active') return false;
              // targetClass blank = show to all; otherwise must match student class
              const tc = (exam.targetClass || '').trim().toLowerCase();
              return tc === '' || tc === studentClass;
            });

          setExams(filtered);
        }

        // Load student's submitted results
        const rSnap = await getDocs(query(collection(db,'results'), where('studentUid','==',currentUser.uid)));
        setResults(rSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, [currentUser]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const isSubmitted = (examId) => results.some(r => r.examId === examId);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid var(--border-light)', padding:'0.875rem 2rem', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'var(--shadow-sm)', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div className="icon-box cyan lg"><User size={22}/></div>
          <div>
            <div style={{ fontWeight:700, fontFamily:'Space Grotesk', fontSize:'1rem' }}>Student Portal</div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
              {studentInfo?.name || currentUser?.email}
              {studentInfo?.rollNo ? ` · Roll: ${studentInfo.rollNo}` : ''}
              {studentInfo?.class  ? ` · Class: ${studentInfo.class}` : ''}
            </div>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={handleLogout} style={{ color:'var(--accent-rose)', gap:8 }}>
          <LogOut size={16}/> Sign Out
        </button>
      </div>

      <div style={{ padding:'2rem', maxWidth:1100, margin:'0 auto' }}>
        {/* Banner */}
        <div className="page-header-band" style={{ marginBottom:'1.75rem' }}>
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,.7)', fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>STUDENT PORTAL</div>
            <h2 style={{ color:'#fff', fontSize:'1.5rem', marginBottom:4 }}>Welcome, {studentInfo?.name || 'Student'}! 👋</h2>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.875rem' }}>
              {exams.filter(e=>e.status==='Active'&&!isSubmitted(e.id)).length} exam(s) available · {results.length} submitted
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-row" style={{ maxWidth:320, marginBottom:'1.5rem' }}>
          <button className={`tab-btn ${tab==='exams'?'active':''}`} onClick={()=>setTab('exams')}>📋 My Exams</button>
          <button className={`tab-btn ${tab==='results'?'active':''}`} onClick={()=>setTab('results')}>📊 Submitted</button>
        </div>

        {loading && <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'3rem' }}>Loading…</div>}

        {/* EXAMS TAB */}
        {!loading && tab==='exams' && (
          <div>
            {exams.length === 0 && (
              <div className="card" style={{ padding:'3rem', textAlign:'center' }}>
                <BookOpen size={40} color="var(--text-muted)" style={{ marginBottom:12, opacity:.4 }}/>
                <h3 style={{ marginBottom:8 }}>No Exams Available</h3>
                <p style={{ fontSize:'0.875rem' }}>Your teacher hasn't published any exams yet. Check back later.</p>
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'1.25rem' }}>
              {exams.map(exam => {
                const submitted = isSubmitted(exam.id);
                const isActive  = exam.status === 'Active';
                return (
                  <div key={exam.id} className="card" style={{ padding:'1.5rem', borderTop:`3px solid ${submitted?'var(--border-medium)':isActive?'var(--accent-emerald)':'var(--accent-amber)'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
                      <div className="icon-box cyan"><FileText size={18}/></div>
                      <span className={`badge ${submitted?'warning':isActive?'success':'info'}`}>
                        {submitted ? 'Submitted' : exam.status}
                      </span>
                    </div>
                    <h4 style={{ fontSize:'1rem', marginBottom:'0.35rem' }}>{exam.title}</h4>
                    <p style={{ fontSize:'0.8rem', marginBottom:'1rem' }}>{exam.subject || exam.description || ''}</p>
                    <div style={{ display:'flex', gap:'1rem', fontSize:'0.83rem', color:'var(--text-secondary)', marginBottom:'1.25rem' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={14}/> {exam.duration||60} mins</span>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}><Award size={14}/> {exam.totalMarks || (exam.questions||[]).length} Marks</span>
                    </div>
                    {exam.instructions && (
                      <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'1rem', fontStyle:'italic', borderLeft:'3px solid var(--border-light)', paddingLeft:10 }}>
                        {exam.instructions}
                      </p>
                    )}
                    <button
                      className="btn"
                      style={{ width:'100%', background: submitted||!isActive ? 'var(--bg-tertiary)' : 'var(--grad-emerald)', color: submitted||!isActive ? 'var(--text-secondary)' : '#fff' }}
                      disabled={submitted || !isActive}
                      onClick={() => navigate(`/student/exam/${exam.id}`)}
                    >
                      {submitted ? <><CheckCircle2 size={16}/> Already Submitted</> : isActive ? 'Start Exam →' : 'Not Available Yet'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBMITTED TAB (student sees only participation, not marks) */}
        {!loading && tab==='results' && (
          <div>
            {results.length === 0 && (
              <div className="card" style={{ padding:'3rem', textAlign:'center' }}>
                <Award size={40} color="var(--text-muted)" style={{ marginBottom:12, opacity:.4 }}/>
                <h3 style={{ marginBottom:8 }}>No Submissions Yet</h3>
                <p style={{ fontSize:'0.875rem' }}>Start an exam to see your submission history here.</p>
              </div>
            )}
            <div className="card" style={{ overflow:'hidden' }}>
              {results.length > 0 && (
                <table className="data-table">
                  <thead><tr><th>Exam</th><th>Score</th><th>%</th><th>Grade</th><th>Submitted On</th><th>Actions</th></tr></thead>
                  <tbody>
                    {results.map(r => {
                      const pct = r.percentage || 0;
                      const getGrade = (p) => p>=90?'A+':p>=80?'A':p>=70?'B+':p>=60?'B':p>=50?'C':p>=40?'D':'F';
                      const getGradeColor = (p) => p>=80?'var(--accent-emerald)':p>=60?'var(--accent-blue)':p>=40?'var(--accent-amber)':'var(--accent-rose)';
                      return (
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight:600 }}>{r.examTitle||'—'}</div>
                            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{r.subject||'—'}</div>
                          </td>
                          <td style={{ fontWeight:700 }}>{r.score||0}/{r.totalMarks||0}</td>
                          <td style={{ fontWeight:700, color:pct>=40?'var(--accent-emerald)':'var(--accent-rose)' }}>{pct}%</td>
                          <td>
                            <span style={{ fontWeight:800, fontSize:'0.85rem', color:getGradeColor(pct), padding:'2px 6px', background:`${getGradeColor(pct)}15`, borderRadius:6 }}>{getGrade(pct)}</span>
                          </td>
                          <td style={{ color:'var(--text-secondary)', fontSize:'0.83rem' }}>
                            {r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td>
                             {r.isApproved ? (
                               <button className="btn btn-ghost btn-sm" title="Download Report Card"
                                 onClick={() => downloadDetailedResult(r, schoolProfile?.name || 'School', schoolProfile)}
                                 style={{ color:'var(--accent-blue)', display:'flex', alignItems:'center', gap:5 }}>
                                 <Download size={14}/> Report
                               </button>
                             ) : (
                               <span style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4, padding:'4px 8px', background:'var(--bg-tertiary)', borderRadius:6 }}>
                                 <Clock size={12}/> Pending
                               </span>
                             )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ marginTop:'1rem', padding:'0.75rem 1rem', background:'var(--accent-blue-light)', borderRadius:'var(--radius-md)', fontSize:'0.83rem', color:'var(--accent-blue)', border:'1px solid rgba(37,99,235,.15)' }}>
              ℹ️ Marks and results are reviewed by your teacher / school admin and will be shared with you through official channels.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
