/**
 * pdfService.js — Ultra-Premium PDF Generation for ExamPortal
 * Uses jsPDF + jsPDF-AutoTable
 * Supports school logo, full profile letterhead, and professional report cards
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
  grayMid:    [226, 232, 240], // Slate 200
  white:      [255, 255, 255],
  dark:       [15, 23, 42],    // Slate 900
  accent:     [99, 102, 241],  // Indigo
};

/* ── HELPERS ── */
const today = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

const getGrade = (p) =>
  p >= 90 ? { g: 'A+', c: C.emerald } :
  p >= 80 ? { g: 'A',  c: C.emerald } :
  p >= 70 ? { g: 'B+', c: C.secondary } :
  p >= 60 ? { g: 'B',  c: C.secondary } :
  p >= 50 ? { g: 'C',  c: C.gold } :
  p >= 40 ? { g: 'D',  c: C.gold } :
            { g: 'F',  c: C.rose };

/** Force-download blob as a proper .pdf file */
function triggerDownload(pdf, filename) {
  const safeFilename = filename.endsWith('.pdf') ? filename : filename + '.pdf';
  const blob = pdf.output('blob');
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = safeFilename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ══════════════════════════════════════════════
   PROFESSIONAL LETTERHEAD HEADER
   schoolProfile = { logoBase64, address, phone, board, schoolCode, principal, tagline }
══════════════════════════════════════════════ */
function addFormalHeader(pdf, title, schoolName, subtitle = '', schoolProfile = {}) {
  const W = pdf.internal.pageSize.getWidth();
  const sName = schoolName || 'EXAMPORTAL INSTITUTION';

  // ── Top gradient bar (triple stripe) ──
  pdf.setFillColor(...C.primary);
  pdf.rect(0, 0, W, 3.5, 'F');
  pdf.setFillColor(...C.secondary);
  pdf.rect(0, 3.5, W, 1.5, 'F');
  pdf.setFillColor(...C.gold);
  pdf.rect(0, 5, W, 1, 'F');

  // ── Logo / Badge ──
  const logoX = 12, logoY = 10, logoSize = 22;

  if (schoolProfile.logoBase64) {
    try {
      pdf.addImage(schoolProfile.logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch {
      drawInitialsBadge(pdf, sName, logoX, logoY, logoSize);
    }
  } else {
    drawInitialsBadge(pdf, sName, logoX, logoY, logoSize);
  }

  // ── School Name & Info ──
  const textX = logoX + logoSize + 6;
  pdf.setTextColor(...C.primary);
  pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
  pdf.text(sName.toUpperCase(), textX, 17);

  // Address / affiliation line
  const subLine = [
    schoolProfile.board   || 'Affiliated to Board of Education',
    schoolProfile.schoolCode ? `School Code: ${schoolProfile.schoolCode}` : null,
    schoolProfile.phone   || null,
  ].filter(Boolean).join('  |  ');
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
  pdf.text(subLine, textX, 22);

  // Address second line
  if (schoolProfile.address) {
    pdf.setFontSize(8);
    pdf.text(`📍 ${schoolProfile.address}`, textX, 27);
  }

  // Principal
  if (schoolProfile.principal) {
    pdf.setFontSize(7.5); pdf.setTextColor(...C.grayDark);
    pdf.text(`Principal: ${schoolProfile.principal}`, textX, 31.5);
  }

  // ── Horizontal rule ──
  pdf.setDrawColor(...C.grayMid);
  pdf.setLineWidth(0.6);
  pdf.line(12, 36, W - 12, 36);

  // ── Document Title Band ──
  pdf.setFillColor(...C.primary);
  pdf.rect(0, 39, W, 12, 'F');

  // Decorative right accent
  pdf.setFillColor(...C.gold);
  pdf.rect(W - 30, 39, 30, 12, 'F');

  pdf.setTextColor(...C.white);
  pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
  pdf.text(title.toUpperCase(), W / 2, 47, { align: 'center', charSpace: 1 });

  let cursorY = 55;

  if (subtitle) {
    pdf.setFillColor(...C.grayLight);
    pdf.rect(0, 53, W, 9, 'F');
    pdf.setTextColor(...C.grayDark);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'italic');
    pdf.text(subtitle, W / 2, 59, { align: 'center' });
    cursorY = 65;
  }

  return cursorY;
}

function drawInitialsBadge(pdf, name, x, y, size) {
  pdf.setFillColor(...C.primary);
  pdf.roundedRect(x, y, size, size, 3, 3, 'F');
  pdf.setTextColor(...C.white);
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  pdf.text(initials, x + size / 2, y + size / 2 + 3.5, { align: 'center' });
}

/** Multi-page footer */
function addFooter(pdf, schoolProfile = {}) {
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  pdf.setFillColor(...C.grayLight);
  pdf.rect(0, H - 14, W, 14, 'F');
  pdf.setFillColor(...C.primary);
  pdf.rect(0, H - 14, W, 1.5, 'F');

  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(...C.gray);
  pdf.text(`Generated on ${today()}`, 14, H - 6);
  pdf.text('This is a computer generated document. No signature required.', W / 2, H - 6, { align: 'center' });
  pdf.text(`Page ${pdf.getCurrentPageInfo().pageNumber}`, W - 14, H - 6, { align: 'right' });
}

/* ══════════════════════════════════════════════
   1. INDIVIDUAL DETAILED RESULT PDF (REPORT CARD)
══════════════════════════════════════════════ */
export function downloadDetailedResult(result, schoolName = '', schoolProfile = {}) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W   = pdf.internal.pageSize.getWidth();
  let   y   = addFormalHeader(
    pdf, 'Academic Result Report Card', schoolName,
    `${result.examTitle || 'Term Exam'}  ·  ${result.subject || 'General'}  ·  Date: ${result.submittedAt?.toDate ? result.submittedAt.toDate().toLocaleDateString('en-IN') : today()}`,
    schoolProfile
  );

  // ── Student Profile Box ──
  pdf.setFillColor(...C.grayLight);
  pdf.roundedRect(12, y, W - 24, 32, 3, 3, 'F');
  pdf.setDrawColor(...C.primary);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(12, y, W - 24, 32, 3, 3, 'D');

  // Left accent bar
  pdf.setFillColor(...C.primary);
  pdf.roundedRect(12, y, 4, 32, 2, 2, 'F');

  pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.primary);
  pdf.text('STUDENT PROFILE', 20, y + 7);

  const half = (W - 24) / 2;
  const fields = [
    ['Student Name', result.studentName || '—'],
    ['Roll Number',  String(result.rollNo || '—')],
    ['Class / Grade', result.class || '—'],
    ['Exam Title',   result.examTitle || '—'],
  ];
  fields.forEach((f, i) => {
    const col = i < 2 ? 18 : 18 + half;
    const row = i < 2 ? y + 14 + (i * 8) : y + 14 + ((i - 2) * 8);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.grayDark); pdf.setFontSize(8);
    pdf.text(f[0] + ':', col, row);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.dark);
    pdf.text(f[1], col + 28, row);
  });

  y += 38;

  // ── Score Highlight Row ──
  const pct   = result.percentage || 0;
  const pass  = pct >= (result.passingMarks || 40);
  const { g: grade, c: grColor } = getGrade(pct);

  // Score box
  pdf.setFillColor(...C.primary);
  pdf.roundedRect(12, y, 55, 30, 3, 3, 'F');
  pdf.setTextColor(...C.white);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
  pdf.text('MARKS OBTAINED', 39.5, y + 7, { align: 'center' });
  pdf.setFontSize(22); pdf.setFont('helvetica', 'bold');
  pdf.text(`${result.score || 0}`, 28, y + 22);
  pdf.setFontSize(12); pdf.setFont('helvetica', 'normal');
  pdf.text(`/ ${result.totalMarks || 0}`, 38, y + 22);

  // Percentage box
  pdf.setFillColor(...C.grayLight);
  pdf.setDrawColor(...C.grayMid);
  pdf.roundedRect(70, y, 50, 30, 3, 3, 'FD');
  pdf.setTextColor(...C.grayDark);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
  pdf.text('PERCENTAGE', 95, y + 7, { align: 'center' });
  pdf.setFontSize(22); pdf.setTextColor(...C.primary);
  pdf.text(`${pct}%`, 95, y + 22, { align: 'center' });

  // Grade box
  pdf.setFillColor(...grColor);
  pdf.roundedRect(124, y, 30, 30, 3, 3, 'F');
  pdf.setTextColor(...C.white);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
  pdf.text('GRADE', 139, y + 7, { align: 'center' });
  pdf.setFontSize(22);
  pdf.text(grade, 139, y + 22, { align: 'center' });

  // Pass/Fail badge
  const pColor = pass ? C.emerald : C.rose;
  pdf.setFillColor(...pColor);
  pdf.roundedRect(158, y, 35, 30, 3, 3, 'F');
  pdf.setTextColor(...C.white);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
  pdf.text('RESULT', 175.5, y + 7, { align: 'center' });
  pdf.setFontSize(18);
  pdf.text(pass ? 'PASS' : 'FAIL', 175.5, y + 22, { align: 'center' });

  y += 36;

  // ── Progress bar ──
  pdf.setFillColor(...C.grayMid);
  pdf.roundedRect(12, y, W - 24, 7, 3, 3, 'F');
  const barW = Math.min(100, pct) / 100 * (W - 24);
  pdf.setFillColor(...(pass ? C.emerald : C.rose));
  pdf.roundedRect(12, y, barW, 7, 3, 3, 'F');
  pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.white);
  if (barW > 20) pdf.text(`${pct}%`, 12 + barW / 2, y + 5, { align: 'center' });
  y += 13;

  // ── Stats row ──
  const stats = [
    { label: 'Total Questions', val: result.totalQuestions || 0, c: C.primary },
    { label: 'Attempted',       val: result.attempted || result.totalQuestions || 0, c: C.grayDark },
    { label: '✓ Correct',       val: result.correct || 0, c: C.emerald },
    { label: '✗ Incorrect',     val: result.incorrect || 0, c: C.rose },
    { label: 'Skipped',         val: (result.totalQuestions || 0) - (result.attempted || result.totalQuestions || 0), c: C.gold },
  ];
  const bW = (W - 24) / stats.length;
  stats.forEach((s, i) => {
    const bx = 12 + i * bW;
    pdf.setFillColor(...C.white);
    pdf.setDrawColor(...C.grayMid);
    pdf.setLineWidth(0.4);
    pdf.rect(bx, y, bW, 14, 'FD');
    pdf.setFillColor(...s.c);
    pdf.rect(bx, y, bW, 3, 'F');
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...C.grayDark);
    pdf.text(s.label, bx + bW / 2, y + 8, { align: 'center' });
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...s.c);
    pdf.text(String(s.val), bx + bW / 2, y + 13, { align: 'center' });
  });
  y += 20;

  // ── Question Breakdown Table ──
  pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.primary);
  pdf.text('Detailed Question Breakdown', 12, y);
  y += 4;

  const rows = (result.answerSheet || []).map((a, i) => [
    i + 1,
    a.questionText || '',
    `${a.marks || 1} M`,
    a.selectedOption || '(Not attempted)',
    a.correctAnswer  || '',
    a.isCorrect ? '✓ Correct' : (a.selectedOption ? '✗ Wrong' : '— Skipped'),
  ]);

  autoTable(pdf, {
    startY: y,
    head: [['#', 'Question', 'Marks', 'Your Answer', 'Correct Answer', 'Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 8.5,
      halign: 'center',
    },
    bodyStyles: { fontSize: 8, textColor: C.dark },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 9,  halign: 'center' },
      1: { cellWidth: 64 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 36 },
      4: { cellWidth: 36 },
      5: { cellWidth: 27, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.section === 'body') {
        const v = String(data.cell.raw || '');
        data.cell.styles.textColor =
          v.startsWith('✓') ? C.emerald : v.startsWith('✗') ? C.rose : C.gray;
      }
    },
    margin: { left: 12, right: 12 },
    showHead: 'firstPage',
    didDrawPage: () => addFooter(pdf, schoolProfile),
  });

  // ── Signatures ──
  const finalY = (pdf.lastAutoTable?.finalY || y) + 20;
  if (finalY < 250) {
    pdf.setDrawColor(...C.grayDark);
    pdf.setLineWidth(0.5);
    pdf.line(20, finalY, 75, finalY);
    pdf.line(W - 75, finalY, W - 20, finalY);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...C.grayDark);
    pdf.text('Class Teacher Signature', 47, finalY + 5, { align: 'center' });
    pdf.text('Principal Signature', W - 47, finalY + 5, { align: 'center' });
    if (schoolProfile.principal) {
      pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5);
      pdf.text(`(${schoolProfile.principal})`, W - 47, finalY + 10, { align: 'center' });
    }
  }

  addFooter(pdf, schoolProfile);
  triggerDownload(pdf, `ReportCard_${(result.studentName || 'Student').replace(/\s+/g, '_')}_${(result.examTitle || 'Exam').replace(/\s+/g, '_')}.pdf`);
}

/* ══════════════════════════════════════════════
   2. CLASS MARKSHEET PDF
══════════════════════════════════════════════ */
export function downloadClassMarksheet(results, filterClass = '', filterSubject = '', schoolName = '', schoolProfile = {}) {
  const filtered = results.filter(r =>
    (!filterClass   || (r.class   || '').toLowerCase() === filterClass.toLowerCase()) &&
    (!filterSubject || (r.subject || '').toLowerCase() === filterSubject.toLowerCase())
  );

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const W   = pdf.internal.pageSize.getWidth();
  let   y   = addFormalHeader(
    pdf,
    `${filterClass ? `Class ${filterClass} — ` : ''}Master Marksheet`,
    schoolName,
    `${filterSubject ? 'Subject: ' + filterSubject : 'All Subjects'}  ·  Total Students: ${filtered.length}  ·  Date: ${today()}`,
    schoolProfile
  );

  y -= 2;

  // ── Summary Cards ──
  const avg    = filtered.length ? Math.round(filtered.reduce((s, r) => s + (r.percentage || 0), 0) / filtered.length) : 0;
  const passed = filtered.filter(r => (r.percentage || 0) >= 40).length;
  const top    = [...filtered].sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];
  const passRate = filtered.length ? Math.round(passed / filtered.length * 100) : 0;

  const sumStats = [
    { label: 'Total Students', val: filtered.length, c: C.primary },
    { label: 'Passed',         val: passed,           c: C.emerald },
    { label: 'Failed',         val: filtered.length - passed, c: C.rose },
    { label: 'Average Score',  val: `${avg}%`,        c: C.gold },
    { label: 'Pass Rate',      val: `${passRate}%`,   c: C.purple },
    { label: 'Top Scorer',     val: top ? `${top.studentName?.split(' ')[0] || '—'} (${top.percentage || 0}%)` : '—', c: C.accent },
  ];
  const bW = (W - 24) / sumStats.length;
  sumStats.forEach((s, i) => {
    const bx = 12 + i * bW;
    pdf.setFillColor(...C.white);
    pdf.setDrawColor(...s.c);
    pdf.setLineWidth(0.7);
    pdf.roundedRect(bx, y, bW - 2, 20, 2, 2, 'FD');
    pdf.setFillColor(...s.c);
    pdf.roundedRect(bx, y, bW - 2, 4, 1.5, 1.5, 'F');
    pdf.setFontSize(s.label === 'Top Scorer' ? 7 : 13); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...s.c);
    pdf.text(String(s.val), bx + (bW - 2) / 2, y + 13, { align: 'center' });
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...C.grayDark);
    pdf.text(s.label, bx + (bW - 2) / 2, y + 18, { align: 'center' });
  });
  y += 26;

  // ── Grade Distribution Banner ──
  const gradeDist = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
  filtered.forEach(r => { const { g } = getGrade(r.percentage || 0); gradeDist[g]++; });

  pdf.setFillColor(...C.grayLight);
  pdf.rect(12, y, W - 24, 12, 'F');
  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold');
  let gx = 16;
  Object.entries(gradeDist).forEach(([g, count]) => {
    const { c } = getGrade(g === 'A+' ? 95 : g === 'A' ? 85 : g === 'B+' ? 75 : g === 'B' ? 65 : g === 'C' ? 55 : g === 'D' ? 45 : 0);
    pdf.setTextColor(...c);
    pdf.text(`${g}: ${count}`, gx, y + 8);
    gx += 30;
  });
  y += 16;

  // ── Data Table ──
  const sorted = [...filtered].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  const rows = sorted.map((r, i) => {
    const { g: grade } = getGrade(r.percentage || 0);
    return [
      i + 1,
      r.studentName || '—',
      r.rollNo      || '—',
      r.class       || '—',
      r.examTitle   || '—',
      r.subject     || '—',
      `${r.score || 0}/${r.totalMarks || 0}`,
      `${r.percentage || 0}%`,
      grade,
      (r.percentage || 0) >= 40 ? 'PASS' : 'FAIL',
    ];
  });

  autoTable(pdf, {
    startY: y,
    head: [['Rank', 'Student Name', 'Roll No', 'Class', 'Exam', 'Subject', 'Score', '%', 'Grade', 'Result']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 8.5,
    },
    bodyStyles: { fontSize: 8, textColor: C.dark },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0:  { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      1:  { cellWidth: 48 },
      2:  { cellWidth: 22, halign: 'center' },
      3:  { cellWidth: 22, halign: 'center' },
      4:  { cellWidth: 50 },
      5:  { cellWidth: 36 },
      6:  { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      7:  { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      8:  { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      9:  { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      if (data.column.index === 9) {
        data.cell.styles.textColor = data.cell.raw === 'PASS' ? C.emerald : C.rose;
      }
      if (data.column.index === 8) {
        const { c } = getGrade(data.column.index === 8 ?
          (data.cell.raw === 'A+' ? 95 : data.cell.raw === 'A' ? 85 : data.cell.raw === 'B+' ? 75 :
           data.cell.raw === 'B' ? 65 : data.cell.raw === 'C' ? 55 : data.cell.raw === 'D' ? 45 : 0) : 0);
        data.cell.styles.textColor = c;
      }
      if (data.column.index === 0 && data.row.index === 0) {
        data.cell.styles.fillColor = C.gold;
        data.cell.styles.textColor = C.white;
      }
    },
    margin: { left: 12, right: 12 },
    didDrawPage: () => addFooter(pdf, schoolProfile),
  });

  addFooter(pdf, schoolProfile);
  triggerDownload(pdf, `Marksheet_${filterClass || 'All'}_${filterSubject || 'AllSubjects'}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ══════════════════════════════════════════════
   3. SUBJECT PERFORMANCE REPORT PDF
══════════════════════════════════════════════ */
export function downloadSubjectReport(results, schoolName = '', schoolProfile = {}) {
  const bySubject = {};
  results.forEach(r => {
    const sub = r.subject || 'Unknown';
    if (!bySubject[sub]) bySubject[sub] = [];
    bySubject[sub].push(r);
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W   = pdf.internal.pageSize.getWidth();
  let   y   = addFormalHeader(
    pdf, 'Subject-wise Performance Report', schoolName,
    `${results.length} total submissions  ·  ${Object.keys(bySubject).length} subjects  ·  ${today()}`,
    schoolProfile
  );

  Object.entries(bySubject).forEach(([subject, recs]) => {
    if (y > 230) {
      pdf.addPage();
      addFooter(pdf, schoolProfile);
      y = addFormalHeader(pdf, 'Subject-wise Performance Report (contd.)', schoolName, '', schoolProfile);
    }

    const avg    = Math.round(recs.reduce((s, r) => s + (r.percentage || 0), 0) / recs.length);
    const passed = recs.filter(r => (r.percentage || 0) >= 40).length;
    const top    = [...recs].sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];

    // Subject banner
    pdf.setFillColor(...C.primary);
    pdf.roundedRect(12, y, W - 24, 13, 2, 2, 'F');
    pdf.setFillColor(...C.gold);
    pdf.roundedRect(W - 36, y, 24, 13, 2, 2, 'F');

    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...C.white);
    pdf.text(subject.toUpperCase(), 17, y + 8.5);

    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Submissions: ${recs.length}  |  Avg: ${avg}%  |  Pass: ${Math.round(passed / recs.length * 100)}%  |  Topper: ${top?.studentName || '—'} (${top?.percentage || 0}%)`,
      W - 38, y + 8.5, { align: 'right' }
    );
    y += 17;

    const rows = [...recs]
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
      .map((r, i) => {
        const { g: grade } = getGrade(r.percentage || 0);
        return [
          i + 1,
          r.studentName || '—',
          r.rollNo      || '—',
          r.class       || '—',
          `${r.score || 0}/${r.totalMarks || 0}`,
          `${r.percentage || 0}%`,
          grade,
          (r.percentage || 0) >= 40 ? 'PASS' : 'FAIL',
          r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleDateString('en-IN') : '—',
        ];
      });

    autoTable(pdf, {
      startY: y,
      head: [['Rank', 'Student', 'Roll No', 'Class', 'Score', '%', 'Grade', 'Result', 'Date']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: C.grayDark, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: C.dark },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 52 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 17, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        8: { cellWidth: 26 },
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        if (data.column.index === 7) {
          data.cell.styles.textColor = data.cell.raw === 'PASS' ? C.emerald : C.rose;
        }
        if (data.column.index === 0 && data.row.index === 0) {
          data.cell.styles.fillColor = C.gold;
          data.cell.styles.textColor = C.white;
        }
      },
      margin: { left: 12, right: 12 },
      didDrawPage: () => addFooter(pdf, schoolProfile),
    });

    y = (pdf.lastAutoTable?.finalY || y) + 10;
  });

  addFooter(pdf, schoolProfile);
  triggerDownload(pdf, `SubjectReport_${(schoolName || 'School').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
