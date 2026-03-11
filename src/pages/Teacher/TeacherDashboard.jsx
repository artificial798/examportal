import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FilePlus, Edit3, BarChart2, Trash2, Plus, LogOut,
  GraduationCap, CheckCircle2, AlertTriangle, X, Users,
  Clock, BookOpen, TrendingUp, Eye
} from 'lucide-react';
import {
  collection, getDocs, addDoc, deleteDoc, doc,
  query, where, serverTimestamp, updateDoc, getDoc
} from 'firebase/firestore';

import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

/* ──── TOAST ──── */
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const col = type === 'error' ? 'var(--accent-rose)' : type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-blue)';
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background:'#fff', borderLeft:`4px solid ${col}`, borderRadius:'var(--radius-md)', padding:'0.875rem 1.25rem', boxShadow:'var(--shadow-lg)', display:'flex', alignItems:'center', gap:12, maxWidth:380 }}>
      <CheckCircle2 size={18} color={col}/>
      <span style={{ fontSize:'0.875rem', flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16}/></button>
    </div>
  );
}

/* ──── CREATE EXAM TAB ──── */
function CreateExamTab({ teacherInfo, schoolId, showToast, onCreated }) {
  const [form, setForm] = useState({ title:'', subject:'', duration:60, instructions:'', passingMarks:40 });
  const [questions, setQuestions] = useState([{ text:'', options:['','','',''], correctAnswer:'' }]);
  const [saving, setSaving] = useState(false);

  const updateQ = (qi, field, val) => {
    setQuestions(qs => qs.map((q,i) => i===qi ? {...q, [field]:val} : q));
  };

  const updateOpt = (qi, oi, val) => {
    setQuestions(qs => qs.map((q,i) => i===qi ? {...q, options: q.options.map((o,j)=>j===oi?val:o)} : q));
  };

  const addQuestion = () => setQuestions(qs => [...qs, { text:'', options:['','','',''], correctAnswer:'' }]);

  const removeQuestion = (qi) => setQuestions(qs => qs.filter((_,i)=>i!==qi));

  const handlePublish = async (status) => {
    if (!form.title.trim()) { showToast('Enter exam title.','error'); return; }
    if (questions.some(q=>!q.text.trim())) { showToast('Fill all question texts.','error'); return; }
    setSaving(true);
    try {
      const ref = await addDoc(collection(db,'exams'), {
        ...form,
        schoolId,
        teacherUid:  teacherInfo?.uid || '',
        teacherName: teacherInfo?.name || '',
        questions,
        status,
        createdAt: serverTimestamp(),
      });
      showToast(status==='Active' ? 'Exam published! Students can now take it.' : 'Draft saved.', 'success');
      onCreated({ id: ref.id, ...form, questions, status });
      setForm({ title:'', subject:'', duration:60, instructions:'', passingMarks:40 });
      setQuestions([{ text:'', options:['','','',''], correctAnswer:'' }]);
    } catch(e) { showToast('Error: '+e.message,'error'); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Create New Exam</h2>
      <p style={{ fontSize:'0.85rem', marginBottom:'1.5rem' }}>Build the exam, add questions, then publish or save as draft.</p>

      {/* Basic Info */}
      <div className="card" style={{ padding:'1.5rem', marginBottom:'1.25rem' }}>
        <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem', color:'var(--accent-blue)' }}>📋 Exam Details</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
          <div><label className="input-label">Exam Title *</label><input required className="input-field" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Final Science Exam"/></div>
          <div><label className="input-label">Subject</label><input className="input-field" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Science"/></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
          <div><label className="input-label">Duration (minutes)</label><input type="number" className="input-field" value={form.duration} onChange={e=>setForm({...form,duration:Number(e.target.value)})}/></div>
          <div><label className="input-label">Passing Marks (%)</label><input type="number" className="input-field" value={form.passingMarks} onChange={e=>setForm({...form,passingMarks:Number(e.target.value)})}/></div>
        </div>
        <div><label className="input-label">Instructions</label><textarea className="input-field" rows={2} value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} placeholder="Read each question carefully…"/></div>
      </div>

      {/* Questions */}
      <div style={{ marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <h3 style={{ fontSize:'0.95rem' }}>Questions ({questions.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={addQuestion}><Plus size={15}/> Add Question</button>
        </div>

        {questions.map((q, qi) => (
          <div key={qi} className="card" style={{ padding:'1.25rem', marginBottom:'1rem', borderLeft:'3px solid var(--accent-blue)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
              <span style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--accent-blue)' }}>Q{qi+1}</span>
              {questions.length > 1 && <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--accent-rose)' }} onClick={()=>removeQuestion(qi)}><Trash2 size={14}/></button>}
            </div>
            <div style={{ marginBottom:'0.75rem' }}>
              <label className="input-label">Question Text *</label>
              <textarea className="input-field" rows={2} value={q.text} onChange={e=>updateQ(qi,'text',e.target.value)} placeholder="Type your question here…"/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
              {q.options.map((opt,oi)=>(
                <div key={oi}>
                  <label className="input-label">Option {String.fromCharCode(65+oi)}</label>
                  <input className="input-field" value={opt} onChange={e=>updateOpt(qi,oi,e.target.value)} placeholder={`Option ${String.fromCharCode(65+oi)}`}/>
                </div>
              ))}
            </div>
            <div>
              <label className="input-label">Correct Answer</label>
              <select className="input-field" value={q.correctAnswer} onChange={e=>updateQ(qi,'correctAnswer',e.target.value)}>
                <option value="">— Select correct option —</option>
                {q.options.filter(o=>o.trim()).map((opt,oi)=>(
                  <option key={oi} value={opt}>{String.fromCharCode(65+oi)}. {opt}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={()=>handlePublish('Draft')} disabled={saving}>Save as Draft</button>
        <button className="btn btn-primary" onClick={()=>handlePublish('Active')} disabled={saving}>
          {saving ? 'Publishing…' : '🚀 Publish Exam'}
        </button>
      </div>
    </div>
  );
}

/* ──── RESULTS TAB ──── */
function ResultsTab({ schoolId }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterExam, setFilterExam] = useState('all');
  const [exams, setExams] = useState([]);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const [rSnap, eSnap] = await Promise.all([
        getDocs(query(collection(db,'results'), where('schoolId','==',schoolId))),
        getDocs(query(collection(db,'exams'), where('schoolId','==',schoolId))),
      ]);
      setResults(rSnap.docs.map(d=>({id:d.id,...d.data()})));
      setExams(eSnap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    })();
  }, [schoolId]);

  const filtered = filterExam==='all' ? results : results.filter(r=>r.examId===filterExam);
  const avg = filtered.length ? Math.round(filtered.reduce((s,r)=>s+(r.percentage||0),0)/filtered.length) : 0;
  const passed = filtered.filter(r=>(r.percentage||0)>=40).length;

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Exam Results</h2>
          <p style={{ fontSize:'0.85rem' }}>View all student submissions and scores. Students cannot see these.</p>
        </div>
        <select className="input-field" style={{ width:'auto', minWidth:220 }} value={filterExam} onChange={e=>setFilterExam(e.target.value)}>
          <option value="all">All Exams</option>
          {exams.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {/* Summary Stats */}
      {filtered.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'1rem', marginBottom:'1.25rem' }}>
          {[
            { label:'Submissions', value: filtered.length,  color:'var(--accent-blue)',    bg:'var(--accent-blue-light)' },
            { label:'Avg Score',   value: `${avg}%`,         color:'var(--accent-purple)',  bg:'var(--accent-purple-light)' },
            { label:'Passed',      value: passed,             color:'var(--accent-emerald)', bg:'var(--accent-emerald-light)' },
            { label:'Failed',      value: filtered.length-passed, color:'var(--accent-rose)', bg:'var(--accent-rose-light)' },
          ].map(s=>(
            <div key={s.label} className="card" style={{ padding:'1.25rem', textAlign:'center', border:`1px solid ${s.bg}` }}>
              <div style={{ fontSize:'1.8rem', fontWeight:800, fontFamily:'Space Grotesk', color:s.color, marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ overflow:'hidden' }}>
        {loading ? <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Percentage</th><th>Attempted</th><th>Result</th><th>Date</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={7}><div className="empty-state"><BarChart2 size={36}/><p>No results yet for the selected exam.</p></div></td></tr>}
              {filtered.map(r=>{
                const pass = (r.percentage||0) >= 40;
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight:600 }}>{r.studentName||'—'}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{r.rollNo ? `Roll: ${r.rollNo}` : ''} {r.class ? `| Class: ${r.class}` : ''}</div>
                    </td>
                    <td style={{ color:'var(--text-secondary)', fontSize:'0.83rem', maxWidth:160 }}>{r.examTitle||'—'}</td>
                    <td><span style={{ fontWeight:700, fontFamily:'Space Grotesk' }}>{r.correct||0} / {r.totalMarks||0}</span></td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:6, background:'var(--border-light)', borderRadius:10, maxWidth:60, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${r.percentage||0}%`, background: pass?'var(--grad-emerald)':'var(--grad-rose)', borderRadius:10 }}/>
                        </div>
                        <span style={{ fontSize:'0.83rem', fontWeight:700, color: pass?'var(--accent-emerald)':'var(--accent-rose)' }}>{r.percentage||0}%</span>
                      </div>
                    </td>
                    <td style={{ color:'var(--text-secondary)' }}>{r.attempted||0}/{r.totalQuestions||0}</td>
                    <td><span className={`badge ${pass?'success':'danger'}`}>{pass?'Pass':'Fail'}</span></td>
                    <td style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                      {r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ──── EXAMS LIST TAB ──── */
function ExamsTab({ exams, setExams, showToast }) {
  const [confirmDel, setConfirmDel] = useState(null);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db,'exams',id));
    setExams(p=>p.filter(e=>e.id!==id));
    showToast('Exam deleted.','success');
    setConfirmDel(null);
  };

  const toggleStatus = async (exam) => {
    const newStatus = exam.status==='Active' ? 'Draft' : 'Active';
    await updateDoc(doc(db,'exams',exam.id), { status:newStatus });
    setExams(p=>p.map(e=>e.id===exam.id?{...e,status:newStatus}:e));
    showToast(`Exam ${newStatus==='Active'?'published':'unpublished'}.`,'success');
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>My Exams</h2>
      <p style={{ fontSize:'0.85rem', marginBottom:'1.25rem' }}>Manage all created exams. Toggle status to publish/unpublish.</p>
      <div className="card" style={{ overflow:'hidden' }}>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Subject</th><th>Questions</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {exams.length===0 && <tr><td colSpan={6}><div className="empty-state"><FilePlus size={36}/><p>No exams yet. Go to "Create Exam" to build one.</p></div></td></tr>}
            {exams.map(e=>(
              <tr key={e.id}>
                <td style={{ fontWeight:600 }}>{e.title}</td>
                <td><span className="badge purple">{e.subject||'—'}</span></td>
                <td style={{ color:'var(--text-secondary)' }}>{(e.questions||[]).length}</td>
                <td style={{ color:'var(--text-secondary)' }}><span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={14}/>{e.duration||60} min</span></td>
                <td>
                  <button onClick={()=>toggleStatus(e)} className={`badge ${e.status==='Active'?'success':'warning'}`} style={{ cursor:'pointer', border:'none', fontFamily:'inherit', fontWeight:700 }}>
                    {e.status||'Draft'}
                  </button>
                </td>
                <td>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--accent-rose)' }} onClick={()=>setConfirmDel(e.id)}><Trash2 size={15}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDel && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:380 }}>
            <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:'1.25rem' }}>
              <div className="icon-box rose lg"><AlertTriangle size={20}/></div>
              <div><h3 style={{ marginBottom:6 }}>Delete Exam?</h3><p style={{ fontSize:'0.875rem' }}>This will permanently remove the exam. Student results will remain unaffected.</p></div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={()=>setConfirmDel(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={()=>handleDelete(confirmDel)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──── MAIN ──── */
const TABS = [
  { id:'exams',   label:'My Exams',    icon:BookOpen  },
  { id:'create',  label:'Create Exam', icon:FilePlus  },
  { id:'results', label:'Results',     icon:BarChart2 },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('exams');
  const [exams, setExams]         = useState([]);
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [schoolId, setSchoolId]   = useState(null);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type='success') => setToast({ msg, type });

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        // Get teacher info
        const userDoc = await getDoc(doc(db,'users',currentUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        setTeacherInfo(userData);
        const sid = userData.schoolId;
        setSchoolId(sid);

        // Load exams
        if (sid) {
          const snap = await getDocs(query(collection(db,'exams'), where('schoolId','==',sid)));
          setExams(snap.docs.map(d=>({id:d.id,...d.data()})));
        }
      } catch(e) { console.error(e); }
    })();
  }, [currentUser]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  return (
    <>
      <div className="dashboard-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="icon-box purple lg"><GraduationCap size={20}/></div>
              <div>
                <div style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'0.95rem', color:'var(--accent-purple)' }}>Teacher Portal</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700 }}>{teacherInfo?.name || 'Teacher'}</div>
              </div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-section-title">PORTAL</div>
            {TABS.map(item=>(
              <button key={item.id} className={`nav-item ${activeTab===item.id?'active':''}`} onClick={()=>setActiveTab(item.id)}>
                <item.icon size={17}/> {item.label}
                {item.id==='results' && <span className="badge info" style={{ marginLeft:'auto', fontSize:'0.7rem' }}>Admin</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div style={{ padding:'0.6rem 0.75rem', background:'var(--accent-purple-light)', borderRadius:'var(--radius-md)', marginBottom:6 }}>
              <div style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--accent-purple)', letterSpacing:'.06em' }}>TEACHER</div>
              <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentUser?.email}</div>
            </div>
            <button className="nav-item" onClick={handleLogout} style={{ color:'var(--accent-rose)' }}>
              <LogOut size={17}/> Sign Out
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main-content">
          <div className="main-header">
            <div>
              <h2 style={{ fontSize:'1.1rem', marginBottom:2 }}>{TABS.find(t=>t.id===activeTab)?.label}</h2>
              <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                {new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'0.8rem', fontWeight:600 }}>{exams.length} Exams Created</div>
                <div style={{ fontSize:'0.72rem', color:'var(--accent-emerald)' }}>● Subject: {teacherInfo?.subject||'—'}</div>
              </div>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--grad-purple)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.85rem', color:'#fff' }}>T</div>
            </div>
          </div>
          <div className="page-content">
            {activeTab==='exams'   && <ExamsTab exams={exams} setExams={setExams} showToast={showToast}/>}
            {activeTab==='create'  && <CreateExamTab teacherInfo={teacherInfo} schoolId={schoolId} showToast={showToast} onCreated={e=>{ setExams(p=>[e,...p]); setActiveTab('exams'); }}/>}
            {activeTab==='results' && <ResultsTab schoolId={schoolId}/>}
          </div>
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
