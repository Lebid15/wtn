'use client';

import { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import api, { API_ROUTES, API_BASE_URL } from '@/utils/api';
import { ErrorResponse } from '@/types/common';

/* =======================
   عناصر مساعدة مع بحث
   ======================= */

type SimpleOption = { id: string; name: string };
type ProductLite = { id: string; name: string; isActive?: boolean };

function useClickAway<T extends HTMLElement>(onAway: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onAway();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onAway]);
  return ref;
}

/** ComboBox: زر يفتح قائمة فيها input للبحث + عناصر. يسمح بإدخال حرّ */
function SearchableCombo({
  value,
  onChange,
  placeholder,
  options,
  buttonClass,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: string[];
  buttonClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useClickAway<HTMLDivElement>(() => setOpen(false));

  const filtered = useMemo(() => {
    const uniq = Array.from(new Set(options)).filter(Boolean);
    if (!q) return uniq.slice(0, 200);
    return uniq.filter((s) => s.toLowerCase().includes(q.toLowerCase())).slice(0, 200);
  }, [q, options]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          buttonClass ??
          'px-3 py-1.5 rounded-md border border-border bg-bg-surface text-text-primary'
        }
        title={value || placeholder}
      >
        {value || placeholder || 'Select'}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-md border border-border bg-bg-surface shadow-lg text-text-primary">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث…"
              className="input w-full"
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-text-secondary">لا نتائج</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                className={`w-full text-right px-3 py-2 text-sm hover:bg-bg-surface-alt ${
                  opt === value ? 'bg-bg-surface-alt font-medium' : ''
                }`}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                  setQ('');
                }}
              >
                {opt}
              </button>
            ))}
            {/* اختيار حر */}
            {q && (
              <button
                className="w-full text-right px-3 py-2 text-sm text-link hover:bg-bg-surface-alt border-t border-border"
                onClick={() => {
                  onChange(q);
                  setOpen(false);
                  setQ('');
                }}
              >
                استخدم: “{q}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Select بقائمة مع بحث في الأعلى (لباقات المزود) */
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: SimpleOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  // إغلاق عند النقر خارجًا
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // لو النقرة على الزر الأصلي اترك التحكم لحدث الزر
        const btn = document.getElementById('pkg-select-btn-active');
        if (btn && btn.contains(e.target as Node)) return;
        setOpen(false);
        setQ('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    if (!q) return options;
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q.toLowerCase()) ||
        String(o.id).toLowerCase().includes(q.toLowerCase())
    );
  }, [q, options]);

  const selected = value ? options.find((o) => String(o.id) === String(value)) : null;

  // احسب إحداثيات الزر عند الفتح
  const btnRef = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 380)), width: Math.max(r.width, 340) });
    }
  }, [open]);

  const dropdown = open && coords
    ? createPortal(
        <div
          ref={ref}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 1000 }}
          className="rounded-md border border-border bg-bg-surface shadow-xl text-text-primary animate-fade-in"
        >
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن الباقة…"
              className="input w-full"
            />
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <button
              className={`w-full text-right px-3 py-2 text-sm hover:bg-bg-surface-alt ${
                !value ? 'bg-bg-surface-alt font-medium' : ''
              }`}
              onClick={() => {
                onChange('');
                setOpen(false);
                setQ('');
              }}
            >
              — إختر باقة —
            </button>
      {filtered.map((o) => (
              <button
                key={String(o.id)}
                className={`w-full text-right px-3 py-2 text-sm hover:bg-bg-surface-alt ${
                  String(o.id) === String(value) ? 'bg-bg-surface-alt font-medium' : ''
                }`}
                onClick={() => {
                  onChange(String(o.id));
                  setOpen(false);
                  setQ('');
                }}
        title={`${o.name} (${o.id})`}
              >
        {o.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-text-secondary">لا نتائج</div>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        id={open ? 'pkg-select-btn-active' : undefined}
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border border-border rounded-md px-2 py-1 w-72 bg-bg-surface text-text-primary text-left truncate focus:outline-none focus:ring-2 focus:ring-primary/40"
        title={selected ? `${selected.name} (${selected.id})` : placeholder}
      >
        {selected ? `${selected.name}` : placeholder || 'Select…'}
      </button>
      {dropdown}
    </>
  );
}

/* =======================
   سعر الصرف (USD → TRY)
   ======================= */

type CurrencyRow = { code?: string; currencyCode?: string; rate?: number; value?: number; fx?: number };

async function loadTryRateFromApi(): Promise<number | null> {
  // نحاول أكثر من مسار محتمل حسب بنية الـ API لديك
  const candidates: string[] = [
    ((API_ROUTES as Record<string, unknown>)?.currencies as Record<string, unknown>)?.base as string,
    (((API_ROUTES as Record<string, unknown>)?.admin as Record<string, unknown>)?.currencies as Record<string, unknown>)?.base as string,
    `${API_BASE_URL}/currencies`,
    `${API_BASE_URL}/admin/currencies`,
  ].filter((u): u is string => Boolean(u));

  for (const url of candidates) {
    try {
      const { data } = await api.get(url) as any;
      const dataRecord = data as Record<string, unknown>;
      const list: CurrencyRow[] = Array.isArray(data) ? data : Array.isArray(dataRecord?.items) ? dataRecord.items as CurrencyRow[] : [];
      const tryRow =
        list.find((c) => String(c.code || c.currencyCode).toUpperCase() === 'TRY') || null;

      if (tryRow) {
        // التقط أي حقل يمثل "كم ليرة لكل 1 دولار"
        const v = [tryRow.rate, tryRow.value, tryRow.fx]
          .map((x) => Number(x))
          .find((x) => !Number.isNaN(x) && x > 0);
        if (v && v > 0) return v;
      }
    } catch {
      // جرّب التالي
    }
  }
  return null;
}

/* =======================
   الصفحة الأصلية
   ======================= */

type ProviderPkg = { id: string; name: string; price?: number; currency?: string | null };
type Row = {
  our_package_id: string;
  our_package_name: string;
  our_base_price: number;        // USD
  provider_price: number | null; // TRY
  current_mapping: string | null;
  provider_packages: ProviderPkg[];
};
type ApiInfo = { id: string; name: string; type: string; balance: number };
type IntegrationConfigRow = {
  id: string;
  name: string;
  provider: 'barakat' | 'apstore' | 'znet';
  baseUrl?: string;
  apiToken?: string;
  kod?: string;
  sifre?: string;
};

export default function IntegrationMappingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null);
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfigRow | null>(null);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

  const [product, setProduct] = useState<string>(searchParams.get('product') || 'الكل');
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const skipNextAutoLoad = useRef(false);

  // باقات وهمية كأمثلة
  const dummyRows: Row[] = [
    {
      our_package_id: 'dummy-1',
      our_package_name: 'PUBG Mobile - 60 UC',
      our_base_price: 1.20,
      provider_price: 35.50,
      current_mapping: null,
      provider_packages: [
        { id: 'prov-1', name: 'PUBG 60 شدة', price: 35.50, currency: 'TRY' },
        { id: 'prov-2', name: 'PUBG Mobile 60 UC', price: 36.00, currency: 'TRY' },
      ],
    },
    {
      our_package_id: 'dummy-2',
      our_package_name: 'PUBG Mobile - 325 UC',
      our_base_price: 5.99,
      provider_price: 178.00,
      current_mapping: 'prov-3',
      provider_packages: [
        { id: 'prov-3', name: 'PUBG 325 شدة', price: 178.00, currency: 'TRY' },
        { id: 'prov-4', name: 'PUBG Mobile 300+25 UC', price: 180.00, currency: 'TRY' },
      ],
    },
    {
      our_package_id: 'dummy-3',
      our_package_name: 'Free Fire - 100 Diamonds',
      our_base_price: 1.50,
      provider_price: 42.00,
      current_mapping: null,
      provider_packages: [
        { id: 'prov-5', name: 'Free Fire 100 جوهرة', price: 42.00, currency: 'TRY' },
        { id: 'prov-6', name: 'FF Diamonds 100', price: 43.50, currency: 'TRY' },
      ],
    },
    {
      our_package_id: 'dummy-4',
      our_package_name: 'Netflix - شهر واحد',
      our_base_price: 8.99,
      provider_price: 265.00,
      current_mapping: 'prov-7',
      provider_packages: [
        { id: 'prov-7', name: 'Netflix 1 شهر', price: 265.00, currency: 'TRY' },
        { id: 'prov-8', name: 'نتفليكس شهري', price: 270.00, currency: 'TRY' },
      ],
    },
  ];

  // سعر الصرف: كم ليرة لكل 1 دولار
  const [tryRate, setTryRate] = useState<number | null>(null);
  const toTRY = (usd?: number | null) =>
    tryRate && usd != null ? Number(usd) * tryRate : null;

  useEffect(() => {
    (async () => {
      const rate = await loadTryRateFromApi();
      setTryRate(rate);
    })();
  }, []);

  const mappedCount = useMemo(
    () => rows.filter((r) => r.current_mapping && String(r.current_mapping).length > 0).length,
    [rows]
  );

  // استخدام الباقات الوهمية إذا كان الجدول فارغاً ولم يتم التحميل
  const displayRows = useMemo(() => {
    if (rows.length > 0) return rows;
    if (loading) return [];
    // عرض الباقات الوهمية فقط إذا لم يكن هناك بيانات حقيقية
    return dummyRows;
  }, [rows, loading, dummyRows]);

  const isDummyData = displayRows === dummyRows;

  // جلب أسماء المنتجات من الـ backend
  const loadProductOptions = async () => {
    setLoadingProducts(true);
    try {
      const { data } = await api.get(API_ROUTES.products.base) as any;
      const names = (Array.isArray(data) ? data : [])
        .filter((p: any) => p?.isActive !== false)
        .map((p: any) => p.name)
        .filter(Boolean);
      setProductOptions(Array.from(new Set(names)));
      // لا نغير القيمة الافتراضية - تبقى "الكل"
    } catch {
      // تجاهل
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProductOptions();
  }, []);

  // fallback محلي لو فشل جلب المنتجات
  const productSuggestions = useMemo(() => {
    const baseOptions = productOptions.length
      ? productOptions
      : Array.from(new Set(rows.map((r) => r.our_package_name?.split(' ')?.[0] || '').filter(Boolean)));
    
    // إضافة خيار "الكل" في البداية
    return ['الكل', ...baseOptions];
  }, [productOptions, rows]);

  type LoadOptions = {
    productOverride?: string;
    preserveMsg?: boolean;
  };

  const load = async (options?: LoadOptions): Promise<Row[]> => {
    if (!id) return [];
    const targetProduct = options?.productOverride ?? product;
    setLoading(true);
    setError('');
    if (!options?.preserveMsg) setMsg('');
    try {
      // إذا كان "الكل" لا نرسل query parameter
      const productParam = targetProduct && targetProduct !== 'الكل' 
        ? `?product=${encodeURIComponent(targetProduct)}` 
        : '';
      
      const { data } = await api.get(
        `${API_ROUTES.admin.integrations.packages(String(id))}${productParam}`
      ) as any;
      setApiInfo((data as any).api);
      setRows((data as any).packages || []);

      const listRes = await api.get(API_ROUTES.admin.integrations.base) as any;
      const listData = Array.isArray(listRes.data) 
        ? listRes.data 
        : Array.isArray(listRes.data?.items) 
        ? listRes.data.items 
        : [];
      const found = (listData as IntegrationConfigRow[]).find((x) => x.id === String(id)) || null;
      setIntegrationConfig(found);
      return (data as any).packages || [];
    } catch (e: unknown) {
      const error = e as ErrorResponse;
      setError(error?.response?.data?.message || error?.message || 'Failed to load mapping');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skipNextAutoLoad.current) {
      skipNextAutoLoad.current = false;
      return;
    }
    void load();
  }, [id, product]);

  const applyFilter = (nextProduct: string) => {
    const qp = new URLSearchParams(searchParams.toString());
    // إذا كان "الكل" لا نرسل فلتر للـ backend
    if (nextProduct && nextProduct !== 'الكل') {
      qp.set('product', nextProduct);
    } else {
      qp.delete('product');
    }
    const qs = qp.toString();
    const url = qs ? `/admin/products/integrations/${id}?${qs}` : `/admin/products/integrations/${id}`;
    router.replace(url);
  };

  const updateRowMapping = (ourId: string, providerId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.our_package_id === ourId ? { ...r, current_mapping: providerId } : r))
    );
  };

  const saveAll = async () => {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const payload = rows
        .filter((r) => r.current_mapping && String(r.current_mapping).length > 0)
        .map((r) => ({
          our_package_id: r.our_package_id,
          provider_package_id: String(r.current_mapping),
        }));
      await api.post(API_ROUTES.admin.integrations.packages(String(id)), payload);
      const refreshedRows = await load({ preserveMsg: true });

      if ((refreshedRows?.length ?? 0) === 0 && product) {
        const fallbackProduct = productOptions.find((name) => name && name !== product) ?? productOptions[0] ?? '';
        if (fallbackProduct && fallbackProduct !== product) {
          skipNextAutoLoad.current = true;
          setProduct(fallbackProduct);
          applyFilter(fallbackProduct);
          await load({ productOverride: fallbackProduct, preserveMsg: true });
        }
      }

      setMsg('تم حفظ الربط بنجاح.');
    } catch (e: unknown) {
      const error = e as ErrorResponse;
      setError(error?.response?.data?.message || error?.message || 'Failed to save mappings');
    } finally {
      setSaving(false);
    }
  };

  const syncProviderProducts = async () => {
    if (!id) return;
    setSyncing(true);
    setError('');
    setMsg('');
    try {
      await api.post(API_ROUTES.admin.integrations.syncProducts(String(id)));
      setMsg('تمت مزامنة باقات المزود. يتم التحديث…');
      await load();
    } catch (e: unknown) {
      const error = e as ErrorResponse;
      setError(error?.response?.data?.message || error?.message || 'Failed to sync provider products');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 text-text-primary min-h-screen">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push('/products/api-settings')}
            className="
              p-2 rounded-lg
              bg-bg-surface border border-border
              hover:bg-bg-surface-alt
              transition-all duration-200
            "
            title="رجوع"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-text-primary">ربط الباقات مع المزود</h1>
        </div>

        {/* API Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apiInfo && (
            <div className="p-4 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔗</span>
                <h3 className="font-bold text-lg">معلومات الجهة</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">الاسم:</span>
                  <span className="font-medium">{apiInfo.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">النوع:</span>
                  <span className="px-2 py-1 rounded-md bg-primary/20 text-primary font-medium text-xs uppercase">
                    {apiInfo.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">الرصيد:</span>
                  <span className="font-bold text-success">{apiInfo.balance}</span>
                </div>
              </div>
            </div>
          )}
          
          {integrationConfig && (
            <div className="p-4 rounded-xl border border-border bg-gradient-to-br from-blue-500/5 to-blue-500/10 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⚙️</span>
                <h3 className="font-bold text-lg">إعدادات الربط</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-text-secondary block mb-1">الرابط:</span>
                  <code className="block px-2 py-1 rounded bg-bg-surface border border-border text-xs font-mono truncate">
                    {integrationConfig.baseUrl || '—'}
                  </code>
                </div>
                <div>
                  <span className="text-text-secondary block mb-1">التوكن:</span>
                  <code className="block px-2 py-1 rounded bg-bg-surface border border-border text-xs font-mono truncate">
                    {integrationConfig.apiToken || integrationConfig.kod || '—'}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Section */}
      <div className="mb-6 p-4 rounded-xl border border-border bg-bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">اختر منتجاً:</span>
            <div className="relative inline-block">
              <SearchableCombo
                value={product}
                onChange={(val) => {
                  setProduct(val);
                  applyFilter(val);
                }}
                placeholder={loadingProducts ? 'المنتجات تُحضر…' : 'إختر منتجاً'}
                options={productSuggestions}
                buttonClass="px-4 py-2 rounded-lg text-sm border border-border bg-bg-input text-text-primary pr-10 min-w-[200px] hover:border-primary/50 focus:border-primary transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">▼</span>
            </div>
          </div>

          <button
            onClick={() => void load()}
            className="
              px-4 py-2 rounded-lg font-medium text-sm
              bg-blue-600 text-white
              hover:bg-blue-700 hover:shadow-md
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              flex items-center gap-2
            "
            disabled={loading}
          >
            <span>🔄</span>
            <span>{loading ? 'يحمل...' : 'تحديث'}</span>
          </button>

          <button
            onClick={syncProviderProducts}
            className="
              px-4 py-2 rounded-lg font-medium text-sm
              bg-purple-600 text-white
              hover:bg-purple-700 hover:shadow-md
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              flex items-center gap-2
            "
            disabled={syncing || loading}
            title="Sync provider packages"
          >
            <span>⚡</span>
            <span>{syncing ? 'جاري التحديث…' : 'مزامنة باقات المزود'}</span>
          </button>

          <div className="mr-auto px-4 py-2 rounded-lg bg-gradient-to-r from-success/10 to-success/20 border border-success/30">
            <span className="text-sm">
              <span className="font-bold text-success">{mappedCount}</span>
              <span className="text-text-secondary"> / {rows.length} تم ربطهم</span>
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 flex items-center gap-3 shadow-sm">
          <span className="text-2xl">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {msg && (
        <div className="mb-4 p-4 rounded-xl border-2 border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 flex items-center gap-3 shadow-sm">
          <span className="text-2xl">✅</span>
          <span>{msg}</span>
        </div>
      )}

      {/* Table Section */}
      <div className="overflow-auto rounded-xl border border-border shadow-lg bg-bg-surface">
        <table className="min-w-full w-full text-sm">
          <thead className="bg-gradient-to-l from-primary/10 to-primary/5 border-b-2 border-primary/20">
            <tr>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">الباقات</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">رأس المال (USD)</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">سعر المزود (USD)</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">الفرق (USD)</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">باقة المزود</th>
            </tr>
          </thead>
          <tbody>
            {!loading && displayRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-5xl opacity-50">📦</span>
                    <span className="text-text-secondary text-lg">لا يوجد باقات لعرضها</span>
                  </div>
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl animate-spin">⏳</span>
                    <span className="text-text-secondary">يحمل البيانات...</span>
                  </div>
                </td>
              </tr>
            )}

            {displayRows.map((r, idx) => {
              const providerUSD = (() => {
                if (r.provider_price == null) return null;
                const val = Number(r.provider_price);
                if (!Number.isFinite(val)) return null;
                if (apiInfo?.type === 'internal') return val;
                return tryRate ? val / tryRate : null;
              })();
              const diffUSD = providerUSD != null ? providerUSD - Number(r.our_base_price) : null;
              const diffClass = diffUSD == null
                ? 'text-text-secondary'
                : diffUSD < 0
                ? 'text-green-600 dark:text-green-400 font-bold'
                : diffUSD > 0
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-text-primary';

              return (
                <tr
                  key={r.our_package_id}
                  className={`
                    transition-all duration-200
                    ${idx % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-surface-alt/30'}
                    hover:bg-primary/5 hover:shadow-sm
                    border-b border-border/30
                    ${isDummyData ? 'opacity-70' : ''}
                  `}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-text-primary">{r.our_package_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium">{Number(r.our_base_price).toFixed(2)}</span>
                    <span className="text-text-secondary text-xs ml-1">USD</span>
                  </td>
                  <td className="px-4 py-3">
                    {providerUSD == null ? (
                      <span className="text-text-secondary">—</span>
                    ) : (
                      <>
                        <span className="font-mono font-medium">{providerUSD.toFixed(2)}</span>
                        <span className="text-text-secondary text-xs ml-1">USD</span>
                      </>
                    )}
                  </td>
                  <td className={`px-4 py-3 ${diffClass}`}>
                    {diffUSD == null ? (
                      <span className="text-text-secondary">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {diffUSD < 0 && <span className="text-lg">✓</span>}
                        {diffUSD > 0 && <span className="text-lg">⚠</span>}
                        <span className="font-mono">{diffUSD.toFixed(2)} USD</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SearchableSelect
                      value={r.current_mapping}
                      onChange={(v) => {
                        if (!isDummyData) {
                          updateRowMapping(r.our_package_id, v);
                        }
                      }}
                      options={r.provider_packages.map((pp) => {
                        const hasPrice = pp.price != null && !Number.isNaN(Number(pp.price));
                        const priceStr = hasPrice ? `${Number(pp.price).toFixed(2)}${pp.currency ? ' ' + pp.currency : ''}` : '';
                        const label = hasPrice ? `${pp.name} — ${priceStr}` : pp.name;
                        return { id: String(pp.id), name: label };
                      })}
                      placeholder="— إختر باقة للربط —"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={saveAll}
          disabled={saving || loading || isDummyData}
          className="
            px-6 py-3 rounded-lg font-bold text-base
            bg-gradient-to-r from-green-600 to-green-500 text-white
            hover:from-green-700 hover:to-green-600 hover:shadow-lg
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            flex items-center gap-2
          "
          title={isDummyData ? 'لا يمكن حفظ البيانات الوهمية' : ''}
        >
          <span className="text-xl">{saving ? '⏳' : '💾'}</span>
          <span>{saving ? 'يتم الحفظ…' : 'حفظ التغييرات'}</span>
        </button>

        <button
          onClick={() => router.push('/products/api-settings')}
          className="
            px-6 py-3 rounded-lg font-medium text-base
            bg-gray-200 text-gray-700
            hover:bg-gray-300
            dark:bg-gray-700 dark:text-gray-200
            dark:hover:bg-gray-600
            transition-all duration-200
          "
        >
          رجوع
        </button>
      </div>
    </div>
  );
}
