import React, { useState } from 'react';
import { Sparkles, X, Loader, AlertTriangle, CheckCircle2, ChevronDown, RefreshCw } from 'lucide-react';
import { generateQuestions } from '../services/groqService';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const SUBJECTS = ['Mathematics','Science','English','Hindi','Social Studies','Computer Science','Physics','Chemistry','Biology','History','Geography','Economics','General Knowledge'];
const LANGUAGES = ['English', 'Hindi'];
const COUNTS = [3, 5, 8, 10, 15, 20];

/**
 * Reusable AI Question Generator Panel
 * Props:
 *   onInsert(questions) — called when user clicks "Add to Exam"
 *   defaultSubject — pre-fill topic from exam's subject
 *   onClose — called to close the panel
 */
export default function AIQuestionGenerator({ onInsert, defaultSubject = '', onClose }) {
  const [topic,      setTopic]      = useState(defaultSubject);
  const [difficulty, setDifficulty] = useState('Medium');
  const [count,      setCount]      = useState(5);
  const [className,  setClassName]  = useState('');
  const [language,   setLanguage]   = useState('English');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [questions,  setQuestions]  = useState([]);
  const [selected,   setSelected]   = useState(new Set());

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Please enter a topic to generate questions.'); return; }
    setLoading(true);
    setError('');
    setQuestions([]);
    setSelected(new Set());
    try {
      const qs = await generateQuestions({ topic: topic.trim(), difficulty, count, className, language });
      setQuestions(qs);
      setSelected(new Set(qs.map((_, i) => i))); // select all by default
    } catch (err) {
      setError(err.message || 'AI generation failed. Please try again.');
    }
    setLoading(false);
  };

  const toggleSelect = (i) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const selectAll   = () => setSelected(new Set(questions.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());

  const handleInsert = () => {
    const toInsert = questions.filter((_, i) => selected.has(i));
    if (toInsert.length === 0) { setError('Select at least one question.'); return; }
    onInsert(toInsert);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(4px)', zIndex:9998, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', padding:'1rem' }}>
      <div style={{ width:'min(560px, 100vw - 2rem)', maxHeight:'calc(100vh - 2rem)', background:'#fff', borderRadius:18, boxShadow:'0 24px 80px rgba(15,23,42,.25)', display:'flex', flexDirection:'column', animation:'slideUp .3s ease', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'1.25rem 1.5rem', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, background:'rgba(255,255,255,.2)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Sparkles size={22}/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:'1.05rem', fontFamily:'Space Grotesk' }}>AI Question Generator</div>
              <div style={{ fontSize:'0.75rem', opacity:.8 }}>Powered by Groq · Llama 3.3 70B</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:8, padding:6, cursor:'pointer', color:'#fff', display:'flex' }}><X size={18}/></button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:'auto', padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>

          {/* Config Form */}
          <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
            <div>
              <label className="input-label">Topic / Subject *</label>
              <input className="input-field" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Photosynthesis, Quadratic Equations, World War II…" onKeyDown={e=>e.key==='Enter'&&handleGenerate()}/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              <div>
                <label className="input-label">Difficulty</label>
                <div style={{ display:'flex', gap:6 }}>
                  {DIFFICULTIES.map(d => (
                    <button key={d} type="button" onClick={()=>setDifficulty(d)}
                      style={{ flex:1, padding:'6px 4px', borderRadius:8, border:'1.5px solid', cursor:'pointer', fontSize:'0.78rem', fontWeight:700, fontFamily:'inherit',
                        borderColor: difficulty===d ? (d==='Easy'?'var(--accent-emerald)':d==='Hard'?'var(--accent-rose)':'var(--accent-amber)') : 'var(--border-light)',
                        background:  difficulty===d ? (d==='Easy'?'var(--accent-emerald-light)':d==='Hard'?'var(--accent-rose-light)':'var(--accent-amber-light)') : '#fff',
                        color:       difficulty===d ? (d==='Easy'?'var(--accent-emerald)':d==='Hard'?'var(--accent-rose)':'var(--accent-amber)') : 'var(--text-muted)',
                      }}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label">No. of Questions</label>
                <select className="input-field" value={count} onChange={e=>setCount(Number(e.target.value))}>
                  {COUNTS.map(c=><option key={c} value={c}>{c} Questions</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              <div>
                <label className="input-label">Class / Grade (optional)</label>
                <input className="input-field" value={className} onChange={e=>setClassName(e.target.value)} placeholder="e.g. Class 10, Grade 8"/>
              </div>
              <div>
                <label className="input-label">Language</label>
                <div style={{ display:'flex', gap:6 }}>
                  {LANGUAGES.map(l=>(
                    <button key={l} type="button" onClick={()=>setLanguage(l)}
                      style={{ flex:1, padding:'6px 4px', borderRadius:8, border:'1.5px solid', cursor:'pointer', fontSize:'0.82rem', fontWeight:700, fontFamily:'inherit',
                        borderColor: language===l?'var(--accent-blue)':'var(--border-light)',
                        background:  language===l?'var(--accent-blue-light)':'#fff',
                        color:       language===l?'var(--accent-blue)':'var(--text-muted)',
                      }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button onClick={handleGenerate} disabled={loading}
            style={{ width:'100%', padding:'0.75rem', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:'1rem', cursor: loading?'wait':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 15px rgba(79,70,229,.3)', opacity:loading?.7:1 }}>
            {loading ? <><Loader size={18} style={{ animation:'spin 1s linear infinite' }}/> Generating with AI…</> : <><Sparkles size={18}/> Generate Questions</>}
          </button>

          {/* Error */}
          {error && (
            <div style={{ padding:'0.75rem 1rem', background:'var(--accent-rose-light)', color:'var(--accent-rose)', borderRadius:10, fontSize:'0.875rem', display:'flex', gap:8, alignItems:'flex-start' }}>
              <AlertTriangle size={16} style={{ flexShrink:0, marginTop:2 }}/> {error}
            </div>
          )}

          {/* Generated Questions */}
          {questions.length > 0 && (
            <>
              {/* Divider + Controls */}
              <div style={{ borderTop:'1px solid var(--border-light)', paddingTop:'0.75rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                  <div style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--accent-purple)' }}>
                    <Sparkles size={14} style={{ display:'inline', marginRight:5 }}/> {questions.length} Questions Generated
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>{ setQuestions([]); setSelected(new Set()); }} style={{ padding:'4px 10px', background:'transparent', border:'1px solid var(--border-light)', borderRadius:6, cursor:'pointer', fontSize:'0.75rem', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                      <RefreshCw size={12}/> Reset
                    </button>
                    <button onClick={selectAll}    style={{ padding:'4px 10px', background:'var(--accent-emerald-light)', color:'var(--accent-emerald)', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.75rem', fontWeight:600, fontFamily:'inherit' }}>Select All</button>
                    <button onClick={deselectAll}  style={{ padding:'4px 10px', background:'var(--bg-tertiary)', color:'var(--text-secondary)', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.75rem', fontWeight:600, fontFamily:'inherit' }}>Deselect</button>
                  </div>
                </div>

                {/* Question cards */}
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {questions.map((q, i) => {
                    const isSelected = selected.has(i);
                    return (
                      <div key={i} onClick={()=>toggleSelect(i)}
                        style={{ padding:'0.875rem', borderRadius:12, border:`2px solid ${isSelected?'var(--accent-purple)':'var(--border-light)'}`, background: isSelected?'var(--accent-purple-light)':'var(--bg-tertiary)', cursor:'pointer', transition:'all .15s' }}>
                        <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                          <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${isSelected?'var(--accent-purple)':'var(--border-medium)'}`, background: isSelected?'var(--accent-purple)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                            {isSelected && <CheckCircle2 size={14} color="#fff"/>}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:'0.5rem', color:'var(--text-primary)' }}>
                              Q{i+1}. {q.text}
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px', marginBottom:'0.4rem' }}>
                              {q.options.map((opt, oi) => (
                                <div key={oi} style={{ fontSize:'0.78rem', color: opt===q.correctAnswer?'var(--accent-emerald)':'var(--text-secondary)', fontWeight: opt===q.correctAnswer?700:400, display:'flex', alignItems:'center', gap:4 }}>
                                  <span style={{ background: opt===q.correctAnswer?'var(--accent-emerald)':'var(--border-medium)', width:16, height:16, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'0.65rem', fontWeight:800, flexShrink:0 }}>{String.fromCharCode(65+oi)}</span>
                                  {opt}
                                </div>
                              ))}
                            </div>
                            {q.explanation && (
                              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontStyle:'italic', borderLeft:'2px solid var(--border-medium)', paddingLeft:8, marginTop:4 }}>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer — Add to Exam */}
        {questions.length > 0 && (
          <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid var(--border-light)', background:'var(--bg-tertiary)', display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
            <span style={{ fontSize:'0.82rem', color:'var(--text-muted)', flex:1 }}>{selected.size} of {questions.length} questions selected</span>
            <button onClick={onClose} style={{ padding:'0.6rem 1rem', background:'transparent', border:'1px solid var(--border-medium)', borderRadius:10, cursor:'pointer', fontWeight:600, fontFamily:'inherit', fontSize:'0.85rem' }}>Cancel</button>
            <button onClick={handleInsert} disabled={selected.size===0}
              style={{ padding:'0.6rem 1.25rem', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:10, cursor: selected.size===0?'not-allowed':'pointer', fontWeight:700, fontFamily:'inherit', fontSize:'0.85rem', opacity: selected.size===0?.5:1 }}>
              ✅ Add {selected.size} Question{selected.size!==1?'s':''} to Exam
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
