'use client';
import { useEffect, useState } from 'react';
import { fmtDateStable } from '@/lib/fmtDateStable';
import api, { API_ROUTES } from '@/utils/api';

export default function Page() {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 👈 هنا التصحيح: infoes بدل about
        const r = await api.get<any>(API_ROUTES.site.admin.infoes);
        if (!mounted) return;
        const val = typeof r.data === 'string'
          ? r.data
          : (r.data && typeof r.data === 'object' ? ((r.data as any).value ?? '') : '');
        setValue(val || '');
      } catch {
        if (!mounted) return;
        setError('تعذّر جلب المحتوى');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    try {
      // 👈 وهنا أيضًا: infoes بدل about
  await api.put(API_ROUTES.site.admin.infoes, { value });
  setSavedAt(fmtDateStable(new Date()));
    } catch {
      setError('تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto bg-bg-surface border border-border rounded-2xl shadow">
        <div className="flex items-center justify-between gap-2 p-4 md:p-5 border-b border-border">
          <h1 className="text-lg font-bold text-text-primary">تعليمات (إدارة)</h1>
          {savedAt ? (
            <span className="text-[12px] text-text-secondary">تم الحفظ: {savedAt}</span>
          ) : null}
        </div>

        <div className="p-4 md:p-5 space-y-3">
          {error ? (
            <div className="rounded-md border border-danger/40 bg-danger/10 text-danger px-3 py-2 text-sm">
              {error}
            </div>
          ) : null}

          <div className="text-xs text-text-secondary">النص الظاهر للمستخدم في صفحة “تعليمات”</div>

          <div className={['rounded-xl border border-border bg-bg-elevated','focus-within:ring-2 focus-within:ring-primary/40 transition-shadow'].join(' ')}>
            {loading ? (
              <div className="p-3 text-text-secondary text-sm">جارِ التحميل…</div>
            ) : (
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full min-h-[50vh] md:h-[60vh] p-3 bg-transparent outline-none text-text-primary placeholder:text-text-secondary resize-y"
                placeholder="اكتب نص تعليمات..."
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving || loading}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-contrast rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="حفظ"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 004 12z"/>
                  </svg>
                  جارِ الحفظ…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  حفظ
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setValue('')}
              disabled={saving || loading}
              className="px-6 py-2.5 bg-bg-surface-hover hover:bg-bg-surface-alt text-text-primary border border-border rounded-lg font-medium transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="تفريغ المحتوى"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              مسح
            </button>
          </div>

          <div className="text-[11px] text-text-secondary text-left ltr">
            {value.length.toString()} حرف
          </div>
        </div>
      </div>
    </div>
  );
}
