/**
 * PDFQuestionExtractor.jsx
 * Upload a PDF → extract text via pdfjs-dist → send to Groq AI → get MCQs
 * Same UX pattern as AIQuestionGenerator
 */
import React, { useState, useRef } from 'react';
import { FileText, X, Loader, AlertTriangle, CheckCircle2, RefreshCw, Upload, Sparkles, FileUp } from 'lucide-react';
import { extractQuestionsFromPdfText } from '../services/groqService';
import * as pdfjsLib from 'pdfjs-dist';

// Point the worker to the bundled worker (works with Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const COUNTS    = [5, 8, 10, 15, 20, 25, 30];
const LANGUAGES = ['English', 'Hindi'];

export default function PDFQuestionExtractor({ onInsert, onClose }) {
  const fileRef  = useRef();
  const [file,       setFile]       = useState(null);
  const [pdfText,    setPdfText]    = useState('');
  const [pageCount,  setPageCount]  = useState(0);
  const [extracting, setExtracting] = useState(false);  // PDF text extraction
  const [generating, setGenerating] = useState(false);  // Groq AI call
  const [error,      setError]      = useState('');
  const [questions,  setQuestions]  = useState([]);
  const [selected,   setSelected]   = useState(new Set());
  const [count,      setCount]      = useState(10);
  const [language,   setLanguage]   = useState('English');

  /* ── 1. Pick PDF file ── */
  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { setError('Please upload a PDF file.'); return; }
    if (f.size > 20 * 1024 * 1024) { setError('PDF must be under 20 MB.'); return; }

    setFile(f);
    setError('');
    setQuestions([]);
    setSelected(new Set());
    setPdfText('');
    setExtracting(true);

    try {
      const text = await extractTextFromPDF(f);
      if (!text.trim()) throw new Error('Could not read text from this PDF. It may be a scanned/image-based PDF.');
      setPdfText(text);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to read PDF.');
    }
    setExtracting(false);
  };

  /* ── 2. Extract text from PDF using pdfjs-dist ── */
  async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    setPageCount(pdf.numPages);

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    return fullText;
  }

  /* ── 3. Send to Groq AI ── */
  const handleExtract = async () => {
    if (!pdfText.trim()) { setError('Please upload a PDF first.'); return; }
    setGenerating(true);
    setError('');
    setQuestions([]);
    setSelected(new Set());
    try {
      const qs = await extractQuestionsFromPdfText(pdfText, count, language);
      if (!qs.length) throw new Error('AI could not extract questions. Try a different PDF.');
      setQuestions(qs);
      setSelected(new Set(qs.map((_, i) => i)));
    } catch (err) {
      setError(err.message || 'Extraction failed. Please try again.');
    }
    setGenerating(false);
  };

  /* ── Selection helpers ── */
  const toggle     = (i) => setSelected(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const selectAll  = () => setSelected(new Set(questions.map((_, i) => i)));
  const deselectAll= () => setSelected(new Set());

  const handleInsert = () => {
    const toInsert = questions.filter((_, i) => selected.has(i));
    if (!toInsert.length) { setError('Select at least one question.'); return; }
    onInsert(toInsert);
  };

  const isReady = !!pdfText && !extracting;
  const isLoading = extracting || generating;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.65)', backdropFilter:'blur(5px)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', padding:'1rem' }}>
      <div style={{ width:'min(580px, 100vw - 2rem)', maxHeight:'calc(100vh - 2rem)', background:'#fff', borderRadius:18, boxShadow:'0 24px 80px rgba(15,23,42,.28)', display:'flex', flexDirection:'column', animation:'slideUp .3s ease', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'1.25rem 1.5rem', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, background:'rgba(255,255,255,.2)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FileText size={22}/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:'1.05rem', fontFamily:'Space Grotesk' }}>PDF Question Extractor</div>
              <div style={{ fontSize:'0.75rem', opacity:.8 }}>Upload PDF → AI extracts MCQs automatically</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:8, padding:6, cursor:'pointer', color:'#fff', display:'flex' }}><X size={18}/></button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>

          {/* Step 1: Upload */}
          <div>
            <label style={{ fontSize:'0.8rem', fontWeight:700, display:'block', marginBottom:6, color:'var(--text-secondary)' }}>STEP 1 — Upload PDF</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? '#6366f1' : 'var(--border-medium)'}`,
                borderRadius:14, padding:'1.5rem', textAlign:'center', cursor:'pointer',
                background: file ? '#eef2ff' : 'var(--bg-tertiary)',
                transition:'all .2s'
              }}
            >
              {extracting ? (
                <><Loader size={28} style={{ animation:'spin 1s linear infinite', color:'#6366f1', margin:'0 auto 8px' }}/><div style={{ fontSize:'0.85rem', color:'#6366f1', fontWeight:600 }}>Reading PDF…</div></>
              ) : file ? (
                <>
                  <FileText size={28} style={{ color:'#6366f1', margin:'0 auto 8px' }} />
                  <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#1e293b' }}>{file.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>
                    {pageCount} pages · {(file.size / 1024).toFixed(0)} KB
                    {pdfText ? <span style={{ color:'#10b981', fontWeight:600 }}> · ✓ Text extracted</span> : ''}
                  </div>
                  <button onClick={(e)=>{e.stopPropagation();setFile(null);setPdfText('');setPageCount(0);setQuestions([]);setSelected(new Set());setError('');}}
                    style={{ marginTop:8, fontSize:'0.75rem', color:'var(--accent-rose)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <FileUp size={32} style={{ color:'var(--text-muted)', margin:'0 auto 10px' }}/>
                  <div style={{ fontWeight:600, fontSize:'0.9rem', color:'var(--text-secondary)' }}>Click to upload PDF</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>Max 20 MB · MCQ paper or study material</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/pdf" style={{ display:'none' }} onChange={handleFile}/>
          </div>

          {/* Step 2: Options */}
          {isReady && (
            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:700, display:'block', marginBottom:10, color:'var(--text-secondary)' }}>STEP 2 — Extraction Settings</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div>
                  <label className="input-label">Questions to extract</label>
                  <select className="input-field" value={count} onChange={e=>setCount(Number(e.target.value))}>
                    {COUNTS.map(c=><option key={c} value={c}>{c} Questions</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Language</label>
                  <div style={{ display:'flex', gap:6 }}>
                    {LANGUAGES.map(l=>(
                      <button key={l} type="button" onClick={()=>setLanguage(l)}
                        style={{ flex:1, padding:'8px 4px', borderRadius:8, border:'1.5px solid', cursor:'pointer', fontSize:'0.82rem', fontWeight:700, fontFamily:'inherit',
                          borderColor: language===l?'var(--accent-blue)':'var(--border-light)',
                          background:  language===l?'var(--accent-blue-light)':'#fff',
                          color:       language===l?'var(--accent-blue)':'var(--text-muted)',
                        }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PDF text preview */}
              <div style={{ marginTop:'0.75rem', padding:'0.75rem', background:'var(--bg-tertiary)', borderRadius:10, maxHeight:100, overflowY:'auto' }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>PDF TEXT PREVIEW ({pdfText.length.toLocaleString()} chars extracted)</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)', whiteSpace:'pre-wrap', lineHeight:1.5 }}>{pdfText.slice(0, 600)}{pdfText.length > 600 ? '…' : ''}</div>
              </div>
            </div>
          )}

          {/* Extract Button */}
          {isReady && (
            <button onClick={handleExtract} disabled={generating}
              style={{ width:'100%', padding:'0.8rem', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:'1rem', cursor:generating?'wait':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 15px rgba(99,102,241,.3)', opacity:generating?.7:1 }}>
              {generating
                ? <><Loader size={18} style={{ animation:'spin 1s linear infinite' }}/> AI is extracting questions…</>
                : <><Sparkles size={18}/> Extract Questions from PDF</>}
            </button>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding:'0.75rem 1rem', background:'#fff0f0', color:'#e11d48', borderRadius:10, fontSize:'0.875rem', display:'flex', gap:8, alignItems:'flex-start', border:'1px solid #fecdd3' }}>
              <AlertTriangle size={16} style={{ flexShrink:0, marginTop:2 }}/> {error}
            </div>
          )}

          {/* Step 3: Extracted Questions */}
          {questions.length > 0 && (
            <div style={{ borderTop:'1px solid var(--border-light)', paddingTop:'0.75rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                <div style={{ fontSize:'0.85rem', fontWeight:700, color:'#0ea5e9' }}>
                  <FileText size={14} style={{ display:'inline', marginRight:5 }}/> {questions.length} Questions Extracted
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>{setQuestions([]);setSelected(new Set());}} style={{ padding:'4px 10px', background:'transparent', border:'1px solid var(--border-light)', borderRadius:6, cursor:'pointer', fontSize:'0.75rem', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                    <RefreshCw size={12}/> Reset
                  </button>
                  <button onClick={selectAll}   style={{ padding:'4px 10px', background:'#dcfce7', color:'#15803d', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.75rem', fontWeight:600, fontFamily:'inherit' }}>Select All</button>
                  <button onClick={deselectAll} style={{ padding:'4px 10px', background:'var(--bg-tertiary)', color:'var(--text-secondary)', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.75rem', fontWeight:600, fontFamily:'inherit' }}>Deselect</button>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                {questions.map((q, i) => {
                  const isSel = selected.has(i);
                  return (
                    <div key={i} onClick={()=>toggle(i)}
                      style={{ padding:'0.875rem', borderRadius:12, border:`2px solid ${isSel?'#6366f1':'var(--border-light)'}`, background:isSel?'#eef2ff':'var(--bg-tertiary)', cursor:'pointer', transition:'all .15s' }}>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${isSel?'#6366f1':'var(--border-medium)'}`, background:isSel?'#6366f1':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                          {isSel && <CheckCircle2 size={14} color="#fff"/>}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:'0.5rem', color:'#1e293b' }}>Q{i+1}. {q.text}</div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px', marginBottom:'0.4rem' }}>
                            {q.options.map((opt, oi) => (
                              <div key={oi} style={{ fontSize:'0.78rem', color:opt===q.correctAnswer?'#059669':'var(--text-secondary)', fontWeight:opt===q.correctAnswer?700:400, display:'flex', alignItems:'center', gap:4 }}>
                                <span style={{ background:opt===q.correctAnswer?'#059669':'var(--border-medium)', width:16, height:16, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'0.65rem', fontWeight:800, flexShrink:0 }}>
                                  {String.fromCharCode(65+oi)}
                                </span>
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
          )}
        </div>

        {/* Footer */}
        {questions.length > 0 && (
          <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid var(--border-light)', background:'var(--bg-tertiary)', display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
            <span style={{ fontSize:'0.82rem', color:'var(--text-muted)', flex:1 }}>{selected.size} of {questions.length} questions selected</span>
            <button onClick={onClose} style={{ padding:'0.6rem 1rem', background:'transparent', border:'1px solid var(--border-medium)', borderRadius:10, cursor:'pointer', fontWeight:600, fontFamily:'inherit', fontSize:'0.85rem' }}>Cancel</button>
            <button onClick={handleInsert} disabled={selected.size===0}
              style={{ padding:'0.6rem 1.25rem', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', border:'none', borderRadius:10, cursor:selected.size===0?'not-allowed':'pointer', fontWeight:700, fontFamily:'inherit', fontSize:'0.85rem', opacity:selected.size===0?.5:1 }}>
              ✅ Add {selected.size} Question{selected.size!==1?'s':''} to Exam
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
