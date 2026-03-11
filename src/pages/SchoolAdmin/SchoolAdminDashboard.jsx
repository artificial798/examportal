import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, BookOpen, BarChart3, LogOut,
  PlusCircle, Search, Trash2, X, AlertTriangle, CheckCircle2,
  Building2, UserPlus, FileText, Clock
} from 'lucide-react';
import {
  collection, getDocs, addDoc, deleteDoc, doc,
  query, where, serverTimestamp, setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from 'firebase/auth';

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

/* ──────────────── MAIN COMPONENT ──────────────── */
const TABS = [
  { id:'overview',  label:'Overview',  icon:BarChart3   },
  { id:'teachers',  label:'Teachers',  icon:GraduationCap },
  { id:'students',  label:'Students',  icon:Users        },
];

export default function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [school, setSchool] = useState(null);
  const [teacherCount, setTeacherCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => setToast({ msg, type });

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

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
        {/* SIDEBAR */}
        <aside className="sidebar">
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
              <button key={item.id} className={`nav-item ${activeTab===item.id?'active':''}`} onClick={()=>setActiveTab(item.id)}>
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
            {activeTab === 'overview'  && <OverviewTab school={school} teacherCount={teacherCount} studentCount={studentCount}/>}
            {activeTab === 'teachers'  && <TeachersTab schoolId={school?.id} schoolSubjects={school?.subjects} showToast={showToast}/>}
            {activeTab === 'students'  && <StudentsTab schoolId={school?.id} schoolSubjects={school?.subjects} showToast={showToast}/>}
          </div>
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
