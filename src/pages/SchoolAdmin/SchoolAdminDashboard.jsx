import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, BookOpen, BarChart3, LogOut, Menu,
  PlusCircle, Search, Trash2, X, AlertTriangle, CheckCircle2,
  Building2, UserPlus, FileText, Clock, Sparkles, Plus, FilePlus, Download, BarChart2,
  Image, Save, Phone, MapPin, Award, User
} from 'lucide-react';
import {
  collection, getDocs, addDoc, deleteDoc, doc,
  query, where, serverTimestamp, setDoc, updateDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import AIQuestionGenerator from '../../components/AIQuestionGenerator';
import PDFQuestionExtractor from '../../components/PDFQuestionExtractor';
import { downloadDetailedResult, downloadClassMarksheet, downloadSubjectReport } from '../../services/pdfService';

/* ──────────────── SHARED HELPERS ──────────────── */
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const col = { success: 'var(--accent-emerald)', error: 'var(--accent-rose)', info: 'var(--accent-blue)' }[type];
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background:'#fff', borderLeft:`4px solid ${col}`, border:`1px solid ${col}20`, borderRadius:'var(--radius-md)', padding:'0.875rem 1.25rem', boxShadow:'var(--shadow-lg)', display:'flex', alignItems:'center', gap:12, maxWidth:360, animation:'slideUp .3s ease' }}>
      <CheckCircle2 size={18} color={col}/>
      <span style={{ fontSize:'0.875rem', flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16}/></button>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth:380 }}>
        <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:'1.25rem' }}>
          <div className="icon-box rose lg"><AlertTriangle size={20}/></div>
          <div><h3 style={{ marginBottom:6 }}>Confirm Delete</h3><p style={{ fontSize:'.875rem' }}>{message}</p></div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

const SUBJECTS = ['Mathematics','Science','English','Hindi','Social Studies','Computer Science','Physics','Chemistry','Biology','History','Geography','Economics'];

/* ──────────────── TEACHERS TAB ──────────────── */
function TeachersTab({ schoolId, schoolSubjects, showToast }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name:'', email:'', password:'', subject:'', phone:'' });

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const snap = await getDocs(query(collection(db,'teachers'), where('schoolId','==',schoolId)));
      setTeachers(snap.docs.map(d => ({ id:d.id,...d.data() })));
      setLoading(false);
    })();
  }, [schoolId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = cred.user.uid;
      await setDoc(doc(db,'users', uid), { uid, email:form.email, name:form.name, role:'teacher', schoolId, subject:form.subject, createdAt:serverTimestamp() });
      const ref = await addDoc(collection(db,'teachers'), { uid, name:form.name, email:form.email, subject:form.subject, phone:form.phone, schoolId, createdAt:serverTimestamp() });
      setTeachers(p => [{ id:ref.id,...form, uid }, ...p]);
      showToast(`Teacher "${form.name}" added. Login ready!`,'success');
      setShowModal(false);
      setForm({ name:'', email:'', password:'', subject:'', phone:'' });
    } catch(err) { showToast('Error: '+err.message,'error'); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db,'teachers',id));
    setTeachers(p => p.filter(t => t.id!==id));
    showToast('Teacher removed.','success');
    setConfirmDel(null);
  };

  const filtered = teachers.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div>
          <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Teachers</h2>
          <p style={{ fontSize:'0.85rem' }}>Manage teachers assigned to your school.</p>
        </div>
        <button className="btn btn-purple" onClick={()=>setShowModal(true)}><UserPlus size={17}/> Add Teacher</button>
      </div>

      <div className="search-wrapper" style={{ marginBottom:'1.25rem' }}>
        <Search size={16} className="search-icon"/>
        <input className="input-field" placeholder="Search teachers…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        {loading ? <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Subject</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={5}><div className="empty-state"><GraduationCap size={34}/><p>No teachers yet. Click "Add Teacher" to begin.</p></div></td></tr>}
              {filtered.map(t=>(
                <tr key={t.id}>
                  <td style={{ fontWeight:600 }}>{t.name}</td>
                  <td><span className="badge purple">{t.subject||'—'}</span></td>
                  <td style={{ color:'var(--text-secondary)', fontSize:'0.83rem' }}>{t.email}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{t.phone||'—'}</td>
                  <td><button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--accent-rose)' }} onClick={()=>setConfirmDel(t.id)}><Trash2 size={15}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:500 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
              <div><h3>Add Teacher</h3><p style={{ fontSize:'0.85rem' }}>Creates a Firebase login for the teacher.</p></div>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="input-label">Full Name *</label><input required className="input-field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Jane Smith"/></div>
                <div><label className="input-label">Phone</label><input className="input-field" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 XXXXX"/></div>
              </div>
              <div><label className="input-label">Subject *</label>
                <select required className="input-field" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}>
                  <option value="">Select Subject</option>
                  {(schoolSubjects||SUBJECTS).map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="input-label">Email *</label><input required type="email" className="input-field" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="teacher@school.com"/></div>
              <div><label className="input-label">Password *</label><input required type="password" className="input-field" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 6 chars"/></div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:'0.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-purple" disabled={submitting}>{submitting?'Adding…':'Add Teacher'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDel && <ConfirmModal message="This will remove the teacher record from the system." onConfirm={()=>handleDelete(confirmDel)} onClose={()=>setConfirmDel(null)}/>}
    </div>
  );
}

/* ──────────────── STUDENTS TAB ──────────────── */
function StudentsTab({ schoolId, schoolSubjects, showToast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name:'', email:'', password:'', rollNo:'', class:'', subjects:[] });

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const snap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
      setStudents(snap.docs.map(d => ({ id:d.id,...d.data() })));
      setLoading(false);
    })();
  }, [schoolId]);

  const toggleSub = (sub) => setForm(f => ({ ...f, subjects: f.subjects.includes(sub)?f.subjects.filter(s=>s!==sub):[...f.subjects,sub] }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = cred.user.uid;
      await setDoc(doc(db,'users', uid), { uid, email:form.email, name:form.name, role:'student', schoolId, subjects:form.subjects, createdAt:serverTimestamp() });
      const ref = await addDoc(collection(db,'students'), { uid, name:form.name, email:form.email, rollNo:form.rollNo, class:form.class, subjects:form.subjects, schoolId, createdAt:serverTimestamp() });
      setStudents(p => [{ id:ref.id,...form, uid }, ...p]);
      showToast(`Student "${form.name}" enrolled. Login ready!`,'success');
      setShowModal(false);
      setForm({ name:'', email:'', password:'', rollNo:'', class:'', subjects:[] });
    } catch(err) { showToast('Error: '+err.message,'error'); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db,'students',id));
    setStudents(p => p.filter(s => s.id!==id));
    showToast('Student removed.','success');
    setConfirmDel(null);
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div>
          <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Students</h2>
          <p style={{ fontSize:'0.85rem' }}>Manage students enrolled in your school.</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}><UserPlus size={17}/> Enroll Student</button>
      </div>

      <div className="search-wrapper" style={{ marginBottom:'1.25rem' }}>
        <Search size={16} className="search-icon"/>
        <input className="input-field" placeholder="Search by name or roll number…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        {loading ? <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr><th>Student</th><th>Roll No</th><th>Class</th><th>Subjects</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={5}><div className="empty-state"><Users size={34}/><p>No students enrolled yet.</p></div></td></tr>}
              {filtered.map(s=>(
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight:600 }}>{s.name}</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{s.email}</div>
                  </td>
                  <td><span className="badge info">{s.rollNo||'—'}</span></td>
                  <td style={{ color:'var(--text-secondary)' }}>{s.class||'—'}</td>
                  <td>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {(s.subjects||[]).slice(0,2).map(sub=><span key={sub} className="badge cyan">{sub}</span>)}
                      {(s.subjects||[]).length>2 && <span className="badge" style={{ background:'#f1f5f9', color:'var(--text-secondary)' }}>+{s.subjects.length-2}</span>}
                    </div>
                  </td>
                  <td><button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--accent-rose)' }} onClick={()=>setConfirmDel(s.id)}><Trash2 size={15}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
              <div><h3>Enroll Student</h3><p style={{ fontSize:'0.85rem' }}>Creates Firebase login for the student.</p></div>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="input-label">Full Name *</label><input required className="input-field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Rahul Sharma"/></div>
                <div><label className="input-label">Roll Number</label><input className="input-field" value={form.rollNo} onChange={e=>setForm({...form,rollNo:e.target.value})} placeholder="2024001"/></div>
              </div>
              <div><label className="input-label">Class / Grade</label><input className="input-field" value={form.class} onChange={e=>setForm({...form,class:e.target.value})} placeholder="10-A"/></div>
              <div><label className="input-label">Email *</label><input required type="email" className="input-field" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="student@school.com"/></div>
              <div><label className="input-label">Password *</label><input required type="password" className="input-field" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 6 chars"/></div>
              <div>
                <label className="input-label">Subjects</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'0.75rem', background:'var(--bg-tertiary)', borderRadius:'var(--radius-md)', border:'1.5px solid var(--border-light)' }}>
                  {(schoolSubjects||SUBJECTS).map(sub=>(
                    <button type="button" key={sub} onClick={()=>toggleSub(sub)}
                      style={{ padding:'4px 12px', borderRadius:20, border:'1.5px solid', cursor:'pointer', fontSize:'0.8rem', fontWeight:600, fontFamily:'inherit',
                        borderColor: form.subjects.includes(sub)?'var(--accent-cyan)':'var(--border-medium)',
                        background:  form.subjects.includes(sub)?'var(--accent-cyan-light)':'#fff',
                        color:       form.subjects.includes(sub)?'var(--accent-cyan)':'var(--text-secondary)'
                      }}>{sub}</button>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:'0.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?'Enrolling…':'Enroll Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDel && <ConfirmModal message="Remove this student from the system?" onConfirm={()=>handleDelete(confirmDel)} onClose={()=>setConfirmDel(null)}/>}
    </div>
  );
}

/* ──────────────── OVERVIEW TAB ──────────────── */
function OverviewTab({ school, teacherCount, studentCount }) {
  const stats = [
    { label:'Teachers',  value: teacherCount, icon: GraduationCap, color:'purple', grad:'var(--grad-purple)' },
    { label:'Students',  value: studentCount, icon: Users,          color:'blue',   grad:'var(--grad-blue)'   },
    { label:'Subjects',  value: (school?.subjects||[]).length, icon: BookOpen, color:'cyan', grad:'var(--grad-cyan)' },
    { label:'Status',    value: school?.status||'Active', icon: Building2, color:'emerald', grad:'var(--grad-emerald)' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header-band" style={{ marginBottom:'1.75rem' }}>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.7)', fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>SCHOOL ADMIN</div>
          <h2 style={{ color:'#fff', fontSize:'1.5rem', marginBottom:6 }}>{school?.name || 'Your School'}</h2>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.875rem' }}>{school?.location||''} {school?.regId ? `· Reg: ${school.regId}` : ''}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1.1rem', marginBottom:'1.75rem' }}>
        {stats.map((s,i)=>(
          <div key={i} className={`stat-card ${s.color} animate-slide-up`}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
              <div className={`icon-box ${s.color} lg`}><s.icon size={22}/></div>
            </div>
            <div style={{ fontSize:'2rem', fontWeight:800, fontFamily:'Space Grotesk', background:s.grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text-secondary)' }}>{s.label}</div>
            <div style={{ marginTop:'1rem', height:3, borderRadius:10, background:'var(--border-light)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:'70%', background:s.grad, borderRadius:10 }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Subjects Offered */}
      <div className="card" style={{ padding:'1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.25rem' }}>
          <div className="icon-box cyan sm"><BookOpen size={15}/></div>
          <h3 style={{ fontSize:'0.95rem' }}>Subjects Offered</h3>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {(school?.subjects||[]).length === 0
            ? <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>No subjects configured. Contact Super Admin.</p>
            : (school?.subjects||[]).map(sub => <span key={sub} className="badge info" style={{ fontSize:'0.8rem', padding:'5px 12px' }}>{sub}</span>)
          }
        </div>
      </div>
    </div>
  );
}

/* ──────────────── CREATE EXAM TAB (School Admin) ──────────────── */
function CreateExamTab({ schoolId, schoolSubjects, showToast }) {
  const [form, setForm] = useState({ title:'', subject:'', duration:60, instructions:'', passingMarks:40 });
  const [questions, setQuestions] = useState([{ text:'', options:['','','',''], correctAnswer:'', marks: 1 }]);
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showPDF, setShowPDF] = useState(false);

  const handleAIInsert = (aiQs) => {
    const mappedAiQs = aiQs.map(q => ({ ...q, marks: 1 }));
    setQuestions(prev => { const c = prev.filter(q=>q.text.trim()); return [...c, ...mappedAiQs]; });
    setShowAI(false);
  };
  const handlePDFInsert = (pdfQs) => {
    const mapped = pdfQs.map(q => ({ ...q, marks: 1 }));
    setQuestions(prev => { const c = prev.filter(q=>q.text.trim()); return [...c, ...mapped]; });
    setShowPDF(false);
  };
  const updateQ = (qi,field,val) => setQuestions(qs=>qs.map((q,i)=>i===qi?{...q,[field]:val}:q));
  const updateOpt = (qi,oi,val) => setQuestions(qs=>qs.map((q,i)=>i===qi?{...q,options:q.options.map((o,j)=>j===oi?val:o)}:q));
  const addQ = () => setQuestions(qs=>[...qs,{text:'',options:['','','',''],correctAnswer:'', marks: 1}]);
  const removeQ = (qi) => setQuestions(qs=>qs.filter((_,i)=>i!==qi));

  const handlePublish = async (status) => {
    if (!form.title.trim()) { showToast('Enter exam title.','error'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db,'exams'), { 
        ...form, 
        schoolId, 
        questions, 
        totalMarks: questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0),
        status, 
        createdAt:serverTimestamp() 
      });
      showToast(status==='Active'?'Exam published!':'Draft saved.','success');
      setForm({title:'',subject:'',duration:60,instructions:'',passingMarks:40});
      setQuestions([{text:'',options:['','','',''],correctAnswer:'', marks: 1}]);
    } catch(e){ showToast('Error: '+e.message,'error'); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{fontSize:'1.2rem',marginBottom:4}}>Create Exam</h2>
      <p style={{fontSize:'0.85rem',marginBottom:'1.25rem'}}>Build exam questions manually or use AI to generate them instantly.</p>

      <div className="card" style={{padding:'1.5rem',marginBottom:'1.25rem'}}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <h3 style={{fontSize:'0.9rem',color:'var(--accent-blue)'}}>📋 Exam Details</h3>
          <div style={{ background:'var(--accent-blue-light)', color:'var(--accent-blue)', padding:'4px 12px', borderRadius:20, fontSize:'0.85rem', fontWeight:700 }}>
            Total Marks: {questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
          <div><label className="input-label">Exam Title *</label><input required className="input-field" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Final Science Exam"/></div>
          <div><label className="input-label">Subject</label>
            <select className="input-field" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}>
              <option value="">Select Subject</option>
              {(schoolSubjects||[]).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
          <div><label className="input-label">Duration (mins)</label><input type="number" className="input-field" value={form.duration} onChange={e=>setForm({...form,duration:Number(e.target.value)})}/></div>
          <div><label className="input-label">Passing Marks (%)</label><input type="number" className="input-field" value={form.passingMarks} onChange={e=>setForm({...form,passingMarks:Number(e.target.value)})}/></div>
        </div>
        <div><label className="input-label">Instructions</label><textarea className="input-field" rows={2} value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} placeholder="Read carefully…"/></div>
      </div>

      <div style={{marginBottom:'1.25rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <h3 style={{fontSize:'0.95rem'}}>Questions ({questions.length})</h3>
          <div style={{display:'flex',gap:8}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowPDF(true)} style={{color:'var(--accent-blue)',borderColor:'var(--accent-blue)',background:'var(--accent-blue-light)',gap:5}}>
                <FileText size={15}/> Upload PDF
              </button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowAI(true)} style={{color:'var(--accent-purple)',borderColor:'var(--accent-purple)',background:'var(--accent-purple-light)',gap:5}}>
                <Sparkles size={15}/> AI Generate
              </button>
              <button className="btn btn-ghost btn-sm" onClick={addQ}><Plus size={15}/> Add</button>
            </div>
        </div>
        {questions.map((q,qi)=>(
          <div key={qi} className="card" style={{padding:'1.25rem',marginBottom:'1rem',borderLeft:'3px solid var(--accent-blue)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
              <span style={{fontSize:'0.85rem',fontWeight:700,color:'var(--accent-blue)'}}>Q{qi+1}</span>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <label style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-secondary)' }}>Marks</label>
                <input type="number" min="1" className="input-field" style={{ width:60, padding:'4px 8px' }} value={q.marks || 1} onChange={e=>updateQ(qi,'marks',Number(e.target.value))} />
                {questions.length>1&&<button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--accent-rose)'}} onClick={()=>removeQ(qi)}><Trash2 size={14}/></button>}
              </div>
            </div>
            <div style={{marginBottom:'0.75rem'}}><label className="input-label">Question Text *</label><textarea className="input-field" rows={2} value={q.text} onChange={e=>updateQ(qi,'text',e.target.value)} placeholder="Type question here…"/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>
              {q.options.map((opt,oi)=>(<div key={oi}><label className="input-label">Option {String.fromCharCode(65+oi)}</label><input className="input-field" value={opt} onChange={e=>updateOpt(qi,oi,e.target.value)} placeholder={`Option ${String.fromCharCode(65+oi)}`}/></div>))}
            </div>
            <div><label className="input-label">Correct Answer</label>
              <select className="input-field" value={q.correctAnswer} onChange={e=>updateQ(qi,'correctAnswer',e.target.value)}>
                <option value="">— Select correct —</option>
                {q.options.filter(o=>o.trim()).map((opt,oi)=>(<option key={oi} value={opt}>{String.fromCharCode(65+oi)}. {opt}</option>))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
        <button className="btn btn-ghost" onClick={()=>handlePublish('Draft')} disabled={saving}>Save Draft</button>
        <button className="btn btn-primary" onClick={()=>handlePublish('Active')} disabled={saving}>{saving?'Publishing…':'🚀 Publish'}</button>
      </div>

      {showAI  && <AIQuestionGenerator defaultSubject={form.subject} onInsert={handleAIInsert} onClose={()=>setShowAI(false)}/>}
      {showPDF && <PDFQuestionExtractor onInsert={handlePDFInsert} onClose={()=>setShowPDF(false)}/>}
    </div>
  );
}

/* ──────────────── SCHOOL PROFILE TAB ──────────────── */
function SchoolProfileTab({ school, showToast }) {
  const fileRef = useRef();
  const [profile, setProfile] = useState({
    address: '', phone: '', board: '', schoolCode: '', principal: '', tagline: '', logoBase64: ''
  });
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!school) return;
    setProfile({
      address:    school.address    || '',
      phone:      school.phone      || '',
      board:      school.board      || '',
      schoolCode: school.schoolCode || '',
      principal:  school.principal  || '',
      tagline:    school.tagline    || '',
      logoBase64: school.logoBase64 || '',
    });
    if (school.logoBase64) setPreview(school.logoBase64);
  }, [school]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { showToast('Logo must be under 500KB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setPreview(base64);
      setProfile(p => ({ ...p, logoBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!school?.id) { showToast('School not loaded yet.', 'error'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'schools', school.id), {
        address:    profile.address,
        phone:      profile.phone,
        board:      profile.board,
        schoolCode: profile.schoolCode,
        principal:  profile.principal,
        tagline:    profile.tagline,
        logoBase64: profile.logoBase64,
      });
      showToast('School profile saved! PDFs will now use this letterhead.', 'success');
    } catch (err) {
      showToast('Error saving profile: ' + err.message, 'error');
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: 4 }}>School Profile</h2>
        <p style={{ fontSize: '0.85rem' }}>This information will appear on all PDF report cards and marksheets as a professional letterhead.</p>
      </div>

      {/* Logo Upload */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <div className="icon-box blue sm"><Image size={16}/></div>
          <h3 style={{ fontSize: '0.95rem' }}>School Logo</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Preview */}
          <div style={{
            width: 100, height: 100, borderRadius: 'var(--radius-md)', border: '2px dashed var(--border-medium)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            background: 'var(--bg-tertiary)', flexShrink: 0
          }}>
            {preview
              ? <img src={preview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
              : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><Image size={28}/><div style={{ fontSize: '0.7rem', marginTop: 4 }}>No Logo</div></div>}
          </div>
          <div>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }} onClick={() => fileRef.current?.click()}>
              <Image size={15}/> {preview ? 'Change Logo' : 'Upload Logo'}
            </button>
            {preview && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-rose)', display: 'block' }}
                onClick={() => { setPreview(''); setProfile(p => ({ ...p, logoBase64: '' })); }}>
                ✕ Remove Logo
              </button>
            )}
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>PNG or JPG, max 500KB. Will appear in all PDF letterheads.</p>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange}/>
          </div>
        </div>
      </div>

      {/* Profile Fields */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <div className="icon-box blue sm"><Building2 size={16}/></div>
          <h3 style={{ fontSize: '0.95rem' }}>School Details for Letterhead</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">School Tagline</label>
            <input className="input-field" value={profile.tagline} onChange={e => setProfile({ ...profile, tagline: e.target.value })} placeholder="e.g. Excellence in Education Since 1990"/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label"><Award size={13} style={{ display:'inline', marginRight:4, verticalAlign:'middle' }}/>Affiliation Board</label>
              <input className="input-field" value={profile.board} onChange={e => setProfile({ ...profile, board: e.target.value })} placeholder="e.g. CBSE / ICSE / State Board"/>
            </div>
            <div>
              <label className="input-label">School Code</label>
              <input className="input-field" value={profile.schoolCode} onChange={e => setProfile({ ...profile, schoolCode: e.target.value })} placeholder="e.g. 45012"/>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label"><MapPin size={13} style={{ display:'inline', marginRight:4, verticalAlign:'middle' }}/>Full Address</label>
              <input className="input-field" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} placeholder="Street, City, State — PIN"/>
            </div>
            <div>
              <label className="input-label"><Phone size={13} style={{ display:'inline', marginRight:4, verticalAlign:'middle' }}/>Phone / Contact</label>
              <input className="input-field" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 XXXXX XXXXX"/>
            </div>
          </div>
          <div>
            <label className="input-label"><User size={13} style={{ display:'inline', marginRight:4, verticalAlign:'middle' }}/>Principal Name</label>
            <input className="input-field" value={profile.principal} onChange={e => setProfile({ ...profile, principal: e.target.value })} placeholder="e.g. Dr. Rajesh Kumar"/>
          </div>
        </div>
      </div>

      {/* Preview Banner */}
      {(preview || profile.address || profile.board) && (
        <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.25rem', background: 'var(--accent-blue-light)', border: '1px solid var(--accent-blue)20' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {preview && <img src={preview} alt="logo" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border-light)' }}/>}
            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent-blue)', fontSize: '0.95rem' }}>{school?.name?.toUpperCase()}</div>
              {profile.board && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{profile.board}{profile.schoolCode ? ` | Code: ${profile.schoolCode}` : ''}</div>}
              {profile.address && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {profile.address}</div>}
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>↑ This is how your letterhead will look in PDFs</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16}/> {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

/* ──────────────── MARKSHEET / RESULTS TAB ──────────────── */
function MarksheetTab({ schoolId, schoolName, schoolProfile }) {
  const [results,      setResults]      = useState([]);
  const [exams,        setExams]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterClass,  setFilterClass]  = useState('');
  const [filterSubject,setFilterSubject]= useState('');
  const [filterExam,   setFilterExam]   = useState('all');

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const [rSnap, eSnap] = await Promise.all([
        getDocs(query(collection(db,'results'), where('schoolId','==',schoolId))),
        getDocs(query(collection(db,'exams'),   where('schoolId','==',schoolId))),
      ]);
      setResults(rSnap.docs.map(d=>({id:d.id,...d.data()})));
      setExams(eSnap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    })();
  }, [schoolId]);

  const classes  = [...new Set(results.map(r=>r.class).filter(Boolean))].sort();
  const subjects = [...new Set(results.map(r=>r.subject).filter(Boolean))].sort();

  const filtered = results.filter(r =>
    (filterClass   === '' || (r.class||'').toLowerCase()   === filterClass.toLowerCase()) &&
    (filterSubject === '' || (r.subject||'').toLowerCase() === filterSubject.toLowerCase()) &&
    (filterExam === 'all' || r.examId === filterExam)
  );

  const avg    = filtered.length ? Math.round(filtered.reduce((s,r)=>s+(r.percentage||0),0)/filtered.length) : 0;
  const passed = filtered.filter(r=>(r.percentage||0)>=40).length;
  const getGradeColor = (pct) => pct>=90?'var(--accent-emerald)':pct>=70?'var(--accent-blue)':pct>=40?'var(--accent-amber)':'var(--accent-rose)';
  const getGrade = (pct) => pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':pct>=50?'C':pct>=40?'D':'F';

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Results &amp; Marksheets</h2>
          <p style={{ fontSize:'0.85rem' }}>Download professional PDFs with school letterhead. Filter by class, subject, or exam.</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-ghost btn-sm"
            onClick={() => downloadClassMarksheet(filtered, filterClass, filterSubject, schoolName, schoolProfile)}
            disabled={filtered.length===0}
            style={{ color:'var(--accent-purple)', borderColor:'var(--accent-purple)', background:'var(--accent-purple-light)', gap:5 }}>
            <Download size={14}/> Class Marksheet PDF
          </button>
          <button className="btn btn-ghost btn-sm"
            onClick={() => downloadSubjectReport(filtered, schoolName, schoolProfile)}
            disabled={filtered.length===0}
            style={{ color:'var(--accent-blue)', borderColor:'var(--accent-blue)', background:'var(--accent-blue-light)', gap:5 }}>
            <BarChart2 size={14}/> Subject Report PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <select className="input-field" style={{ flex:1, minWidth:160 }} value={filterClass} onChange={e=>setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input-field" style={{ flex:1, minWidth:160 }} value={filterSubject} onChange={e=>setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input-field" style={{ flex:1, minWidth:180 }} value={filterExam} onChange={e=>setFilterExam(e.target.value)}>
          <option value="all">All Exams</option>
          {exams.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {/* Stats */}
      {filtered.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:'1rem', marginBottom:'1.25rem' }}>
          {[
            {label:'Submissions', value:filtered.length,                          color:'var(--accent-blue)'   },
            {label:'Avg Score',   value:`${avg}%`,                               color:'var(--accent-purple)' },
            {label:'Passed',      value:passed,                                   color:'var(--accent-emerald)'},
            {label:'Failed',      value:filtered.length-passed,                  color:'var(--accent-rose)'   },
            {label:'Pass Rate',   value:`${filtered.length?Math.round(passed/filtered.length*100):0}%`, color:'var(--accent-amber)'},
          ].map(s=>(
            <div key={s.label} className="card" style={{ padding:'1rem 0.75rem', textAlign:'center', borderTop:`3px solid ${s.color}` }}>
              <div style={{ fontSize:'1.5rem', fontWeight:800, fontFamily:'Space Grotesk', color:s.color, marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow:'hidden' }}>
        {loading ? <div style={{ padding:'2rem', textAlign:'center' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Exam</th><th>Subject</th><th>Score</th><th>%</th><th>Grade</th><th>Result</th><th>Date</th><th>PDF</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={11}><div className="empty-state"><BarChart2 size={36}/><p>No results match the current filter.</p></div></td></tr>}
              {[...filtered].sort((a,b)=>(b.percentage||0)-(a.percentage||0)).map((r, idx)=>{
                const pass = (r.percentage||0)>=40;
                const pct  = r.percentage||0;
                const grade = getGrade(pct);
                const gradeColor = getGradeColor(pct);
                return (
                  <tr key={r.id} style={{ background: idx===0 ? 'rgba(217,119,6,0.04)' : undefined }}>
                    <td style={{ textAlign:'center' }}>
                      <span style={{
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                        width:24, height:24, borderRadius:'50%', fontSize:'0.75rem', fontWeight:800,
                        background: idx===0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : idx===1 ? '#94a3b8' : idx===2 ? '#cd7f32' : 'var(--bg-tertiary)',
                        color: idx < 3 ? '#fff' : 'var(--text-secondary)'
                      }}>{idx+1}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight:600 }}>{r.studentName||'—'}</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{r.rollNo ? `Roll: ${r.rollNo}` : ''}</div>
                    </td>
                    <td style={{ fontSize:'0.82rem' }}>{r.class||'—'}</td>
                    <td style={{ fontSize:'0.8rem', maxWidth:120 }}>{r.examTitle||'—'}</td>
                    <td><span className="badge purple">{r.subject||'—'}</span></td>
                    <td style={{ fontWeight:700 }}>{r.score||0}/{r.totalMarks||0}</td>
                    <td>
                      <div>
                        <span style={{ fontWeight:700, color:pass?'var(--accent-emerald)':'var(--accent-rose)', fontSize:'0.9rem' }}>{pct}%</span>
                        <div style={{ marginTop:3, height:4, background:'var(--border-light)', borderRadius:4, overflow:'hidden', width:60 }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:pass?'var(--grad-emerald)':'var(--grad-rose)', borderRadius:4 }}/>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight:800, fontSize:'0.95rem', color:gradeColor, padding:'2px 8px', background:`${gradeColor}15`, borderRadius:6 }}>{grade}</span>
                    </td>
                    <td><span className={`badge ${pass?'success':'danger'}`}>{pass?'Pass':'Fail'}</span></td>
                    <td style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{r.submittedAt?.toDate?r.submittedAt.toDate().toLocaleDateString('en-IN'):'—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Download Report Card PDF"
                        onClick={()=>downloadDetailedResult(r, schoolName, schoolProfile)}
                        style={{ color:'var(--accent-blue)' }}>
                        <FileText size={15}/>
                      </button>
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

/* ──────────────── MAIN COMPONENT ──────────────── */
const TABS = [
  { id:'overview',   label:'Overview',       icon:BarChart3     },
  { id:'teachers',   label:'Teachers',       icon:GraduationCap },
  { id:'students',   label:'Students',       icon:Users          },
  { id:'create',     label:'Create Exam',    icon:FilePlus       },
  { id:'marksheet',  label:'Results',        icon:FileText       },
  { id:'profile',    label:'School Profile', icon:Image         },
];

export default function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [school, setSchool] = useState(null);
  const [teacherCount, setTeacherCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showToast = (msg, type='success') => setToast({ msg, type });

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  // schoolProfile derived from school doc
  const schoolProfile = school ? {
    logoBase64: school.logoBase64 || '',
    address:    school.address    || '',
    phone:      school.phone      || '',
    board:      school.board      || '',
    schoolCode: school.schoolCode || '',
    principal:  school.principal  || '',
    tagline:    school.tagline    || '',
  } : {};

  // Load this school admin's school data
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        // Find school where adminUid matches current user
        const schoolSnap = await getDocs(query(collection(db,'schools'), where('adminUid','==',currentUser.uid)));
        if (!schoolSnap.empty) {
          const schoolData = { id: schoolSnap.docs[0].id, ...schoolSnap.docs[0].data() };
          setSchool(schoolData);

          // Load counts
          const [tSnap, sSnap] = await Promise.all([
            getDocs(query(collection(db,'teachers'), where('schoolId','==',schoolData.id))),
            getDocs(query(collection(db,'students'), where('schoolId','==',schoolData.id))),
          ]);
          setTeacherCount(tSnap.size);
          setStudentCount(sSnap.size);
        }
      } catch(e) { console.error(e); }
    })();
  }, [currentUser]);

  return (
    <>
      <div className="dashboard-layout">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && <div className="sidebar-overlay open" onClick={()=>setSidebarOpen(false)}/>}
        {/* SIDEBAR */}
        <aside className={`sidebar${sidebarOpen?' open':''}`}>
          <div className="sidebar-logo">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="icon-box blue lg" style={{ flexShrink:0 }}><Building2 size={20}/></div>
              <div>
                <div style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'0.95rem', color:'var(--accent-blue)' }}>School Admin</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700, letterSpacing:'.06em' }}>{school?.name || 'Loading…'}</div>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-section-title">PORTAL</div>
            {TABS.map(item => (
              <button key={item.id} className={`nav-item ${activeTab===item.id?'active':''}`} onClick={()=>{setActiveTab(item.id); setSidebarOpen(false);}}>
                <item.icon size={17}/> {item.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div style={{ padding:'0.6rem 0.75rem', background:'var(--accent-blue-light)', borderRadius:'var(--radius-md)', marginBottom:6 }}>
              <div style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--accent-blue)', letterSpacing:'.06em' }}>SCHOOL ADMIN</div>
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
            <button className="hamburger-btn" onClick={()=>setSidebarOpen(o=>!o)} aria-label="Toggle menu">
              <Menu size={20}/>
            </button>
            <div>
              <h2 style={{ fontSize:'1.1rem', marginBottom:2 }}>{TABS.find(t=>t.id===activeTab)?.label}</h2>
              <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                {new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'0.8rem', fontWeight:600 }}>{school?.name || '—'}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--accent-emerald)' }}>● {school?.status||'Active'}</div>
              </div>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--grad-blue)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.85rem', color:'#fff' }}>SA</div>
            </div>
          </div>

          <div className="page-content">
            {activeTab === 'overview'   && <OverviewTab school={school} teacherCount={teacherCount} studentCount={studentCount}/>}
            {activeTab === 'teachers'   && <TeachersTab schoolId={school?.id} schoolSubjects={school?.subjects} showToast={showToast}/>}
            {activeTab === 'students'   && <StudentsTab schoolId={school?.id} schoolSubjects={school?.subjects} showToast={showToast}/>}
            {activeTab === 'create'     && <CreateExamTab schoolId={school?.id} schoolSubjects={school?.subjects} showToast={showToast}/>}
            {activeTab === 'marksheet'  && <MarksheetTab schoolId={school?.id} schoolName={school?.name||''} schoolProfile={schoolProfile}/>}
            {activeTab === 'profile'    && <SchoolProfileTab school={school} showToast={showToast}/>}
          </div>
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
