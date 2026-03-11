import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FilePlus, BarChart2, Trash2, Plus, LogOut,
  GraduationCap, CheckCircle2, AlertTriangle, X,
  Clock, BookOpen, Sparkles, Edit2, Eye, EyeOff, Download, FileText
} from 'lucide-react';
import {
  collection, getDocs, addDoc, deleteDoc, doc,
  query, where, serverTimestamp, updateDoc, getDoc
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import AIQuestionGenerator from '../../components/AIQuestionGenerator';
import { downloadDetailedResult, downloadClassMarksheet } from '../../services/pdfService';

/* ── Toast ── */
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const col = type === 'error' ? 'var(--accent-rose)' : type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-blue)';
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background:'#fff', borderLeft:`4px solid ${col}`, borderRadius:'var(--radius-md)', padding:'0.875rem 1.25rem', boxShadow:'var(--shadow-lg)', display:'flex', alignItems:'center', gap:12, maxWidth:380 }}>
      <CheckCircle2 size={18} color={col}/>
      <span style={{ fontSize:'0.875rem', flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={16}/></button>
    </div>
  );
}

/* ── Question builder (shared) ── */
function QuestionBuilder({ questions, setQuestions, subject, schoolId, showToast }) {
  const [showAI, setShowAI] = useState(false);

  const updateQ   = (qi, f, v) => setQuestions(qs => qs.map((q, i) => i===qi ? {...q,[f]:v} : q));
  const updateOpt = (qi, oi, v) => setQuestions(qs => qs.map((q, i) => i===qi ? {...q, options: q.options.map((o,j)=>j===oi?v:o)} : q));
  const addQ      = () => setQuestions(qs => [...qs, { text:'', options:['','','',''], correctAnswer:'', marks: 1 }]);
  const removeQ   = (qi) => setQuestions(qs => qs.filter((_,i) => i!==qi));
  const handleAIInsert = (aiQs) => {
    // Ensure AI questions have default marks
    const mappedAiQs = aiQs.map(q => ({ ...q, marks: 1 }));
    setQuestions(prev => { const c = prev.filter(q=>q.text.trim()); return [...c, ...mappedAiQs]; });
    setShowAI(false);
  };

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
        <h3 style={{ fontSize:'0.95rem' }}>Questions ({questions.length})</h3>
        <div style={{ display:'flex', gap:8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={()=>setShowAI(true)}
            style={{ color:'var(--accent-purple)', borderColor:'var(--accent-purple)', background:'var(--accent-purple-light)', gap:5 }}>
            <Sparkles size={15}/> AI Generate
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addQ}><Plus size={15}/> Add</button>
        </div>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="card" style={{ padding:'1.25rem', marginBottom:'1rem', borderLeft:'3px solid var(--accent-blue)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
            <span style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--accent-blue)' }}>Q{qi+1}</span>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <label style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-secondary)' }}>Marks</label>
              <input type="number" min="1" className="input-field" style={{ width:60, padding:'4px 8px' }} value={q.marks || 1} onChange={e=>updateQ(qi,'marks',Number(e.target.value))} />
              {questions.length > 1 && <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--accent-rose)' }} onClick={()=>removeQ(qi)}><Trash2 size={14}/></button>}
            </div>
          </div>
          <div style={{ marginBottom:'0.75rem' }}>
            <label className="input-label">Question *</label>
            <textarea className="input-field" rows={2} value={q.text} onChange={e=>updateQ(qi,'text',e.target.value)} placeholder="Type question here…"/>
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

      {showAI && <AIQuestionGenerator defaultSubject={subject} onInsert={handleAIInsert} onClose={()=>setShowAI(false)}/>}
    </>
  );
}

/* ── Create Exam Tab ── */
function CreateExamTab({ teacherInfo, schoolId, showToast, onCreated }) {
  const [form, setForm]         = useState({ title:'', subject:'', targetClass:'', duration:60, instructions:'', passingMarks:40 });
  const [questions, setQuestions] = useState([{ text:'', options:['','','',''], correctAnswer:'', marks: 1 }]);
  const [saving, setSaving]     = useState(false);

  if (!schoolId) return (
    <div className="card" style={{ padding:'2rem', textAlign:'center' }}>
      <AlertTriangle size={32} color="var(--accent-amber)" style={{ marginBottom:12 }}/>
      <p style={{ fontWeight:600, marginBottom:6 }}>School not linked to your account.</p>
      <p style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>Contact School Admin to link your teacher account to a school.</p>
    </div>
  );

  const handlePublish = async (status) => {
    if (!form.title.trim()) { showToast('Enter exam title.','error'); return; }
    if (questions.some(q=>!q.text.trim())) { showToast('Fill all question texts.','error'); return; }
    setSaving(true);
    try {
      const ref = await addDoc(collection(db,'exams'), {
        title:       form.title.trim(),
        subject:     form.subject.trim(),
        targetClass: form.targetClass.trim(), // "" = visible to all classes in school
        duration:    form.duration,
        instructions:form.instructions.trim(),
        totalMarks:  questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0),
        passingMarks:form.passingMarks,
        schoolId,
        teacherUid:  teacherInfo?.uid || '',
        teacherName: teacherInfo?.name || '',
        questions,
        status,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      });
      showToast(status==='Active' ? '🚀 Exam published! Students can now take it.' : '💾 Draft saved.', 'success');
      onCreated({ id: ref.id, ...form, questions, status });
      setForm({ title:'', subject:'', targetClass:'', duration:60, instructions:'', passingMarks:40 });
      setQuestions([{ text:'', options:['','','',''], correctAnswer:'', marks: 1 }]);
    } catch(e) { showToast('Error: '+e.message,'error'); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Create New Exam</h2>
      <p style={{ fontSize:'0.85rem', marginBottom:'1.5rem' }}>Build the exam, add questions, then publish for students.</p>

      <div className="card" style={{ padding:'1.5rem', marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <h3 style={{ fontSize:'0.9rem', color:'var(--accent-blue)' }}>📋 Exam Details</h3>
          <div style={{ background:'var(--accent-blue-light)', color:'var(--accent-blue)', padding:'4px 12px', borderRadius:20, fontSize:'0.85rem', fontWeight:700 }}>
            Total Marks: {questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
          <div><label className="input-label">Exam Title *</label>
            <input required className="input-field" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Final Science Exam"/></div>
          <div><label className="input-label">Subject</label>
            <input className="input-field" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="e.g. Science, Maths"/></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
          <div><label className="input-label">Target Class <span style={{color:'var(--text-muted)',fontWeight:400}}>(blank = all)</span></label>
            <input className="input-field" value={form.targetClass} onChange={e=>setForm({...form,targetClass:e.target.value})} placeholder="e.g. 10-A, Class 9"/></div>
          <div><label className="input-label">Duration (mins)</label>
            <input type="number" min={5} className="input-field" value={form.duration} onChange={e=>setForm({...form,duration:Number(e.target.value)})}/></div>
          <div><label className="input-label">Passing Marks (%)</label>
            <input type="number" min={1} max={100} className="input-field" value={form.passingMarks} onChange={e=>setForm({...form,passingMarks:Number(e.target.value)})}/></div>
        </div>
        <div><label className="input-label">Instructions</label>
          <textarea className="input-field" rows={2} value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} placeholder="Read each question carefully…"/></div>
      </div>

      <QuestionBuilder questions={questions} setQuestions={setQuestions} subject={form.subject} schoolId={schoolId} showToast={showToast}/>

      <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:'1rem' }}>
        <button className="btn btn-ghost" onClick={()=>handlePublish('Draft')} disabled={saving}>💾 Save Draft</button>
        <button className="btn btn-primary" onClick={()=>handlePublish('Active')} disabled={saving} style={{ minWidth:160 }}>
          {saving ? 'Publishing…' : '🚀 Publish Exam'}
        </button>
      </div>
    </div>
  );
}

/* ── Edit Exam Modal ── */
function EditExamModal({ exam, onSave, onClose, showToast }) {
  const [form, setForm]         = useState({ title: exam.title||'', subject: exam.subject||'', targetClass: exam.targetClass||'', duration: exam.duration||60, instructions: exam.instructions||'', passingMarks: exam.passingMarks||40 });
  const [questions, setQuestions] = useState(exam.questions || []);
  const [saving, setSaving]     = useState(false);

  const handleSave = async (status) => {
    if (!form.title.trim()) { showToast('Enter exam title.', 'error'); return; }
    setSaving(true);
    try {
      const upd = { ...form, questions, status, updatedAt: serverTimestamp() };
      await updateDoc(doc(db,'exams', exam.id), upd);
      showToast(status==='Active' ? '✅ Exam published!' : '💾 Draft saved.', 'success');
      onSave({ ...exam, ...upd });
      onClose();
    } catch(e) { showToast('Error: '+e.message,'error'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" style={{ zIndex:9990, overflowY:'auto', alignItems:'flex-start', padding:'1rem' }}>
      <div className="modal-box" style={{ maxWidth:680, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
          <div>
            <h3 style={{ marginBottom:4 }}>✏️ Edit Exam</h3>
            <p style={{ fontSize:'0.85rem' }}>Update questions, status, and details.</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="card" style={{ padding:'1.25rem', marginBottom:'1.25rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
            <div><label className="input-label">Title *</label><input required className="input-field" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
            <div><label className="input-label">Subject</label><input className="input-field" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
            <div><label className="input-label">Target Class</label><input className="input-field" value={form.targetClass} onChange={e=>setForm({...form,targetClass:e.target.value})} placeholder="blank = all classes"/></div>
            <div><label className="input-label">Duration (mins)</label><input type="number" className="input-field" value={form.duration} onChange={e=>setForm({...form,duration:Number(e.target.value)})}/></div>
            <div><label className="input-label">Passing %</label><input type="number" className="input-field" value={form.passingMarks} onChange={e=>setForm({...form,passingMarks:Number(e.target.value)})}/></div>
          </div>
          <div><label className="input-label">Instructions</label><textarea className="input-field" rows={2} value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})}/></div>
        </div>

        <QuestionBuilder questions={questions} setQuestions={setQuestions} subject={form.subject} showToast={showToast}/>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:'1.25rem', paddingTop:'1rem', borderTop:'1px solid var(--border-light)' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-ghost" onClick={()=>handleSave('Draft')} disabled={saving}>💾 Save as Draft</button>
          <button className="btn btn-primary" onClick={()=>handleSave('Active')} disabled={saving}>
            {saving?'Saving…':'✅ Save & Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Exams List Tab ── */
function ExamsTab({ exams, setExams, showToast }) {
  const [confirmDel, setConfirmDel] = useState(null);
  const [editExam, setEditExam]     = useState(null);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db,'exams',id));
    setExams(p=>p.filter(e=>e.id!==id));
    showToast('Exam deleted.','success');
    setConfirmDel(null);
  };

  const toggleStatus = async (exam) => {
    const newStatus = exam.status==='Active' ? 'Draft' : 'Active';
    await updateDoc(doc(db,'exams',exam.id), { status:newStatus, updatedAt:serverTimestamp() });
    setExams(p=>p.map(e=>e.id===exam.id?{...e,status:newStatus}:e));
    showToast(`Exam ${newStatus==='Active'?'published ✅':'unpublished'}.`, 'success');
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>My Exams</h2>
      <p style={{ fontSize:'0.85rem', marginBottom:'1.25rem' }}>
        Edit, publish, or unpublish exams. Students only see <strong>Active</strong> exams.
      </p>

      <div className="card" style={{ overflow:'hidden' }}>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Subject</th><th>Class</th><th>Qs</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {exams.length===0 && <tr><td colSpan={7}><div className="empty-state"><FilePlus size={36}/><p>No exams yet. Go to "Create Exam" to build one.</p></div></td></tr>}
            {exams.map(e=>(
              <tr key={e.id}>
                <td style={{ fontWeight:600, maxWidth:180 }}>{e.title}</td>
                <td><span className="badge purple">{e.subject||'—'}</span></td>
                <td style={{ color:'var(--text-secondary)', fontSize:'0.82rem' }}>{e.targetClass||<span style={{color:'var(--text-muted)'}}>All</span>}</td>
                <td style={{ color:'var(--text-secondary)' }}>{(e.questions||[]).length}</td>
                <td><span style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.82rem' }}><Clock size={13}/>{e.duration||60}m</span></td>
                <td>
                  <button onClick={()=>toggleStatus(e)}
                    className={`badge ${e.status==='Active'?'success':'warning'}`}
                    style={{ cursor:'pointer', border:'none', fontFamily:'inherit', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                    {e.status==='Active' ? <><Eye size={12}/> Active</> : <><EyeOff size={12}/> Draft</>}
                  </button>
                </td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setEditExam(e)} title="Edit"><Edit2 size={14}/></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--accent-rose)' }} onClick={()=>setConfirmDel(e.id)} title="Delete"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editExam && (
        <EditExamModal
          exam={editExam}
          showToast={showToast}
          onSave={(updated) => setExams(p=>p.map(e=>e.id===updated.id?updated:e))}
          onClose={()=>setEditExam(null)}
        />
      )}

      {/* Delete Confirm */}
      {confirmDel && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:380 }}>
            <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:'1.25rem' }}>
              <div className="icon-box rose lg"><AlertTriangle size={20}/></div>
              <div><h3 style={{ marginBottom:6 }}>Delete Exam?</h3><p style={{ fontSize:'0.875rem' }}>This cannot be undone. Student results will remain.</p></div>
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

/* ── Results Tab ── */
function ResultsTab({ schoolId, schoolName }) {
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [exams,       setExams]       = useState([]);
  const [filterExam,  setFilterExam]  = useState('all');
  const [filterClass, setFilterClass] = useState('all');

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

  // Unique classes from results
  const classes = [...new Set(results.map(r=>r.class).filter(Boolean))].sort();

  const filtered = results.filter(r =>
    (filterExam  ==='all' || r.examId === filterExam) &&
    (filterClass ==='all' || r.class  === filterClass)
  );
  const avg    = filtered.length ? Math.round(filtered.reduce((s,r)=>s+(r.percentage||0),0)/filtered.length) : 0;
  const passed = filtered.filter(r=>(r.percentage||0)>=40).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Results</h2>
          <p style={{ fontSize:'0.85rem' }}>Student scores with Q-by-Q breakdown. Not visible to students.</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <select className="input-field" style={{ width:180 }} value={filterExam} onChange={e=>setFilterExam(e.target.value)}>
            <option value="all">All Exams</option>
            {exams.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <select className="input-field" style={{ width:130 }} value={filterClass} onChange={e=>setFilterClass(e.target.value)}>
            <option value="all">All Classes</option>
            {classes.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          {filtered.length > 0 && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => downloadClassMarksheet(filtered, filterClass==='all'?'':filterClass, '', schoolName)}
              style={{ color:'var(--accent-purple)', borderColor:'var(--accent-purple)', background:'var(--accent-purple-light)', gap:5 }}>
              <Download size={14}/> Marksheet PDF
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {filtered.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'1rem', marginBottom:'1.25rem' }}>
          {[
            {label:'Submissions', value:filtered.length,        color:'var(--accent-blue)'   },
            {label:'Avg Score',   value:`${avg}%`,              color:'var(--accent-purple)' },
            {label:'Passed',      value:passed,                  color:'var(--accent-emerald)'},
            {label:'Failed',      value:filtered.length-passed, color:'var(--accent-rose)'   },
          ].map(s=>(
            <div key={s.label} className="card" style={{ padding:'1.25rem', textAlign:'center' }}>
              <div style={{ fontSize:'1.8rem', fontWeight:800, fontFamily:'Space Grotesk', color:s.color, marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:'0.78rem', fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow:'hidden' }}>
        {loading ? <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>%</th><th>Result</th><th>Date</th><th>PDF</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={7}><div className="empty-state"><BarChart2 size={36}/><p>No results yet.</p></div></td></tr>}
              {filtered.map(r=>{
                const pass=(r.percentage||0)>=40;
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight:600 }}>{r.studentName||'—'}</div>
                      <div style={{ fontSize:'0.73rem', color:'var(--text-muted)' }}>{r.rollNo?`Roll:${r.rollNo}`:''}{r.class?` | ${r.class}`:''}</div>
                    </td>
                    <td style={{ fontSize:'0.82rem', maxWidth:140 }}>{r.examTitle||'—'}</td>
                    <td style={{ fontWeight:700 }}>{r.correct||0}/{r.totalMarks||0}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:44, height:5, background:'var(--border-light)', borderRadius:10, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${r.percentage||0}%`, background:pass?'var(--grad-emerald)':'var(--grad-rose)', borderRadius:10 }}/>
                        </div>
                        <span style={{ fontSize:'0.8rem', fontWeight:700, color:pass?'var(--accent-emerald)':'var(--accent-rose)' }}>{r.percentage||0}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${pass?'success':'danger'}`}>{pass?'Pass':'Fail'}</span></td>
                    <td style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{r.submittedAt?.toDate?r.submittedAt.toDate().toLocaleDateString('en-IN'):'—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Download Detailed Result PDF"
                        onClick={() => downloadDetailedResult(r, schoolName)}
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

/* ── MAIN ── */
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
  const [schoolName, setSchoolName] = useState('');
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type='success') => setToast({ msg, type });
  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const userDoc  = await getDoc(doc(db,'users', currentUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        setTeacherInfo(userData);
        const sid = userData.schoolId;
        setSchoolId(sid || null);
        if (sid) {
          const snap = await getDocs(query(collection(db,'exams'), where('schoolId','==',sid)));
          setExams(snap.docs.map(d=>({id:d.id,...d.data()})));
          const sDoc = await getDoc(doc(db,'schools', sid));
          if (sDoc.exists()) setSchoolName(sDoc.data().name);
        }
      } catch(e) { console.error(e); }
    })();
  }, [currentUser]);

  return (
    <>
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="icon-box purple lg"><GraduationCap size={20}/></div>
              <div>
                <div style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'0.95rem', color:'var(--accent-purple)' }}>Teacher Portal</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700 }}>{teacherInfo?.name||currentUser?.email}</div>
              </div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-section-title">PORTAL</div>
            {TABS.map(item=>(
              <button key={item.id} className={`nav-item ${activeTab===item.id?'active':''}`} onClick={()=>setActiveTab(item.id)}>
                <item.icon size={17}/> {item.label}
                {item.id==='results' && <span className="badge info" style={{ marginLeft:'auto', fontSize:'0.68rem' }}>Admin View</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div style={{ padding:'0.6rem 0.75rem', background:'var(--accent-purple-light)', borderRadius:'var(--radius-md)', marginBottom:6 }}>
              <div style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--accent-purple)', letterSpacing:'.06em' }}>
                TEACHER {teacherInfo?.subject ? `· ${teacherInfo.subject}` : ''}
              </div>
              <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentUser?.email}</div>
            </div>
            <button className="nav-item" onClick={handleLogout} style={{ color:'var(--accent-rose)' }}>
              <LogOut size={17}/> Sign Out
            </button>
          </div>
        </aside>

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
                <div style={{ fontSize:'0.8rem', fontWeight:600 }}>{exams.filter(e=>e.status==='Active').length} Active · {exams.filter(e=>e.status==='Draft').length} Draft</div>
                <div style={{ fontSize:'0.72rem', color:'var(--accent-emerald)' }}>● {teacherInfo?.subject||'Teacher'}</div>
              </div>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--grad-purple)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.85rem', color:'#fff' }}>T</div>
            </div>
          </div>

          <div className="page-content">
            {activeTab==='exams'   && <ExamsTab exams={exams} setExams={setExams} showToast={showToast}/>}
            {activeTab==='create'  && <CreateExamTab teacherInfo={teacherInfo} schoolId={schoolId} showToast={showToast} onCreated={e=>{setExams(p=>[e,...p]); setActiveTab('exams');}}/>}
            {activeTab === 'results' && <ResultsTab schoolId={schoolId} schoolName={schoolName} />}
          </div>
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
