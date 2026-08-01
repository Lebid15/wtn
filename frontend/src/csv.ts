/**
 * تصدير جدول إلى ملفّ يفتحه Excel.
 *
 * CSV بفاصلة منقوطة و**BOM** في أوّله: بدونهما يعرض Excel العربية رموزاً
 * مشوّهة، ويقسم الأرقام العشرية على أعمدة في الويندوز العربي.
 */
function cell(v: unknown): string {
  const s = String(v ?? "");
  // = + - @ في أوّل الخلية تجعل Excel يفسّرها صيغةً — نُسبقها بفاصلة عليا
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const body = [headers, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filename}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
