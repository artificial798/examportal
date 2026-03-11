/**
 * pdfService.js — Premium PDF Generation for ExamPortal
 * Uses jsPDF + jsPDF-AutoTable
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ══════════════════════════════════════════════
   PREMIUM COLOUR PALETTE
══════════════════════════════════════════════ */
const C = {
  primary:    [30, 58, 138],   // Deep blue
  secondary:  [59, 130, 246],  // Royal blue
  purple:     [109, 40, 217],  // Deep purple
  emerald:    [5, 150, 105],   // Dark emerald
  rose:       [225, 29, 72],   // Deep rose
  gold:       [217, 119, 6],   // Amber/Gold
  grayDark:   [51, 65, 85],    // Slate 700
  gray:       [100, 116, 139], // Slate 500
  grayLight:  [241, 245, 249], // Slate 100
  white:      [255, 255, 255],
  dark:       [15,  23,  42],  // Slate 900
};

/* ── HELPERS ── */
const today = () => new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });

/** Force-download blob as a proper .pdf file with the given filename */
function triggerDownload(pdf, filename) {
  const safeFilename = filename.endsWith('.pdf') ? filename : filename + '.pdf';
  const blob = pdf.output('blob');
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Formal School Header */
function addFormalHeader(pdf, title, schoolName, subtitle = '') {
  const W = pdf.internal.pageSize.getWidth();
  const sName = schoolName || 'EXAMPORTAL INSTITUTION';
  
  // Header Background Line
  pdf.setFillColor(...C.primary);
  pdf.rect(0, 0, W, 6, 'F');
  
  // School Logo (Placeholder Circle)
  pdf.setLineWidth(1);
  pdf.setDrawColor(...C.primary);
  pdf.setFillColor(...C.white);
  pdf.circle(24, 24, 12, 'FD');
  pdf.setTextColor(...C.primary);
  pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
  pdf.text(sName.substring(0,2).toUpperCase(), 24, 26, { align:'center' });

  // School Name
  pdf.setTextColor(...C.primary);
  pdf.setFontSize(22); pdf.setFont('helvetica', 'bold');
  pdf.text(sName.toUpperCase(), 42, 22);
  
  // Subtitle/Address (stub)
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  pdf.text('Affiliated to Central Board of Education  |  School Code: 45012', 42, 28);

  // Line Separator
  pdf.setDrawColor(...C.grayLight);
  pdf.setLineWidth(0.5);
  pdf.line(14, 38, W - 14, 38);

  // Document Title
  pdf.setFillColor(...C.grayLight);
  pdf.rect(0, 42, W, 12, 'F');
  pdf.setTextColor(...C.dark);
  pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
  pdf.text(title.toUpperCase(), W/2, 50, { align:'center', charSpace: 1 });
  
  if (subtitle) {
    pdf.setFontSize(10); pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...C.grayDark);
    pdf.text(subtitle, W/2, 58, { align:'center' });
    return 66; // cursor Y
  }
  return 58; // cursor Y
}

/** Footer */
function addFooter(pdf) {
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(...C.grayLight);
  pdf.setLineWidth(0.5);
  pdf.line(14, H - 16, W - 14, H - 16);
  
  pdf.setFontSize(8); pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(...C.gray);
  pdf.text(`Generated on ${today()}`, 14, H - 10);
  pdf.text('This is a computer generated document. No signature is required.', W/2, H - 10, { align:'center' });
  pdf.text(`Page ${pdf.getCurrentPageInfo().pageNumber}`, W - 14, H - 10, { align:'right' });
}

/* ══════════════════════════════════════════════
   1. INDIVIDUAL DETAILED RESULT PDF (REPORT CARD)
══════════════════════════════════════════════ */
export function downloadDetailedResult(result, schoolName = '') {
  const pdf = new jsPDF({ unit:'mm', format:'a4' });
  const W   = pdf.internal.pageSize.getWidth();
  let   y   = addFormalHeader(pdf, 'Academic Result Report', schoolName, `${result.examTitle || 'Term Exam'} — ${result.subject || 'General Subject'}`);

  // Student Details Grid
  pdf.setDrawColor(...C.primary);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(14, y, W - 28, 30, 2, 2, 'D');
  
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.primary);
  pdf.text('STUDENT PROFILE', 18, y + 6);
  pdf.setDrawColor(...C.grayLight);
  pdf.line(14, y + 8, W - 14, y + 8);
  
  pdf.setTextColor(...C.dark);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
  pdf.text('Student Name:', 18, y + 15);
  pdf.setFont('helvetica', 'normal'); pdf.text(result.studentName || '—', 48, y + 15);
  
  pdf.setFont('helvetica', 'bold'); pdf.text('Roll No:', 18, y + 21);
  pdf.setFont('helvetica', 'normal'); pdf.text(String(result.rollNo || '—'), 48, y + 21);
  
  pdf.setFont('helvetica', 'bold'); pdf.text('Class/Grade:', 18, y + 27);
  pdf.setFont('helvetica', 'normal'); pdf.text(result.class || '—', 48, y + 27);

  // Date of exam
  const examDate = result.submittedAt?.toDate ? result.submittedAt.toDate().toLocaleDateString('en-IN') : today();
  pdf.setFont('helvetica', 'bold'); pdf.text('Date of Exam:', W/2 + 20, y + 15);
  pdf.setFont('helvetica', 'normal'); pdf.text(examDate, W/2 + 50, y + 15);

  y += 36;

  // Score Highlight Box
  const pct    = result.percentage || 0;
  const pass   = pct >= (result.passingMarks || 40);
  const grColor= pass ? C.emerald : C.rose;
  
  pdf.setFillColor(...C.grayLight);
  pdf.roundedRect(14, y, W - 28, 26, 2, 2, 'F');
  
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.grayDark);
  pdf.text('MARKS OBTAINED', 24, y + 11);
  pdf.setFontSize(22); pdf.setTextColor(...C.primary);
  pdf.text(`${result.score || 0}`, 24, y + 20);
  pdf.setFontSize(12); pdf.setTextColor(...C.grayDark);
  pdf.text(` / ${result.totalMarks || 0}`, 34 + String(result.score||0).length*4, y + 20);

  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.grayDark);
  pdf.text('PERCENTAGE', W/2 - 20, y + 11);
  pdf.setFontSize(22); pdf.setTextColor(...C.primary);
  pdf.text(`${pct}%`, W/2 - 20, y + 20);

  // Grade / Pass Fail Badge
  pdf.setFillColor(...grColor);
  pdf.roundedRect(W - 48, y + 4, 30, 18, 2, 2, 'F');
  pdf.setTextColor(...C.white);
  pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
  pdf.text(pass ? 'PASS' : 'FAIL', W - 33, y + 14.5, { align:'center' });

  y += 32;

  // Stats row
  const stats = [
    { label:'Questions', val: result.totalQuestions || 0 },
    { label:'Attempted', val: result.attempted || 0 },
    { label:'Correct (✓)', val: result.correct || 0, c: C.emerald },
    { label:'Incorrect (✗)', val: result.incorrect || 0, c: C.rose },
  ];
  const bw = (W - 28) / 4;
  stats.forEach((s,i) => {
    const bx = 14 + i*bw;
    pdf.setDrawColor(...C.grayLight);
    pdf.setFillColor(...C.white);
    pdf.rect(bx, y, bw, 14, 'FD');
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...C.gray);
    pdf.text(s.label, bx + bw/2, y + 6, { align:'center' });
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...(s.c || C.dark));
    pdf.text(String(s.val), bx + bw/2, y + 11.5, { align:'center' });
  });

  y += 20;

  // Questions table
  pdf.setFontSize(12); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.primary);
  pdf.text('Detailed Question Breakdown', 14, y);
  y += 4;

  const rows = (result.answerSheet || []).map((a, i) => [
    i + 1,
    a.questionText || '',
    a.selectedOption || '(Not attempted)',
    a.correctAnswer || '',
    a.isCorrect ? '✓ Correct' : (a.selectedOption ? '✗ Wrong' : '— Skipped'),
  ]);

  autoTable(pdf, {
    startY: y,
    head: [['#', 'Question', 'Student Answer', 'Correct Answer', 'Result']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: C.dark },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 68 },
      2: { cellWidth: 38 },
      3: { cellWidth: 38 },
      4: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 4 && data.section === 'body') {
        const v = String(data.cell.raw || '');
        data.cell.styles.textColor = v.startsWith('✓') ? C.emerald : v.startsWith('✗') ? C.rose : C.gray;
      }
    },
    margin: { left: 14, right: 14 },
    showHead: 'firstPage',
  });

  // Final Signatures
  const finalY = pdf.lastAutoTable.finalY + 25;
  if (finalY < W - 40) {
    pdf.setDrawColor(...C.dark);
    pdf.setLineWidth(0.5);
    pdf.line(24, finalY, 74, finalY);
    pdf.line(W - 74, finalY, W - 24, finalY);
    
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...C.dark);
    pdf.text('Class Teacher Signature', 49, finalY + 5, { align:'center' });
    pdf.text('Principal Signature', W - 49, finalY + 5, { align:'center' });
  }

  addFooter(pdf);
  triggerDownload(pdf, `ReportCard_${(result.studentName||'Student').replace(/\s+/g,'_')}_${(result.examTitle||'Exam').replace(/\s+/g,'_')}.pdf`);
}

/* ══════════════════════════════════════════════
   2. CLASS MARKSHEET PDF
══════════════════════════════════════════════ */
export function downloadClassMarksheet(results, filterClass = '', filterSubject = '', schoolName = '') {
  const filtered = results.filter(r =>
    (!filterClass   || (r.class   || '').toLowerCase() === filterClass.toLowerCase())   &&
    (!filterSubject || (r.subject || '').toLowerCase() === filterSubject.toLowerCase())
  );

  const pdf = new jsPDF({ unit:'mm', format:'a4', orientation:'landscape' });
  const W   = pdf.internal.pageSize.getWidth();
  let   y   = addFormalHeader(
    pdf,
    `${filterClass ? `Class ${filterClass} — ` : ''}Master Marksheet`,
    schoolName,
    `${filterSubject ? 'Subject: ' + filterSubject : 'All Subjects'}  |  Total Students: ${filtered.length}`
  );

  y -= 4; // adjust spacing

  // Summary Card
  const avg    = filtered.length ? Math.round(filtered.reduce((s,r)=>s+(r.percentage||0),0)/filtered.length) : 0;
  const passed = filtered.filter(r=>(r.percentage||0)>=40).length;
  const sumStats = [
    { label:'Enrolled',   val: filtered.length,           color: C.primary   },
    { label:'Passed',     val: passed,                    color: C.emerald   },
    { label:'Failed',     val: filtered.length - passed,  color: C.rose      },
    { label:'Avg Score',  val: `${avg}%`,                 color: C.purple    },
    { label:'Pass %',     val: `${filtered.length ? Math.round(passed/filtered.length*100) : 0}%`, color: C.gold },
  ];
  const bW = (W - 28) / sumStats.length;
  sumStats.forEach((s, i) => {
    const bx = 14 + i * bW;
    pdf.setFillColor(...C.white);
    pdf.setDrawColor(...s.color);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(bx, y, bW - 2, 18, 2, 2, 'FD');
    pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...s.color);
    pdf.text(String(s.val), bx + (bW-2)/2, y + 11, { align:'center' });
    pdf.setFontSize(8);  pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...C.grayDark);
    pdf.text(s.label, bx + (bW-2)/2, y + 16, { align:'center' });
  });
  y += 24;

  const sorted = [...filtered].sort((a, b) => (b.percentage||0) - (a.percentage||0));
  const getGrade = (p) => p>=90?'A+':p>=80?'A':p>=70?'B+':p>=60?'B':p>=50?'C':p>=40?'D':'F';

  const rows = sorted.map((r, i) => [
    i + 1,
    r.studentName || '—',
    r.rollNo      || '—',
    r.class       || '—',
    r.examTitle   || '—',
    r.subject     || '—',
    `${r.score || 0}/${r.totalMarks || 0}`,
    `${r.percentage || 0}%`,
    getGrade(r.percentage || 0),
    (r.percentage || 0) >= 40 ? 'PASS' : 'FAIL',
  ]);

  autoTable(pdf, {
    startY: y,
    head: [['Rnk', 'Student Name', 'Roll No', 'Class', 'Exam', 'Subject', 'Score', '%', 'Grade', 'Result']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle:'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: C.dark },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0:  { cellWidth: 12, halign:'center' },
      1:  { cellWidth: 46 },
      2:  { cellWidth: 20, halign:'center' },
      3:  { cellWidth: 20, halign:'center' },
      4:  { cellWidth: 50 },
      5:  { cellWidth: 35 },
      6:  { cellWidth: 24, halign:'center', fontStyle:'bold' },
      7:  { cellWidth: 24, halign:'center', fontStyle:'bold' },
      8:  { cellWidth: 18, halign:'center', fontStyle:'bold' },
      9:  { cellWidth: 20, halign:'center', fontStyle:'bold' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      if (data.column.index === 9) {
        data.cell.styles.textColor = data.cell.raw === 'PASS' ? C.emerald : C.rose;
      }
      if (data.column.index === 8) {
        const g = data.cell.raw;
        data.cell.styles.textColor = ['A+','A'].includes(g) ? C.emerald : g === 'F' ? C.rose : C.primary;
      }
    },
    margin: { left: 14, right: 14 },
  });

  addFooter(pdf);
  triggerDownload(pdf, `Marksheet_${filterClass||'All'}_${filterSubject||'AllSubjects'}_${new Date().toISOString().slice(0,10)}.pdf`);
}

/* ══════════════════════════════════════════════
   3. SUBJECT PERFORMANCE REPORT PDF
══════════════════════════════════════════════ */
export function downloadSubjectReport(results, schoolName = '') {
  const bySubject = {};
  results.forEach(r => {
    const sub = r.subject || 'Unknown';
    if (!bySubject[sub]) bySubject[sub] = [];
    bySubject[sub].push(r);
  });

  const pdf = new jsPDF({ unit:'mm', format:'a4' });
  const W   = pdf.internal.pageSize.getWidth();
  let   y   = addFormalHeader(pdf, 'Subject-wise Performance Record', schoolName, `${results.length} total submissions across ${Object.keys(bySubject).length} subjects`);

  Object.entries(bySubject).forEach(([subject, recs]) => {
    if (y > 240) { pdf.addPage(); addFooter(pdf); y = addFormalHeader(pdf, 'Subject-wise Performance Record (contd.)', schoolName); }

    const avg    = Math.round(recs.reduce((s,r)=>s+(r.percentage||0),0)/recs.length);
    const passed = recs.filter(r=>(r.percentage||0)>=40).length;
    const top    = [...recs].sort((a,b)=>(b.percentage||0)-(a.percentage||0))[0];

    // Subject Banner
    pdf.setFillColor(...C.grayLight);
    pdf.setDrawColor(...C.primary);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(14, y, W - 28, 12, 1, 1, 'FD');
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...C.primary);
    pdf.text(subject.toUpperCase(), 18, y + 8);
    
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...C.dark);
    pdf.text(`Submissions: ${recs.length}   |   Avg: ${avg}%   |   Pass: ${Math.round(passed/recs.length*100)}%   |   Topper: ${top?.studentName||'—'} (${top?.percentage||0}%)`, W - 18, y + 8, { align:'right' });
    y += 16;

    const rows = [...recs]
      .sort((a,b)=>(b.percentage||0)-(a.percentage||0))
      .map((r, i) => [
        i+1,
        r.studentName || '—',
        r.rollNo      || '—',
        r.class       || '—',
        `${r.score||0}/${r.totalMarks||0}`,
        `${r.percentage||0}%`,
        (r.percentage||0)>=40 ? 'PASS' : 'FAIL',
        r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleDateString('en-IN') : '—',
      ]);

    autoTable(pdf, {
      startY: y,
      head: [['Rnk', 'Student', 'Roll No', 'Class', 'Score', '%', 'Result', 'Date']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: C.grayDark, textColor: C.white, fontStyle:'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: C.dark },
      columnStyles: {
        0: { cellWidth: 10, halign:'center' },
        1: { cellWidth: 56 },
        2: { cellWidth: 18, halign:'center' },
        3: { cellWidth: 18, halign:'center' },
        4: { cellWidth: 20, halign:'center', fontStyle:'bold' },
        5: { cellWidth: 16, halign:'center', fontStyle:'bold' },
        6: { cellWidth: 18, halign:'center', fontStyle:'bold' },
        7: { cellWidth: 26 },
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        if (data.column.index === 6) {
          data.cell.styles.textColor = data.cell.raw === 'PASS' ? C.emerald : C.rose;
        }
      },
      margin: { left: 14, right: 14 },
    });

    y = pdf.lastAutoTable.finalY + 8;
  });

  addFooter(pdf);
  triggerDownload(pdf, `SubjectReport_${(schoolName||'School').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`);
}
