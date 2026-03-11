import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, BookOpen, Activity, BarChart3, PlusCircle, LogOut,
  Shield, Search, Pencil, Trash2, UserPlus, AlertTriangle, CheckCircle2,
  X, Layers, TrendingUp, Zap, Database, GraduationCap, ChevronDown,
  BookMarked, School
} from 'lucide-react';
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  query, orderBy, where, serverTimestamp, setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

/* ─────────────── SHARED UI COMPONENTS ─────────────── */

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const cfg = {
    success: { border: 'var(--accent-emerald)', icon: <CheckCircle2 size={18} color="var(--accent-emerald)" /> },
    error:   { border: 'var(--accent-rose)',    icon: <AlertTriangle  size={18} color="var(--accent-rose)" /> },
    info:    { border: 'var(--accent-blue)',    icon: <CheckCircle2  size={18} color="var(--accent-blue)" /> },
  }[type] || {};
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background:'#fff', border:`1.5px solid ${cfg.border}20`, borderLeft:`4px solid ${cfg.border}`, borderRadius:'var(--radius-md)', padding:'0.875rem 1.25rem', boxShadow:'var(--shadow-lg)', display:'flex', alignItems:'center', gap:12, maxWidth:360, animation:'slideUp .3s ease' }}>
      {cfg.icon}
      <span style={{ fontSize:'0.875rem', color:'var(--text-primary)', flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}><X size={16}/></button>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth:400 }}>
        <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:'1.25rem' }}>
          <div className="icon-box rose lg"><AlertTriangle size={22}/></div>
          <div><h3 style={{ marginBottom:6 }}>Confirm Action</h3><p style={{ fontSize:'0.875rem' }}>{message}</p></div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Yes, Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── OVERVIEW ─────────────── */
function OverviewTab({ schools, teacherCount, studentCount }) {
  const stats = [
    { label:'Schools',  value: schools.length, icon: Building2,     color:'blue',   grad:'var(--grad-blue)',    hint:'Registered' },
    { label:'Teachers', value: teacherCount,   icon: GraduationCap, color:'purple', grad:'var(--grad-purple)',  hint:'Active' },
    { label:'Students', value: studentCount,   icon: Users,          color:'cyan',   grad:'var(--grad-cyan)',    hint:'Enrolled' },
    { label:'System',   value:'99.8%',         icon: Activity,       color:'emerald',grad:'var(--grad-emerald)', hint:'Uptime' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Banner */}
      <div className="page-header-band" style={{ marginBottom:'1.75rem' }}>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:'0.78rem', fontWeight:700, letterSpacing:'.1em', opacity:.7, marginBottom:6 }}>SYSTEM OVERVIEW</div>
          <h2 style={{ color:'#fff', fontSize:'1.6rem', marginBottom:8 }}>Control Panel Dashboard</h2>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.875rem' }}>
            Full visibility and control over all schools, users, and exams.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px,1fr))', gap:'1.1rem', marginBottom:'1.75rem' }}>
        {stats.map((s,i) => (
          <div key={i} className={`stat-card ${s.color} animate-slide-up`}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
              <div className={`icon-box ${s.color} lg`}><s.icon size={22}/></div>
              <span className={`badge ${s.color === 'blue' ? 'info' : s.color === 'purple' ? 'purple' : s.color === 'cyan' ? 'cyan' : 'success'}`}>{s.hint}</span>
            </div>
            <div style={{ fontSize:'2.2rem', fontWeight:800, fontFamily:'Space Grotesk', background:s.grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text-secondary)' }}>{s.label}</div>
            <div style={{ marginTop:'1rem', height:3, borderRadius:10, background:'var(--border-light)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:'72%', background:s.grad, borderRadius:10 }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Schools Table */}
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:'1.1rem 1.5rem', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="icon-box blue sm"><Building2 size={16}/></div>
            <h3 style={{ fontSize:'0.95rem' }}>Registered Organizations</h3>
          </div>
          <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{schools.length} total</span>
        </div>
        <table className="data-table">
          <thead><tr><th>School</th><th>Location</th><th>Admin</th><th>Students</th><th>Status</th></tr></thead>
          <tbody>
            {schools.length === 0 && <tr><td colSpan={5}><div className="empty-state"><Building2 size={36}/><p>No schools registered yet.</p></div></td></tr>}
            {schools.map(s => (
              <tr key={s.id}>
                <td><div style={{ display:'flex', alignItems:'center', gap:10 }}><div className="icon-box blue sm"><Building2 size={14}/></div><span style={{ fontWeight:600 }}>{s.name}</span></div></td>
                <td style={{ color:'var(--text-secondary)' }}>{s.location||'—'}</td>
                <td style={{ color:'var(--text-secondary)', fontSize:'0.83rem' }}>{s.adminEmail||'—'}</td>
                <td><span className="badge info">{s.students||0}</span></td>
                <td><span className={`badge ${s.status==='Active'?'success':'danger'}`}>{s.status||'Active'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────── SCHOOLS CRUD ─────────────── */
const SUBJECTS = ['Mathematics','Science','English','Hindi','Social Studies','Computer Science','Physics','Chemistry','Biology','History','Geography','Economics'];

function SchoolsTab({ schools, setSchools, showToast }) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'', location:'', adminEmail:'', adminPassword:'', regId:'', status:'Active', subjects:[] });

  const resetForm = () => { setForm({ name:'', location:'', adminEmail:'', adminPassword:'', regId:'', status:'Active', subjects:[] }); setEditing(null); };

  const toggleSubject = (sub) => setForm(f => ({ ...f, subjects: f.subjects.includes(sub) ? f.subjects.filter(s=>s!==sub) : [...f.subjects, sub] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await updateDoc(doc(db,'schools',editing.id), { name:form.name, location:form.location, regId:form.regId, status:form.status, subjects:form.subjects });
        setSchools(prev => prev.map(s => s.id===editing.id ? {...s,...form} : s));
        showToast('School updated successfully!','success');
      } else {
        // Create Firebase Auth account for school admin
        let adminUid = null;
        if (form.adminEmail && form.adminPassword) {
          const cred = await createUserWithEmailAndPassword(auth, form.adminEmail, form.adminPassword);
          adminUid = cred.user.uid;
          // CRITICAL: store user doc with UID as the Document ID
          await setDoc(doc(db,'users', adminUid), {
            uid: adminUid, email: form.adminEmail, role: 'school_admin',
            name: form.name + ' Admin', createdAt: serverTimestamp()
          });
        }
        const docRef = await addDoc(collection(db,'schools'), {
          name:form.name, location:form.location, adminEmail:form.adminEmail,
          adminUid, regId:form.regId, status:form.status, subjects:form.subjects,
          students:0, teachers:0, createdAt:serverTimestamp()
        });
        setSchools(prev => [{ id:docRef.id, ...form, adminUid, students:0, teachers:0 }, ...prev]);
        showToast(`School "${form.name}" onboarded! Admin credentials are ready to login.`,'success');
      }
      setShowModal(false); resetForm();
    } catch (err) {
      showToast('Error: '+(err.message||'Something went wrong'),'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db,'schools',id));
      setSchools(prev => prev.filter(s=>s.id!==id));
      showToast('School removed.','success');
    } catch { showToast('Delete failed.','error'); }
    setConfirmDel(null);
  };

  const filtered = schools.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.location?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div>
          <h2 style={{ fontSize:'1.3rem', marginBottom:4 }}>School Management</h2>
          <p style={{ fontSize:'0.85rem' }}>Onboard and manage all registered organizations and their subjects.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}><PlusCircle size={17}/> Onboard School</button>
      </div>

      <div className="search-wrapper" style={{ marginBottom:'1.25rem' }}>
        <Search size={16} className="search-icon"/>
        <input className="input-field" placeholder="Search schools by name or location…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table className="data-table">
          <thead><tr><th>School</th><th>Location</th><th>Subjects</th><th>Admin Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={6}><div className="empty-state"><School size={36}/><p>{search?'No matches found.':'No schools yet. Click "Onboard School" to begin.'}</p></div></td></tr>}
            {filtered.map(s => (
              <tr key={s.id}>
                <td><div style={{ display:'flex', alignItems:'center', gap:10 }}><div className="icon-box blue sm"><Building2 size={14}/></div><span style={{ fontWeight:600 }}>{s.name}</span></div></td>
                <td style={{ color:'var(--text-secondary)' }}>{s.location||'—'}</td>
                <td>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {(s.subjects||[]).slice(0,3).map(sub=><span key={sub} className="badge info">{sub}</span>)}
                    {(s.subjects||[]).length>3 && <span className="badge" style={{ background:'#f1f5f9', color:'var(--text-secondary)' }}>+{s.subjects.length-3}</span>}
                  </div>
                </td>
                <td style={{ color:'var(--text-secondary)', fontSize:'0.83rem' }}>{s.adminEmail||'—'}</td>
                <td><span className={`badge ${s.status==='Active'?'success':'danger'}`}>{s.status||'Active'}</span></td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={()=>{ setEditing(s); setForm({name:s.name,location:s.location||'',adminEmail:s.adminEmail||'',adminPassword:'',regId:s.regId||'',status:s.status||'Active',subjects:s.subjects||[]}); setShowModal(true); }}><Pencil size={15}/></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--accent-rose)' }} title="Delete" onClick={()=>setConfirmDel(s.id)}><Trash2 size={15}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:580, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
              <div>
                <h3 style={{ fontSize:'1.15rem' }}>{editing?'Edit School':'Onboard New School'}</h3>
                <p style={{ fontSize:'0.85rem' }}>{editing?'Update school details and subjects.':'Register school and auto-create School Admin login credentials.'}</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={()=>{ setShowModal(false); resetForm(); }}><X size={18}/></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="input-label">School Name *</label><input required className="input-field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Delhi Public School"/></div>
                <div><label className="input-label">Location *</label><input required className="input-field" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="New Delhi"/></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="input-label">Reg ID</label><input className="input-field" value={form.regId} onChange={e=>setForm({...form,regId:e.target.value})} placeholder="REG-001"/></div>
                <div>
                  <label className="input-label">Status</label>
                  <select className="input-field" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Subjects Picker */}
              <div>
                <label className="input-label">Subjects Offered</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'0.75rem', background:'var(--bg-tertiary)', borderRadius:'var(--radius-md)', border:'1.5px solid var(--border-light)' }}>
                  {SUBJECTS.map(sub => (
                    <button type="button" key={sub} onClick={()=>toggleSubject(sub)}
                      style={{ padding:'4px 12px', borderRadius:20, border:'1.5px solid', cursor:'pointer', fontSize:'0.8rem', fontWeight:600, fontFamily:'inherit',
                        borderColor: form.subjects.includes(sub) ? 'var(--accent-blue)' : 'var(--border-medium)',
                        background:  form.subjects.includes(sub) ? 'var(--accent-blue-light)' : '#fff',
                        color:       form.subjects.includes(sub) ? 'var(--accent-blue)' : 'var(--text-secondary)'
                      }}>
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {!editing && (
                <>
                  <div className="divider"/>
                  <p style={{ fontSize:'0.8rem', color:'var(--accent-blue)', fontWeight:600 }}>🔐 School Admin Account — Auto-creates a Firebase login</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                    <div><label className="input-label">Admin Email *</label><input required type="email" className="input-field" value={form.adminEmail} onChange={e=>setForm({...form,adminEmail:e.target.value})} placeholder="admin@school.edu"/></div>
                    <div><label className="input-label">Admin Password *</label><input required type="password" className="input-field" value={form.adminPassword} onChange={e=>setForm({...form,adminPassword:e.target.value})} placeholder="Min 6 chars"/></div>
                  </div>
                </>
              )}

              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:'0.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={()=>{ setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Processing…':(editing?'Save Changes':'Provision School')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDel && <ConfirmModal message="This will permanently delete this school." onConfirm={()=>handleDelete(confirmDel)} onClose={()=>setConfirmDel(null)}/>}
    </div>
  );
}

/* ─────────────── TEACHERS TAB ─────────────── */
function TeachersTab({ schools, showToast }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', password:'', subject:'', schoolId:'', phone:'' });

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db,'teachers'));
        setTeachers(snap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.error(e); }
      setLoading(false);
    })();
  }, []);

  const schoolName = (id) => schools.find(s=>s.id===id)?.name || id || '—';

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = cred.user.uid;
      // Store with UID as document ID so AuthContext picks role correctly
      await setDoc(doc(db,'users', uid), { uid, email:form.email, name:form.name, role:'teacher', schoolId:form.schoolId, subject:form.subject, createdAt:serverTimestamp() });
      const docRef = await addDoc(collection(db,'teachers'), { uid, name:form.name, email:form.email, subject:form.subject, schoolId:form.schoolId, phone:form.phone, createdAt:serverTimestamp() });
      setTeachers(prev=>[{ id:docRef.id, ...form, uid }, ...prev]);
      showToast(`Teacher "${form.name}" created and can now login!`,'success');
      setShowModal(false);
      setForm({ name:'', email:'', password:'', subject:'', schoolId:'', phone:'' });
    } catch(err){ showToast('Error: '+err.message,'error'); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db,'teachers',id));
      setTeachers(prev=>prev.filter(t=>t.id!==id));
      showToast('Teacher removed.','success');
    } catch { showToast('Delete failed.','error'); }
    setConfirmDel(null);
  };

  // All unique subjects across all schools
  const allSubjects = [...new Set(schools.flatMap(s=>s.subjects||[]))];

  const filtered = teachers.filter(t =>
    (filterSchool==='all' || t.schoolId===filterSchool) &&
    (filterSubject==='all' || t.subject===filterSubject)
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div>
          <h2 style={{ fontSize:'1.3rem', marginBottom:4 }}>Teachers</h2>
          <p style={{ fontSize:'0.85rem' }}>Manage all teachers. Filter by school or subject.</p>
        </div>
        <button className="btn btn-purple" onClick={()=>setShowModal(true)}><UserPlus size={17}/> Add Teacher</button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'1rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <div>
          <label className="input-label" style={{ marginBottom:6 }}>By School</label>
          <select className="input-field" style={{ width:'auto', minWidth:180 }} value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}>
            <option value="all">All Schools</option>
            {schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label" style={{ marginBottom:6 }}>By Subject</label>
          <select className="input-field" style={{ width:'auto', minWidth:180 }} value={filterSubject} onChange={e=>setFilterSubject(e.target.value)}>
            <option value="all">All Subjects</option>
            {allSubjects.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ alignSelf:'flex-end' }}>
          <span className="badge purple">{filtered.length} teachers</span>
        </div>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        {loading ? <div style={{ padding:'2.5rem', textAlign:'center', color:'var(--text-muted)' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr><th>Teacher</th><th>Subject</th><th>School</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={5}><div className="empty-state"><GraduationCap size={36}/><p>No teachers found for the selected filters.</p></div></td></tr>}
              {filtered.map(t=>(
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight:600 }}>{t.name}</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{t.email}</div>
                  </td>
                  <td><span className="badge purple">{t.subject||'—'}</span></td>
                  <td style={{ color:'var(--text-secondary)' }}>{schoolName(t.schoolId)}</td>
                  <td style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>{t.phone||'—'}</td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--accent-rose)' }} onClick={()=>setConfirmDel(t.id)}><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:520 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
              <div><h3 style={{ fontSize:'1.15rem' }}>Add Teacher</h3><p style={{ fontSize:'0.85rem' }}>Creates Firebase login + assigns to school &amp; subject.</p></div>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="input-label">Full Name *</label><input required className="input-field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Jane Smith"/></div>
                <div><label className="input-label">Phone</label><input className="input-field" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 XXXXX"/></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="input-label">Email *</label><input required type="email" className="input-field" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="teacher@school.com"/></div>
                <div><label className="input-label">Password *</label><input required type="password" className="input-field" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 6 chars"/></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div>
                  <label className="input-label">School *</label>
                  <select required className="input-field" value={form.schoolId} onChange={e=>setForm({...form,schoolId:e.target.value})}>
                    <option value="">Select School</option>
                    {schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Subject *</label>
                  <select required className="input-field" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}>
                    <option value="">Select Subject</option>
                    {(schools.find(s=>s.id===form.schoolId)?.subjects || SUBJECTS).map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:'0.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-purple" disabled={submitting}>{submitting?'Creating…':'Add Teacher'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDel && <ConfirmModal message="Remove this teacher from the system?" onConfirm={()=>handleDelete(confirmDel)} onClose={()=>setConfirmDel(null)}/>}
    </div>
  );
}

/* ─────────────── STUDENTS TAB ─────────────── */
function StudentsTab({ schools, showToast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', password:'', schoolId:'', subjects:[], rollNo:'', class:'' });

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db,'students'));
        setStudents(snap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.error(e); }
      setLoading(false);
    })();
  }, []);

  const schoolName = (id) => schools.find(s=>s.id===id)?.name || id || '—';
  const toggleSub = (sub) => setForm(f=>({ ...f, subjects: f.subjects.includes(sub)?f.subjects.filter(s=>s!==sub):[...f.subjects,sub] }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = cred.user.uid;
      await setDoc(doc(db,'users', uid), { uid, email:form.email, name:form.name, role:'student', schoolId:form.schoolId, subjects:form.subjects, createdAt:serverTimestamp() });
      const docRef = await addDoc(collection(db,'students'), { uid, name:form.name, email:form.email, schoolId:form.schoolId, subjects:form.subjects, rollNo:form.rollNo, class:form.class, createdAt:serverTimestamp() });
      setStudents(prev=>[{ id:docRef.id, ...form, uid }, ...prev]);
      showToast(`Student "${form.name}" registered and can now login!`,'success');
      setShowModal(false);
      setForm({ name:'', email:'', password:'', schoolId:'', subjects:[], rollNo:'', class:'' });
    } catch(err){ showToast('Error: '+err.message,'error'); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db,'students',id));
      setStudents(prev=>prev.filter(s=>s.id!==id));
      showToast('Student removed.','success');
    } catch { showToast('Delete failed.','error'); }
    setConfirmDel(null);
  };

  const allSubjects = [...new Set(schools.flatMap(s=>s.subjects||[]))];

  const filtered = students.filter(s =>
    (filterSchool==='all' || s.schoolId===filterSchool) &&
    (filterSubject==='all' || (s.subjects||[]).includes(filterSubject)) &&
    (s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div>
          <h2 style={{ fontSize:'1.3rem', marginBottom:4 }}>Students</h2>
          <p style={{ fontSize:'0.85rem' }}>View and manage all students filtered by school, subject, or name.</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}><UserPlus size={17}/> Enroll Student</button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'1rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:200 }}>
          <label className="input-label" style={{ marginBottom:6 }}>Search</label>
          <div className="search-wrapper"><Search size={16} className="search-icon"/><input className="input-field" placeholder="Search by name or email…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        </div>
        <div>
          <label className="input-label" style={{ marginBottom:6 }}>By School</label>
          <select className="input-field" style={{ width:'auto', minWidth:180 }} value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}>
            <option value="all">All Schools</option>
            {schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label" style={{ marginBottom:6 }}>By Subject</label>
          <select className="input-field" style={{ width:'auto', minWidth:180 }} value={filterSubject} onChange={e=>setFilterSubject(e.target.value)}>
            <option value="all">All Subjects</option>
            {allSubjects.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ alignSelf:'flex-end' }}>
          <span className="badge info">{filtered.length} students</span>
        </div>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        {loading ? <div style={{ padding:'2.5rem', textAlign:'center', color:'var(--text-muted)' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr><th>Student</th><th>Roll No</th><th>Class</th><th>School</th><th>Subjects</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={6}><div className="empty-state"><Users size={36}/><p>No students found for the selected filters.</p></div></td></tr>}
              {filtered.map(s=>(
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight:600 }}>{s.name}</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{s.email}</div>
                  </td>
                  <td><span className="badge info">{s.rollNo||'—'}</span></td>
                  <td style={{ color:'var(--text-secondary)' }}>{s.class||'—'}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{schoolName(s.schoolId)}</td>
                  <td>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {(s.subjects||[]).slice(0,2).map(sub=><span key={sub} className="badge cyan">{sub}</span>)}
                      {(s.subjects||[]).length>2 && <span className="badge" style={{ background:'#f1f5f9', color:'var(--text-secondary)' }}>+{s.subjects.length-2}</span>}
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--accent-rose)' }} onClick={()=>setConfirmDel(s.id)}><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:560, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
              <div><h3 style={{ fontSize:'1.15rem' }}>Enroll New Student</h3><p style={{ fontSize:'0.85rem' }}>Creates Firebase login and enrolls student with subjects.</p></div>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="input-label">Full Name *</label><input required className="input-field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Rahul Sharma"/></div>
                <div><label className="input-label">Roll Number</label><input className="input-field" value={form.rollNo} onChange={e=>setForm({...form,rollNo:e.target.value})} placeholder="2024001"/></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="input-label">Class / Grade</label><input className="input-field" value={form.class} onChange={e=>setForm({...form,class:e.target.value})} placeholder="10-A"/></div>
                <div>
                  <label className="input-label">School *</label>
                  <select required className="input-field" value={form.schoolId} onChange={e=>setForm({...form,schoolId:e.target.value,subjects:[]})}>
                    <option value="">Select School</option>
                    {schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="input-label">Email *</label><input required type="email" className="input-field" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="student@school.com"/></div>
                <div><label className="input-label">Password *</label><input required type="password" className="input-field" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 6 chars"/></div>
              </div>

              {form.schoolId && (
                <div>
                  <label className="input-label">Select Subjects</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'0.75rem', background:'var(--bg-tertiary)', borderRadius:'var(--radius-md)', border:'1.5px solid var(--border-light)' }}>
                    {(schools.find(s=>s.id===form.schoolId)?.subjects || SUBJECTS).map(sub=>(
                      <button type="button" key={sub} onClick={()=>toggleSub(sub)}
                        style={{ padding:'4px 12px', borderRadius:20, border:'1.5px solid', cursor:'pointer', fontSize:'0.8rem', fontWeight:600, fontFamily:'inherit',
                          borderColor: form.subjects.includes(sub)?'var(--accent-cyan)':'var(--border-medium)',
                          background:  form.subjects.includes(sub)?'var(--accent-cyan-light)':'#fff',
                          color:       form.subjects.includes(sub)?'var(--accent-cyan)':'var(--text-secondary)'
                        }}>{sub}</button>
                    ))}
                  </div>
                </div>
              )}

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

/* ─────────────── ANALYTICS TAB ─────────────── */
function AnalyticsTab({ schools, teacherCount, studentCount }) {
  const metrics = [
    { label:'Platform Utilization', value:'78%', color:'var(--accent-blue)', grad:'var(--grad-blue)', icon:TrendingUp },
    { label:'Average Pass Rate',    value:'84%', color:'var(--accent-emerald)', grad:'var(--grad-emerald)', icon:CheckCircle2 },
    { label:'Active Schools',       value:schools.filter(s=>s.status!=='Suspended').length, color:'var(--accent-purple)', grad:'var(--grad-purple)', icon:Zap },
    { label:'Total Enrollments',    value:studentCount, color:'var(--accent-cyan)', grad:'var(--grad-cyan)', icon:Layers },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header-band" style={{ marginBottom:'1.75rem' }}>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:'0.78rem', fontWeight:700, letterSpacing:'.1em', opacity:.7, marginBottom:6 }}>REPORTS</div>
          <h2 style={{ color:'#fff', fontSize:'1.6rem' }}>System Analytics</h2>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.875rem' }}>Platform-wide performance and engagement metrics.</p>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))', gap:'1.25rem' }}>
        {metrics.map((m,i)=>(
          <div key={i} className="card" style={{ padding:'1.75rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <div style={{ padding:10, background:`${m.color}15`, borderRadius:'var(--radius-md)', color:m.color }}><m.icon size={22}/></div>
              <span className="badge success">LIVE</span>
            </div>
            <div style={{ fontSize:'2.6rem', fontWeight:800, fontFamily:'Space Grotesk', background:m.grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:4 }}>{m.value}</div>
            <div style={{ fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>{m.label}</div>
            <div style={{ marginTop:'1rem', height:4, borderRadius:10, background:'var(--border-light)', overflow:'hidden' }}>
              <div style={{ height:'100%', width: typeof m.value==='string' ? m.value : '60%', background:m.grad, borderRadius:10, maxWidth:'100%' }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Subject Distribution */}
      <div className="card" style={{ marginTop:'1.5rem', padding:'1.5rem' }}>
        <h3 style={{ fontSize:'1rem', marginBottom:'1.25rem' }}>Subject Coverage by School</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {schools.slice(0,5).map(s=>(
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
              <span style={{ width:180, fontSize:'0.875rem', fontWeight:600, color:'var(--text-primary)', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
              <div style={{ flex:1, display:'flex', flexWrap:'wrap', gap:4 }}>
                {(s.subjects||[]).map(sub=><span key={sub} className="badge info" style={{ fontSize:'0.7rem' }}>{sub}</span>)}
              </div>
            </div>
          ))}
          {schools.length===0 && <p style={{ color:'var(--text-muted)' }}>No schools registered yet.</p>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── MAIN DASHBOARD ─────────────── */
const TABS = [
  { id:'overview',   icon:BarChart3,    label:'Overview',  section:'MAIN' },
  { id:'schools',    icon:Building2,    label:'Schools',   section:'MANAGE' },
  { id:'teachers',   icon:GraduationCap,label:'Teachers',  section:'MANAGE' },
  { id:'students',   icon:Users,        label:'Students',  section:'MANAGE' },
  { id:'analytics',  icon:Activity,     label:'Analytics', section:'REPORTS' },
];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [schools, setSchools] = useState([]);
  const [teacherCount, setTeacherCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => setToast({ msg, type });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      showToast('Sign out failed. Try again.', 'error');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [schoolSnap, teacherSnap, studentSnap] = await Promise.all([
          getDocs(query(collection(db,'schools'), orderBy('createdAt','desc'))),
          getDocs(collection(db,'teachers')),
          getDocs(collection(db,'students'))
        ]);
        setSchools(schoolSnap.docs.map(d=>({id:d.id,...d.data()})));
        setTeacherCount(teacherSnap.size);
        setStudentCount(studentSnap.size);
      } catch(e){ console.error(e); }
    })();
  }, []);

  const sections = ['MAIN','MANAGE','REPORTS'];

  return (
    <>
      <div className="dashboard-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="icon-box blue lg" style={{ flexShrink:0 }}><Shield size={22}/></div>
              <div>
                <div style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'1rem' }} className="gradient-text-blue">ExamPortal</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', letterSpacing:'.08em', fontWeight:700 }}>SUPER ADMIN</div>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {sections.map(sect=>(
              <div key={sect}>
                <div className="sidebar-section-title">{sect}</div>
                {TABS.filter(t=>t.section===sect).map(item=>(
                  <button key={item.id} className={`nav-item ${activeTab===item.id?'active':''}`} onClick={()=>setActiveTab(item.id)}>
                    <item.icon size={17}/>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div style={{ padding:'0.625rem 0.75rem', background:'var(--accent-blue-light)', borderRadius:'var(--radius-md)', marginBottom:6 }}>
              <div style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--accent-blue)', letterSpacing:'.06em' }}>SUPER ADMIN</div>
              <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentUser?.email}</div>
            </div>
            <button className="nav-item" onClick={handleSignOut} style={{ color:'var(--accent-rose)' }}>
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
                <div style={{ fontSize:'0.8rem', fontWeight:600 }}>All Systems Operational</div>
                <div style={{ fontSize:'0.72rem', color:'var(--accent-emerald)' }}>● Firestore Connected</div>
              </div>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--grad-blue)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.85rem', color:'#fff' }}>SA</div>
            </div>
          </div>

          <div className="page-content">
            {activeTab==='overview'  && <OverviewTab schools={schools} teacherCount={teacherCount} studentCount={studentCount}/>}
            {activeTab==='schools'   && <SchoolsTab schools={schools} setSchools={setSchools} showToast={showToast}/>}
            {activeTab==='teachers'  && <TeachersTab schools={schools} showToast={showToast}/>}
            {activeTab==='students'  && <StudentsTab schools={schools} showToast={showToast}/>}
            {activeTab==='analytics' && <AnalyticsTab schools={schools} teacherCount={teacherCount} studentCount={studentCount}/>}
          </div>
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
