import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, User, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

/* ─────── STATUS COLOR HELPER ─────── */
const STATUS_COLOR = {
  answered:       '#16a34a',
  not_answered:   '#ef4444',
  not_visited:    '#e2e8f0',
  marked:         '#a855f7',
  marked_answered:'#7c3aed',
};

/* ─────── SUBMIT CONFIRM MODAL ─────── */
function SubmitModal({ stats, onConfirm, onCancel, submitting }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'2rem', maxWidth:420, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,.2)', animation:'slideUp .3s ease' }}>
        <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:'1.5rem' }}>
          <div style={{ width:48, height:48, background:'#fff7ed', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><AlertTriangle size={24} color="#f97316"/></div>
          <div>
            <h3 style={{ marginBottom:6, fontSize:'1.1rem' }}>Submit Exam?</h3>
            <p style={{ fontSize:'0.875rem', color:'#64748b' }}>Please review your status before submitting.</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:'1.5rem' }}>
          {[
            { label:'Answered',         val: stats.answered,       bg:'#dcfce7', color:'#16a34a' },
            { label:'Not Answered',     val: stats.not_answered,   bg:'#fee2e2', color:'#ef4444' },
            { label:'Marked for Review',val: stats.marked + stats.marked_answered, bg:'#f3e8ff', color:'#9333ea' },
            { label:'Not Visited',      val: stats.not_visited,    bg:'#f1f5f9', color:'#64748b' },
          ].map(s => (
            <div key={s.label} style={{ padding:'0.75rem', background:s.bg, borderRadius:10, textAlign:'center' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:800, color:s.color, fontFamily:'Space Grotesk' }}>{s.val}</div>
              <div style={{ fontSize:'0.75rem', color:s.color, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{ padding:'0.6rem 1.25rem', background:'transparent', border:'1.5px solid #e2e8f0', borderRadius:10, cursor:'pointer', fontWeight:600, fontFamily:'inherit' }}>Go Back</button>
          <button onClick={onConfirm} disabled={submitting} style={{ padding:'0.6rem 1.5rem', background:'linear-gradient(135deg,#2563eb,#4f46e5)', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontFamily:'inherit', opacity: submitting?0.7:1 }}>
            {submitting ? 'Submitting…' : 'Submit Final'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────── SUBMITTED SCREEN ─────── */
function SubmittedScreen({ examTitle, navigate }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#eff6ff,#f0fdf4)' }}>
      <div style={{ textAlign:'center', maxWidth:420, padding:'2rem' }}>
        <div style={{ width:80, height:80, background:'#dcfce7', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem', boxShadow:'0 0 0 12px #f0fdf4' }}>
          <CheckCircle2 size={40} color="#16a34a"/>
        </div>
        <h2 style={{ fontSize:'1.5rem', marginBottom:'0.5rem', fontFamily:'Space Grotesk' }}>Exam Submitted!</h2>
        <p style={{ color:'#64748b', marginBottom:'0.5rem' }}><strong>{examTitle}</strong></p>
        <p style={{ color:'#64748b', fontSize:'0.875rem', marginBottom:'2rem' }}>
          Your responses have been recorded. Results will be reviewed and shared by your teacher or school admin.
        </p>
        <button onClick={() => navigate('/student')} style={{ padding:'0.75rem 2rem', background:'linear-gradient(135deg,#2563eb,#4f46e5)', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:'1rem', fontFamily:'inherit', boxShadow:'0 4px 15px rgba(37,99,235,.3)' }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

/* ─────── MAIN EXAM ROOM ─────── */
export default function ExamRoom() {
  const { examId } = useParams();
  const navigate   = useNavigate();
  const { currentUser } = useAuth();

  const [exam, setExam]           = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]       = useState({});   // { qIdx: optionText }
  const [statuses, setStatuses]     = useState({});   // { qIdx: status_string }
  const [timeLeft, setTimeLeft]     = useState(0);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [submitted, setSubmitted]             = useState(false);

  /* Load exam + student info from Firestore */
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const [examDoc, userDoc] = await Promise.all([
          getDoc(doc(db, 'exams', examId)),
          getDoc(doc(db, 'users', currentUser.uid)),
        ]);

        if (!examDoc.exists()) { setError('Exam not found.'); setLoading(false); return; }
        const examData = { id: examDoc.id, ...examDoc.data() };
        setExam(examData);
        setTimeLeft((examData.duration || 60) * 60);

        // Init question statuses
        const initStatus = {};
        (examData.questions||[]).forEach((_, i) => { initStatus[i] = i===0 ? 'not_answered' : 'not_visited'; });
        setStatuses(initStatus);

        if (userDoc.exists()) setStudentInfo(userDoc.data());
      } catch(e) { setError('Failed to load exam.'); console.error(e); }
      setLoading(false);
    })();
  }, [examId, currentUser]);

  /* Auto-submit on timer end */
  const handleSubmitFinal = useCallback(async () => {
    if (!exam || !currentUser || submitting) return;
    setSubmitting(true);
    try {
      const questions = exam.questions || [];
      let correct = 0;
      let score = 0;
      let totalMarks = 0;
      
      const answerSheet = questions.map((q, i) => {
        const given = answers[i] || null;
        const isCorrect = given && given === q.correctAnswer;
        const qMarks = Number(q.marks) || 1;
        
        totalMarks += qMarks;
        if (isCorrect) {
          correct++;
          score += qMarks;
        }
        
        return { 
          questionText: q.text, 
          selectedOption: given, 
          correctAnswer: q.correctAnswer||null, 
          isCorrect,
          marks: qMarks
        };
      });

      await addDoc(collection(db,'results'), {
        examId,
        examTitle:   exam.title,
        subject:     exam.subject || '',
        schoolId:    exam.schoolId || studentInfo?.schoolId || '',
        studentUid:  currentUser.uid,
        studentName: studentInfo?.name || currentUser.email,
        rollNo:      studentInfo?.rollNo || '',
        class:       studentInfo?.class  || '',
        totalQuestions: questions.length,
        attempted:   Object.keys(answers).length,
        correct,
        incorrect:   Object.keys(answers).length - correct,
        score,
        totalMarks,
        percentage:  totalMarks > 0 ? Math.round((score/totalMarks)*100) : 0,
        answerSheet,
        isApproved: false,
        submittedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch(e) { console.error(e); alert('Submit failed. Please try again.'); }
    setSubmitting(false);
    setShowSubmitModal(false);
  }, [exam, currentUser, answers, examId, studentInfo, submitting]);

  /* Timer countdown */
  useEffect(() => {
    if (!exam || timeLeft <= 0 || submitted) return;
    if (timeLeft === 1) { handleSubmitFinal(); return; }
    const id = setInterval(() => setTimeLeft(t => t-1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, exam, submitted, handleSubmitFinal]);

  /* Helpers */
  const formatTime = (s) => {
    const h = String(Math.floor(s/3600)).padStart(2,'0');
    const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
    const sec = String(s%60).padStart(2,'0');
    return `${h}:${m}:${sec}`;
  };

  const updateStatus = (idx, override) => {
    const status = override || (answers[idx] ? 'answered' : 'not_answered');
    setStatuses(prev => ({
      ...prev,
      [idx]: status,
    }));
  };

  const selectAnswer = (opt) => setAnswers(prev => ({ ...prev, [currentIdx]: opt }));
  const clearAnswer  = () => setAnswers(prev => { const n={...prev}; delete n[currentIdx]; return n; });

  const goTo = (next, statusOverride) => {
    updateStatus(currentIdx, statusOverride);
    setStatuses(prev => ({
      ...prev,
      [next]: prev[next]==='not_visited' ? 'not_answered' : prev[next]
    }));
    setCurrentIdx(next);
  };

  const computeStats = () => {
    const counts = { answered:0, not_answered:0, not_visited:0, marked:0, marked_answered:0 };
    Object.values(statuses).forEach(s => { if (s in counts) counts[s]++; });
    return counts;
  };

  /* ─── LOADING / ERROR ─── */
  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', color:'#64748b' }}>Loading exam…</div>;
  if (error)   return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}><AlertTriangle size={40} color="#ef4444"/><p style={{ color:'#ef4444', fontSize:'1rem' }}>{error}</p><button onClick={()=>navigate('/student')} style={{ padding:'0.6rem 1.5rem', background:'#2563eb', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:600, fontFamily:'inherit' }}>Go Back</button></div>;
  if (submitted) return <SubmittedScreen examTitle={exam?.title} navigate={navigate}/>;

  const questions  = exam?.questions || [];
  const currentQ   = questions[currentIdx];
  const stats      = computeStats();
  const isLowTime  = timeLeft < 300; // < 5 mins

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#f0f4f8', fontFamily:'Inter, sans-serif', overflow:'hidden' }}>

      {/* ── TOP HEADER ── */}
      <header style={{ background:'#1e3a8a', color:'#fff', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.1rem', fontWeight:700, fontFamily:'Space Grotesk' }}>{exam?.title}</h1>
          <div style={{ fontSize:'0.78rem', color:'#93c5fd', marginTop:2 }}>
            {exam?.subject ? `Subject: ${exam.subject}` : ''} · {questions.length} Questions · {exam?.duration||60} mins
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background: isLowTime?'#fee2e2':'rgba(255,255,255,0.15)', border:`1px solid ${isLowTime?'#fca5a5':'rgba(255,255,255,.3)'}`, borderRadius:8, padding:'6px 14px', display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:'1.1rem', color: isLowTime?'#ef4444':'#fff' }}>
            <Clock size={18}/> {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* LEFT: QUESTION PANEL */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#fff', borderRight:'1px solid #e2e8f0' }}>

          {/* Section Bar */}
          <div style={{ padding:'10px 20px', borderBottom:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:600, fontSize:'0.9rem', color:'#1e40af' }}>Questions</div>
            <div style={{ fontSize:'0.85rem', color:'#64748b' }}>Q {currentIdx+1} of {questions.length}</div>
          </div>

          {/* Question Text */}
          <div style={{ flex:1, padding:'24px', overflowY:'auto' }}>
            {!currentQ ? (
              <p style={{ color:'#94a3b8' }}>No questions in this exam yet.</p>
            ) : (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                  <div style={{ fontSize:'1rem', fontWeight:700, color:'#0f172a', lineHeight:1.6, flex:1 }}>
                    <span style={{ color:'#2563eb' }}>Q{currentIdx+1}.</span> {currentQ.text}
                  </div>
                  <div style={{ background:'#eff6ff', color:'#2563eb', padding:'4px 10px', borderRadius:20, fontSize:'0.8rem', fontWeight:700, whiteSpace:'nowrap', marginLeft:12 }}>
                    {currentQ.marks || 1} Mark{Number(currentQ.marks||1) !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {(currentQ.options||[]).map((opt, oi) => {
                    const selected = answers[currentIdx] === opt;
                    return (
                      <label key={oi} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', border:`1.5px solid ${selected?'#2563eb':'#e2e8f0'}`, borderRadius:10, cursor:'pointer', background: selected?'#eff6ff':'#fff', transition:'all .15s' }}>
                        <input type="radio" name={`q-${currentIdx}`} value={opt} checked={selected} onChange={()=>selectAnswer(opt)} style={{ width:18, height:18, accentColor:'#2563eb', flexShrink:0 }}/>
                        <span style={{ fontSize:'0.95rem', color: selected?'#1e40af':'#0f172a', fontWeight: selected?600:400 }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Action Bar */}
          <div style={{ padding:'14px 20px', borderTop:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>goTo(currentIdx, answers[currentIdx]?'marked_answered':'marked')} style={{ padding:'8px 14px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:'0.85rem', color:'#7c3aed', fontFamily:'inherit' }}>
                Mark & Next
              </button>
              <button onClick={clearAnswer} style={{ padding:'8px 14px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:'0.85rem', color:'#64748b', fontFamily:'inherit' }}>
                Clear
              </button>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {currentIdx > 0 && (
                <button onClick={()=>goTo(currentIdx-1)} style={{ padding:'8px 14px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:'0.85rem', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                  <ChevronLeft size={16}/> Prev
                </button>
              )}
              {currentIdx < questions.length-1 ? (
                <button onClick={()=>goTo(currentIdx+1)} style={{ padding:'8px 20px', background:'linear-gradient(135deg,#16a34a,#0891b2)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:'0.9rem', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                  Save & Next <ChevronRight size={16}/>
                </button>
              ) : (
                <button onClick={()=>{ updateStatus(currentIdx); setShowSubmitModal(true); }} style={{ padding:'8px 20px', background:'linear-gradient(135deg,#2563eb,#4f46e5)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:'0.9rem', fontFamily:'inherit' }}>
                  Review & Submit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: PALETTE PANEL */}
        <div style={{ width:280, background:'#f8fafc', display:'flex', flexDirection:'column', overflowY:'auto' }}>

          {/* Student Profile */}
          <div style={{ padding:'14px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, background:'#e0e7ff', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <User size={22} color="#4f46e5"/>
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontWeight:700, fontSize:'0.9rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{studentInfo?.name || currentUser?.email}</div>
              <div style={{ fontSize:'0.75rem', color:'#64748b' }}>{studentInfo?.rollNo ? `Roll: ${studentInfo.rollNo}` : ''}</div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #e2e8f0' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'0.75rem' }}>
              {[
                { status:'answered',       label:'Answered' },
                { status:'not_answered',   label:'Not Answered' },
                { status:'marked',         label:'Marked' },
                { status:'not_visited',    label:'Not Visited' },
              ].map(({ status, label }) => (
                <div key={status} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center', background: STATUS_COLOR[status], borderRadius: status==='marked'?'50%':4, border: status==='not_visited'?'1px solid #cbd5e1':'none', color: status==='not_visited'?'#334155':'#fff', fontSize:'0.65rem', fontWeight:700, flexShrink:0 }}>1</span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Stats summary */}
          <div style={{ padding:'10px 14px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.75rem', background:'#dcfce7', color:'#16a34a', padding:'3px 8px', borderRadius:20, fontWeight:600 }}>✓ {stats.answered}</span>
            <span style={{ fontSize:'0.75rem', background:'#fee2e2', color:'#ef4444', padding:'3px 8px', borderRadius:20, fontWeight:600 }}>✗ {stats.not_answered}</span>
            <span style={{ fontSize:'0.75rem', background:'#f3e8ff', color:'#9333ea', padding:'3px 8px', borderRadius:20, fontWeight:600 }}>● {stats.marked + stats.marked_answered}</span>
          </div>

          {/* Question Palette */}
          <div style={{ flex:1, padding:'12px', overflowY:'auto' }}>
            <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#1e40af', marginBottom:10, letterSpacing:'.06em' }}>QUESTION PALETTE</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
              {questions.map((_, idx) => {
                const status = statuses[idx] || 'not_visited';
                const bg     = STATUS_COLOR[status];
                const isCur  = idx === currentIdx;
                return (
                  <button key={idx} onClick={()=>goTo(idx)}
                    style={{ aspectRatio:'1', background: status==='not_visited'?'transparent':bg, color: status==='not_visited'?'#334155':'#fff', border: isCur?'2.5px solid #0f172a':`1px solid ${status==='not_visited'?'#cbd5e1':bg}`, borderRadius: status.startsWith('marked')?'50%':6, cursor:'pointer', fontWeight:700, fontSize:'0.85rem', fontFamily:'inherit', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', transition:'transform .1s' }}>
                    {idx+1}
                    {status==='marked_answered' && <span style={{ position:'absolute', bottom:-3, right:-3, width:10, height:10, background:'#16a34a', borderRadius:'50%', border:'1px solid #fff' }}/>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ padding:'14px', borderTop:'1px solid #e2e8f0', background:'#fff' }}>
            <button onClick={()=>{ updateStatus(currentIdx); setShowSubmitModal(true); }}
              style={{ width:'100%', padding:'11px', background:'linear-gradient(135deg,#2563eb,#4f46e5)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'1rem', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 3px 12px rgba(37,99,235,.3)' }}>
              Submit Exam
            </button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <SubmitModal stats={stats} submitting={submitting} onConfirm={handleSubmitFinal} onCancel={()=>setShowSubmitModal(false)}/>
      )}
    </div>
  );
}
