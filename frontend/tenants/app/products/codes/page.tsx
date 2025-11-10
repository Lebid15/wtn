'use client';

import React, { useEffect, useMemo, useState } from 'react';
import api from '@/utils/api';
import Link from 'next/link';

type CodeGroup = {
  id: string;
  name: string;
  publicCode: string;
  note?: string | null;
  providerType: 'internal_codes' | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function CodeGroupsPage() {
  const notify = (msg: string) => {
    try { console.log(msg); } catch {}
    if (typeof window !== 'undefined') alert(msg);
  };

  const [groups, setGroups] = useState<CodeGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', publicCode: '', note: '' });
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [q, setQ] = useState('');

  // بيانات وهمية كأمثلة
  const dummyGroups: CodeGroup[] = [
    {
      id: 'dummy-1',
      name: 'Google Play 25 TL',
      publicCode: 'GPLAY-25TRY',
      note: 'أكواد جوجل بلاي تركية 25 ليرة',
      providerType: 'internal_codes',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dummy-2',
      name: 'iTunes 50 USD',
      publicCode: 'ITUNES-50USD',
      note: 'بطاقات آيتونز أمريكية 50 دولار',
      providerType: 'internal_codes',
      isActive: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'dummy-3',
      name: 'PlayStation 100 SAR',
      publicCode: 'PSN-100SAR',
      note: 'بطاقات بلايستيشن سعودية',
      providerType: 'internal_codes',
      isActive: false,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  const filtered = useMemo(() => {
    // استخدام البيانات الوهمية إذا كان الجدول فارغاً
    let data = groups.length > 0 ? groups : dummyGroups;
    if (filter !== 'all') data = data.filter((g) => (filter === 'active' ? g.isActive : !g.isActive));
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      data = data.filter(
        (g) =>
          g.name.toLowerCase().includes(s) ||
          g.publicCode.toLowerCase().includes(s) ||
          (g.note || '').toLowerCase().includes(s),
      );
    }
    return data;
  }, [groups, filter, q, dummyGroups]);

  const isDummyData = groups.length === 0 && filtered.length > 0;

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/codes/groups') as any;
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.items) ? res.data.items : [];
      setGroups(data as CodeGroup[]);
    } catch (e: any) {
      notify(`فشل تحميل المجموعات: ${e?.response?.data?.message || e.message}`);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.publicCode.trim()) {
      notify('الاسم و الكود العام مطلوبان');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        name: form.name.trim(),
        publicCode: form.publicCode.trim().toUpperCase(),
        note: form.note?.trim() || undefined,
      };
      await api.post('/admin/codes/groups', payload);
      notify('تم إنشاء المجموعة بنجاح');
      setForm({ name: '', publicCode: '', note: '' });
      await loadGroups();
      (document.getElementById('create-dialog') as HTMLDialogElement | null)?.close();
    } catch (e: any) {
      notify(`فشل الإنشاء: ${e?.response?.data?.message || e.message}`);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string) => {
    if (isDummyData) return;
    try {
      await api.patch(`/admin/codes/groups/${id}/toggle`);
      notify('تم تحديث الحالة');
      await loadGroups();
    } catch (e: any) {
      notify(`فشل التحديث: ${e?.response?.data?.message || e.message}`);
    }
  };

  return (
    <div className="p-4 md:p-6 text-text-primary min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎫</span>
          <h1 className="text-3xl font-bold text-text-primary">مجموعات الأكواد</h1>
        </div>
        <button
          className="
            px-5 py-2.5 rounded-lg font-bold text-sm
            bg-gradient-to-r from-green-600 to-green-500 text-white
            hover:from-green-700 hover:to-green-600 hover:shadow-lg
            transition-all duration-200
            flex items-center gap-2
          "
          onClick={() => (document.getElementById('create-dialog') as HTMLDialogElement)?.showModal()}
        >
          <span className="text-lg">+</span>
          <span>إضافة مجموعة</span>
        </button>
      </div>

      {/* شريط الفلاتر */}
      <div className="mb-6 p-4 rounded-xl border border-border bg-bg-surface shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex gap-2">
            <button 
              onClick={() => setFilter('all')} 
              className={`
                px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200
                ${filter === 'all' 
                  ? 'bg-primary text-primary-contrast shadow-md' 
                  : 'bg-bg-surface-alt text-text-primary hover:bg-primary/10'
                }
              `}
            >
              الكل
            </button>
            <button 
              onClick={() => setFilter('active')} 
              className={`
                px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200
                ${filter === 'active' 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-bg-surface-alt text-text-primary hover:bg-green-600/10'
                }
              `}
            >
              المفعّلة
            </button>
            <button 
              onClick={() => setFilter('inactive')} 
              className={`
                px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200
                ${filter === 'inactive' 
                  ? 'bg-gray-600 text-white shadow-md' 
                  : 'bg-bg-surface-alt text-text-primary hover:bg-gray-600/10'
                }
              `}
            >
              المعطّلة
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="بحث بالاسم / الكود / الملاحظة..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="
                px-4 py-2 rounded-lg
                bg-bg-input border border-border
                text-text-primary placeholder:text-text-secondary
                focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                transition-all duration-200
                w-full md:w-80
              "
            />
            <button 
              onClick={loadGroups} 
              className="
                px-4 py-2 rounded-lg font-medium text-sm
                bg-blue-600 text-white
                hover:bg-blue-700 hover:shadow-md
                transition-all duration-200
                flex items-center gap-2
              "
            >
              <span>🔄</span>
              <span>تحديث</span>
            </button>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="overflow-auto rounded-xl border border-border shadow-lg bg-bg-surface">
        <table className="min-w-full w-full text-sm">
          <thead className="bg-gradient-to-l from-primary/10 to-primary/5 border-b-2 border-primary/20">
            <tr>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">#</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">الاسم</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">الكود العام</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">الملاحظة</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">الحالة</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">تاريخ الإنشاء</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl animate-spin">⏳</span>
                    <span className="text-text-secondary">جاري التحميل...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-5xl opacity-50">📭</span>
                    <span className="text-text-secondary text-lg">لا توجد مجموعات</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((g, idx) => (
                <tr
                  key={g.id}
                  className={`
                    transition-all duration-200
                    ${idx % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-surface-alt'}
                    hover:bg-primary/5 hover:shadow-sm
                    border-b border-border/30
                  `}
                >
                  <td className="px-4 py-3 text-text-secondary">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-text-primary">{g.name}</td>
                  <td className="px-4 py-3">
                    <code className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary font-mono font-bold text-xs">
                      {g.publicCode}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-sm">{g.note || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(g.id)}
                      disabled={isDummyData}
                      className={`
                        w-6 h-6 rounded-full
                        transition-all duration-200
                        flex items-center justify-center
                        ${g.isActive 
                          ? 'bg-green-500 hover:bg-green-600 shadow-md' 
                          : 'bg-gray-400 hover:bg-gray-500 shadow-sm'
                        }
                        ${isDummyData ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-110'}
                      `}
                      title={isDummyData ? 'بيانات وهمية' : (g.isActive ? 'مفعّل - اضغط للتعطيل' : 'معطّل - اضغط للتفعيل')}
                    />
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-sm font-mono">
                    {new Date(g.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <Link 
                      href={`/products/codes/${g.id}`}
                      className="
                        px-4 py-2 rounded-lg font-medium text-sm
                        bg-blue-600 text-white
                        hover:bg-blue-700 hover:shadow-md
                        transition-all duration-200
                        inline-flex items-center gap-2
                      "
                    >
                      <span>📄</span>
                      <span>الأكواد</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog إضافة مجموعة */}
      <dialog id="create-dialog" className="modal">
        <form
          onSubmit={onCreate}
          className="
            w-[95vw] max-w-2xl rounded-2xl
            bg-bg-surface text-text-primary
            border border-border shadow-2xl
            p-6
          "
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">➕</span>
            <h3 className="text-2xl font-bold text-text-primary">
              إضافة مجموعة أكواد
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">
                اسم المجموعة
              </label>
              <input
                className="
                  w-full px-4 py-2.5 rounded-lg
                  bg-bg-input border border-border
                  text-text-primary placeholder:text-text-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                  transition-all duration-200
                "
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: Google Play 25 TL"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">
                الكود العام (publicCode)
              </label>
              <input
                className="
                  w-full px-4 py-2.5 rounded-lg
                  bg-bg-input border border-border
                  text-text-primary placeholder:text-text-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                  transition-all duration-200
                  font-mono
                "
                value={form.publicCode}
                onChange={(e) => setForm((f) => ({ ...f, publicCode: e.target.value }))}
                placeholder="مثال: GPLAY-25TRY"
                required
              />
              <p className="text-xs text-text-secondary mt-2 flex items-start gap-2">
                <span>💡</span>
                <span>أحرف كبيرة/أرقام/.-_ من 3 إلى 32 حرفًا — مثال: <strong>ITUNES-50USD</strong></span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">
                ملاحظة (اختياري)
              </label>
              <textarea
                className="
                  w-full px-4 py-2.5 rounded-lg
                  bg-bg-input border border-border
                  text-text-primary placeholder:text-text-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                  transition-all duration-200
                  resize-none
                "
                rows={3}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="مثال: أكواد تركية 25 ليرة"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() =>
                (document.getElementById('create-dialog') as HTMLDialogElement)?.close()
              }
              className="
                px-5 py-2.5 rounded-lg font-medium text-sm
                bg-gray-200 text-gray-700
                hover:bg-gray-300
                dark:bg-gray-700 dark:text-gray-200
                dark:hover:bg-gray-600
                transition-all duration-200
              "
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={creating}
              className="
                px-6 py-2.5 rounded-lg font-bold text-sm
                bg-gradient-to-r from-green-600 to-green-500 text-white
                hover:from-green-700 hover:to-green-600 hover:shadow-lg
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                flex items-center gap-2
              "
            >
              <span>{creating ? '⏳' : '✓'}</span>
              <span>{creating ? 'جارٍ الإضافة...' : 'إضافة'}</span>
            </button>
          </div>
        </form>
      </dialog>

      <style dangerouslySetInnerHTML={{__html: `
        .modal[open] {
          display: flex;
          align-items: center;
          justify-content: center;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 50;
          padding: 10px;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />

    </div>
  );
}
