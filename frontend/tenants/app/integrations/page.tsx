"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api, { API_ROUTES } from '@/utils/api';
import { useToast } from '@/context/ToastContext';
import EnableToggleButton from '@/components/EnableToggleButton';

type ProviderKind = 'zdk' | 'znet' | 'internal';

type IntegrationRow = {
  id: string;
  name: string;
  provider: ProviderKind;
  baseUrl?: string;
  apiToken?: string;
  kod?: string;
  sifre?: string;
  enabled?: boolean;
};

type BalanceInfo = {
  balance: number | null;
  debt?: number | null;
  currency?: string | null | Record<string, any>;
  updatedAt?: string | null;
  error?: string | null;
  message?: string | null;
  debtError?: string | null;
};

export default function AdminIntegrationsPage() {
  const router = useRouter();
  const { success, error: toastError, info, show } = useToast();

  const [items, setItems] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [testing, setTesting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, BalanceInfo | undefined>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // modal state
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    provider: ProviderKind;
    baseUrl: string;
    apiToken: string;
    kod: string;
    sifre: string;
    enabled: boolean;
  }>({
    name: '',
    provider: 'zdk',
    baseUrl: '',
    apiToken: '',
    kod: '',
    sifre: '',
    enabled: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // Mock data for development
      const mockData: IntegrationRow[] = [
        {
          id: '1',
          name: 'ZDK Provider',
          provider: 'zdk',
          baseUrl: 'https://api.x-stor.net',
          apiToken: 'zdk_token_123456789',
          enabled: true,
        },
        {
          id: '2',
          name: 'ZNET Provider',
          provider: 'znet',
          baseUrl: 'http://bayi.siteadressinstead.com',
          kod: '54421999998',
          sifre: '********',
          enabled: true,
        },
      ];

      setItems(mockData);

      // Original API call (commented out for mock)
      /*
      const { data } = await api.get(API_ROUTES.admin.integrations.base) as any;

      // 👇 تطبيع الاستجابة
      const list: IntegrationRow[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : [];

      setItems(list);
      */
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || 'Failed to load integrations'
      );
      setItems([]); // تأكد أنها مصفوفة حتى لا ينهار الـ render
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // جلب الرصيد لكل تكامل مرة واحدة فقط بعد أول تحميل (منع التكرار السريع)
  const fetchedBalancesRef = useRef(false);
  useEffect(() => {
    if (!fetchedBalancesRef.current && items.length > 0) {
      fetchedBalancesRef.current = true;
      items.forEach((it) => it.enabled !== false && handleRefreshBalance(it.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      await api.post(API_ROUTES.admin.integrations.test(id));
    } catch {
      // تجاهل الخطأ هنا
    } finally {
      setTesting(null);
    }
  };

  const handleRefreshBalance = async (id: string) => {
    setRefreshing(id);
    try {
      // Mock balance data
      const mockBalance = {
        balance: id === '1' ? 1250.75 : 3400.50,
        debt: id === '1' ? 0 : 150.25,
        currency: id === '1' ? 'USD' : 'TRY',
        updatedAt: new Date().toISOString(),
        error: null,
        message: null,
        debtError: null,
      };

      setBalances((b) => ({ ...b, [id]: mockBalance }));

      // Original API call (commented out for mock)
      /*
      const { data } = await api.post(
        API_ROUTES.admin.integrations.refreshBalance(id)
      ) as any;
      setBalances((b) => ({
        ...b,
        [id]: {
          balance: (data as any)?.balance ?? null,
          debt: (data as any)?.debt ?? null,
          currency: (data as any)?.currency ?? null,
          updatedAt: (data as any)?.balanceUpdatedAt ?? null,
          error: (data as any)?.error ?? null,
          message: (data as any)?.message ?? null,
          debtError: (data as any)?.debtError ?? null,
        },
      }));
      */
    } catch {
      setBalances((b) => ({
        ...b,
        [id]: { balance: null, debt: null, error: 'FETCH_FAILED', message: 'تعذّر جلب الرصيد' },
      }));
    } finally {
      setRefreshing(null);
    }
  };
  const formatAmount = (
    value: number | null | undefined,
    rawCurrency: string | null | undefined | Record<string, any>,
    provider?: ProviderKind
  ) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const resolvedCurrency = (() => {
      if (typeof rawCurrency === 'string' && rawCurrency.trim()) {
        return rawCurrency.trim();
      }
      if (rawCurrency && typeof rawCurrency === 'object') {
        const obj = rawCurrency as Record<string, any>;
        for (const key of ['symbol', 'code', 'Code', 'currency']) {
          const val = obj[key];
          if (typeof val === 'string' && val.trim()) return val.trim();
        }
      }
      if (provider === 'internal') return 'USD';
      if (provider === 'znet' || provider === 'zdk') return 'TRY';
      return '';
    })();

    const currencySymbol = (() => {
      if (!resolvedCurrency) return '';
      if (resolvedCurrency.length === 1 && /[^A-Za-z]/.test(resolvedCurrency)) {
        return resolvedCurrency;
      }
      const lookup: Record<string, string> = {
        USD: '$',
        USDT: '$',
        TRY: '₺',
        TL: '₺',
        EUR: '€',
        GBP: '£',
        SAR: '﷼',
        AED: 'د.إ',
        KWD: 'د.ك',
      };
      return lookup[resolvedCurrency.toUpperCase()] || '';
    })();

    if (currencySymbol) {
      return `${currencySymbol} ${formatted}`;
    }
    return resolvedCurrency ? `${formatted} ${resolvedCurrency}` : formatted;
  };


  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(API_ROUTES.admin.integrations.byId(id));
      setItems((prev) => prev.filter((x) => x.id !== id));
      info('تم الحذف');
    } catch {
      toastError('فشل الحذف');
    } finally {
      setDeleting(null);
      setDeleteConfirmId(null);
    }
  };

  const handleToggle = async (row: IntegrationRow) => {
    setToggling(row.id);
    try {
      // Mock: Update locally
      setItems(prev => prev.map(p => p.id === row.id ? { ...p, enabled: !row.enabled } : p));
      if (row.enabled) info('تم التعطيل'); else success('تم التفعيل');

      // Original API call (commented out for mock)
      /*
      await api.put(API_ROUTES.admin.integrations.byId(row.id), { enabled: !row.enabled });
      setItems(prev => prev.map(p => p.id === row.id ? { ...p, enabled: !row.enabled } : p));
      if (row.enabled) info('تم التعطيل'); else success('تم التفعيل');
      */
    } catch (e: any) {
      toastError('فشل تغيير الحالة');
    } finally {
      setToggling(null);
    }
  };

  const goPackages = (id: string) => {
    router.push(`/products/integrations/${id}`);
  };

  const goEdit = (id: string) => {
    router.push(`/integrations/${id}/edit`);
  };

  // submit add integration
  const submitAdd = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload: any = {
        name: form.name.trim(),
        provider: form.provider,
        baseUrl: form.baseUrl || undefined,
        enabled: form.enabled,
      };

      if (form.provider === 'zdk' || form.provider === 'internal') {
        payload.apiToken = form.apiToken || undefined;
      } else if (form.provider === 'znet') {
        payload.kod = form.kod || undefined;
        payload.sifre = form.sifre || undefined;
      }

      await api.post(API_ROUTES.admin.integrations.base, payload);
      setOpenAdd(false);
      setForm({
        name: '',
        provider: 'zdk',
        baseUrl: '',
        apiToken: '',
        kod: '',
        sifre: '',
        enabled: true,
      });
      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || 'Failed to create integration'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const placeholderForBaseUrl =
    form.provider === 'znet'
      ? 'http://bayi.siteadressinstead.com'
      : form.provider === 'internal'
      ? 'ahmad.syrz1.com'
      : 'https://api.x-stor.net';

  return (
    <div className="p-4 md:p-6 text-text-primary">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">إعدادات API</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="
              px-4 py-2.5 rounded-lg font-medium text-sm
              bg-blue-600 text-white
              hover:bg-blue-700 hover:shadow-md
              active:scale-95
              transition-all duration-200
              flex items-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            disabled={loading}
          >
            <span>🔄</span>
            <span>{loading ? 'جاري التحميل..' : 'تحميل'}</span>
          </button>

          <button
            onClick={() => setOpenAdd(true)}
            className="
              px-4 py-2.5 rounded-lg font-medium text-sm
              bg-green-600 text-white
              hover:bg-green-700 hover:shadow-md
              active:scale-95
              transition-all duration-200
              flex items-center gap-2
            "
          >
            <span className="text-lg">+</span>
            <span>اضف API</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg border-2 border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-auto rounded-xl border border-border shadow-sm bg-bg-surface">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gradient-to-l from-primary/10 to-primary/5 border-b-2 border-primary/20">
            <tr>
              <th className="px-4 py-3 font-semibold text-text-primary text-right whitespace-nowrap">الإسم</th>
              <th className="px-4 py-3 font-semibold text-text-primary text-right whitespace-nowrap">النوع</th>
              <th className="px-4 py-3 font-semibold text-text-primary text-right whitespace-nowrap">الرابط</th>
              <th className="px-4 py-3 font-semibold text-text-primary text-right whitespace-nowrap">الحالة</th>
              <th className="px-4 py-3 font-semibold text-text-primary text-right whitespace-nowrap">الرصيد</th>
              <th className="px-4 py-3 font-semibold text-text-primary text-right whitespace-nowrap">العمليات</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-text-secondary"
                >
                  لا يوجد جهات تم الربط معها بعد
                </td>
              </tr>
            )}

            {items.map((it, idx) => (
              <tr
                key={it.id}
                className={`
                  transition-all duration-200
                  ${idx % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-surface-alt/30'}
                  hover:bg-primary/5 hover:shadow-sm
                  border-b border-border/30
                `}
              >
                <td className="px-4 py-3 font-medium text-right">{it.name}</td>
                <td className="px-4 py-3 text-right">
                  <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium uppercase">
                    {it.provider}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-secondary">{it.baseUrl || '—'}</td>
                <td className="px-4 py-3 text-right">
                    <EnableToggleButton
                      enabled={it.enabled}
                      loading={toggling === it.id}
                      onToggle={() => handleToggle(it)}
                      variant="circle"
                      tooltip={it.enabled ? 'مفعل - اضغط للتعطيل' : 'معطل - اضغط للتفعيل'}
                    />
                </td>
                <td className="px-4 py-3 text-right">
                  {it.enabled === false ? '—' : (() => {
                    const info = balances[it.id];
                    if (!info) {
                      return <span className="text-text-secondary">—</span>;
                    }
                    const balanceLabel = formatAmount(info.balance, info.currency, it.provider);
                    const debtLabel = info.debt !== null && info.debt !== undefined
                      ? formatAmount(info.debt, info.currency, it.provider)
                      : null;
                    const metaMessage = info.debtError || info.message || (info.error && info.error !== 'FETCH_FAILED' ? info.error : null);
                    return (
                      <div className="flex flex-col items-end gap-0.5 leading-tight">
                        <span>{balanceLabel}</span>
                        {debtLabel && (
                          <span className="text-xs text-danger">
                            دين: {debtLabel}
                          </span>
                        )}
                        {metaMessage && (
                          <span className="text-xs text-danger/80">
                            {metaMessage}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 justify-start">
                    <button
                      onClick={() => handleRefreshBalance(it.id)}
                      disabled={refreshing === it.id || it.enabled === false}
                      className="
                        px-3 py-1.5 rounded-md text-xs font-medium
                        bg-blue-600 text-white
                        hover:bg-blue-700 hover:shadow-md
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-150
                      "
                    >
                      {refreshing === it.id ? 'يتم التحديث..' : 'تحديث'}
                    </button>

                    <button
                      onClick={() => goPackages(it.id)}
                      disabled={it.enabled === false}
                      className="
                        px-3 py-1.5 rounded-md text-xs font-medium
                        bg-green-600 text-white
                        hover:bg-green-700 hover:shadow-md
                        disabled:opacity-40 disabled:cursor-not-allowed
                        transition-all duration-150
                      "
                    >
                      ربط
                    </button>

                    <button
                      onClick={() => goEdit(it.id)}
                      className="
                        px-3 py-1.5 rounded-md text-xs font-medium
                        bg-orange-600 text-white
                        hover:bg-orange-700 hover:shadow-md
                        transition-all duration-150
                      "
                    >
                      تعديل
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(it.id)}
                      disabled={deleting === it.id}
                      className="
                        px-3 py-1.5 rounded-md text-xs font-medium
                        bg-red-600 text-white
                        hover:bg-red-700 hover:shadow-md
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-150
                      "
                    >
                      {deleting === it.id ? 'يحذف..' : 'حذف'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                  <div className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    <span>يحمل...</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal إضافة تكامل */}
      {openAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-bg-surface text-text-primary shadow-2xl border border-border/50 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-primary">Add Integration</h2>
              <button
                onClick={() => setOpenAdd(false)}
                className="
                  w-8 h-8 rounded-full
                  flex items-center justify-center
                  text-text-secondary hover:text-text-primary
                  hover:bg-bg-surface-alt
                  transition-all duration-200
                "
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">الاسم</label>
                <input
                  className="
                    w-full px-4 py-2.5 rounded-lg
                    bg-bg-input border border-border
                    text-text-primary placeholder:text-text-secondary
                    focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                    transition-all duration-200
                  "
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="هذا الاسم خاص بك"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">اختر الجهة</label>
                <select
                  className="
                    w-full px-4 py-2.5 rounded-lg
                    bg-bg-input border border-border
                    text-text-primary
                    focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                    transition-all duration-200
                  "
                  value={form.provider}
                  onChange={(e) =>
                    setForm({ ...form, provider: e.target.value as ProviderKind })
                  }
                >
                  <option value="zdk">ZDK</option>
                  <option value="znet">znet</option>
                  <option value="internal">internal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">الرابط</label>
                <input
                  className="
                    w-full px-4 py-2.5 rounded-lg
                    bg-bg-input border border-border
                    text-text-primary placeholder:text-text-secondary
                    focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                    transition-all duration-200
                  "
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder={placeholderForBaseUrl}
                />
              </div>

              {(form.provider === 'zdk' || form.provider === 'internal') && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">API Token</label>
                  <input
                    className="
                      w-full px-4 py-2.5 rounded-lg
                      bg-bg-input border border-border
                      text-text-primary placeholder:text-text-secondary
                      focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                      transition-all duration-200
                    "
                    value={form.apiToken}
                    onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                    placeholder="ادخل التوكن"
                  />
                </div>
              )}

              {form.provider === 'znet' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">رقم الجوال</label>
                    <input
                      className="
                        w-full px-4 py-2.5 rounded-lg
                        bg-bg-input border border-border
                        text-text-primary placeholder:text-text-secondary
                        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                        transition-all duration-200
                      "
                      value={form.kod}
                      onChange={(e) => setForm({ ...form, kod: e.target.value })}
                      placeholder="54421999998"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">كلمة السر</label>
                    <input
                      className="
                        w-full px-4 py-2.5 rounded-lg
                        bg-bg-input border border-border
                        text-text-primary placeholder:text-text-secondary
                        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                        transition-all duration-200
                      "
                      value={form.sifre}
                      onChange={(e) => setForm({ ...form, sifre: e.target.value })}
                      placeholder="*******"
                      type="password"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="enabled-checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="
                    w-5 h-5 rounded
                    border-2 border-primary
                    text-primary focus:ring-2 focus:ring-primary/40
                    cursor-pointer
                  "
                />
                <label htmlFor="enabled-checkbox" className="text-sm font-medium text-text-primary cursor-pointer">
                  Enabled
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-bg-surface-alt border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setOpenAdd(false)}
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
                onClick={submitAdd}
                disabled={submitting || !form.name.trim() || !form.baseUrl.trim()}
                className="
                  px-5 py-2.5 rounded-lg font-medium text-sm
                  bg-primary text-white
                  hover:bg-primary/90 hover:shadow-md
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                {submitting ? 'يحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-bg-surface text-text-primary shadow-2xl border border-border/50 overflow-hidden animate-scale-in">
            <div className="px-6 py-5 bg-gradient-to-r from-red-500/10 to-red-600/10 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-4xl">⚠️</span>
                <h2 className="text-xl font-bold text-red-600 dark:text-red-400">تأكيد الحذف</h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-base text-text-primary mb-2">
                هل أنت متأكد من حذف هذا التكامل؟
              </p>
              <p className="text-sm text-text-secondary">
                <span className="font-semibold">{items.find(x => x.id === deleteConfirmId)?.name}</span>
              </p>
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                  <span>🚨</span>
                  <span>هذا الإجراء لا يمكن التراجع عنه!</span>
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-bg-surface-alt border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting === deleteConfirmId}
                className="
                  px-5 py-2.5 rounded-lg font-medium text-sm
                  bg-gray-200 text-gray-700
                  hover:bg-gray-300
                  dark:bg-gray-700 dark:text-gray-200
                  dark:hover:bg-gray-600
                  transition-all duration-200
                  disabled:opacity-50
                "
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleting === deleteConfirmId}
                className="
                  px-5 py-2.5 rounded-lg font-bold text-sm
                  bg-gradient-to-r from-red-600 to-red-500 text-white
                  hover:from-red-700 hover:to-red-600 hover:shadow-lg
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  flex items-center gap-2
                "
              >
                <span>{deleting === deleteConfirmId ? '⏳' : '🗑️'}</span>
                <span>{deleting === deleteConfirmId ? 'جاري الحذف...' : 'نعم، احذف'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
