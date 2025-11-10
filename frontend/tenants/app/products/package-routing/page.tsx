'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import api, { API_ROUTES } from '@/utils/api';

const CODES_ID = '__CODES__';

type Provider = { id: string; name: string; type: string };
type CodeGroup = { id: string; name: string };

type RoutingItem = {
  packageId: string;
  publicCode: string | null;
  productName: string;
  packageName: string;
  basePrice: number;
  routing: {
    mode: 'manual' | 'auto';
    primaryProviderId: string | null;
    fallbackProviderId: string | null;
    providerType: 'manual' | 'external' | 'internal_codes';
    codeGroupId: string | null;
  };
  providers: Array<{
    providerId: string;
    providerName: string;
    costCurrency: string;
    costAmount: number;
  }>;
};

// العملات (لسحب سعر الصرف والرموز)
type Currency = {
  id: string;
  code: string;      // USD, TRY, ...
  name: string;
  rate: number;      // بالنسبة للدولار: قد تكون "ليرات لكل $1" (مثل 41) أو "دولارات لكل 1 ليرة" (مثل 0.024)
  isActive: boolean;
  isPrimary: boolean;
  symbolAr?: string; // مثل "$" أو "₺"
};

function ProvidersPricesCell({ providers, highlightProviderId }: { providers: RoutingItem['providers']; highlightProviderId?: string | null; }) {
  // يعرض الأسعار داخل قائمة منسدلة ويُظهر في الزر السعر الحالي للمزوّد المختار.
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!open || !ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hasProviders = Array.isArray(providers) && providers.length > 0;

  const formatAmount = (amount: number) =>
    Number.isFinite(amount)
      ? Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : 'N/A';

  if (!hasProviders) {
    return <span className="text-xs text-text-secondary">لا توجد أسعار</span>;
  }

  const selectedProvider = providers.find((provider) => provider.providerId === highlightProviderId) || providers[0];
  const selectedProviderId = selectedProvider?.providerId ?? null;
  const othersCount = Math.max(providers.length - (selectedProvider ? 1 : 0), 0);
  const selectedLabel = selectedProvider
    ? `${selectedProvider.providerName}: ${formatAmount(selectedProvider.costAmount)} ${selectedProvider.costCurrency || ''}`.trim()
    : 'عرض الأسعار';
  const buttonLabel = othersCount > 0 ? `${selectedLabel} (+${othersCount})` : selectedLabel;

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        className="
          px-3 py-1.5 rounded-lg font-medium text-xs
          bg-blue-600 text-white
          hover:bg-blue-700 hover:shadow-md
          transition-all duration-200
          flex items-center gap-2
        "
        onClick={() => setOpen((v) => !v)}
      >
        <span>{buttonLabel}</span>
        <span className="text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-72 origin-top-left rounded-lg border border-border bg-bg-surface shadow-2xl">
          <ul className="max-h-72 overflow-auto py-1">
            {providers.map((provider) => {
              const isActive = provider.providerId === selectedProviderId;
              return (
                <li
                  key={provider.providerId}
                  className={`
                    px-4 py-2.5
                    transition-colors duration-150
                    ${isActive 
                      ? 'bg-primary/15 border-r-2 border-primary' 
                      : 'hover:bg-primary/5'
                    }
                  `}
                >
                  <div className={`text-sm ${isActive ? 'font-semibold text-primary' : 'font-medium text-text-primary'}`}>
                    {provider.providerName}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {formatAmount(provider.costAmount)} {provider.costCurrency || ''}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* =============== ComboBox صغير ببحث داخلي =============== */
function ProductFilterCombo({
  value,
  onChange,
  options,
}: {
  value: 'ALL' | string;
  onChange: (v: 'ALL' | string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const shown = useMemo(() => {
    const list = ['ALL', ...options];
    const s = q.trim().toLowerCase();
    return s ? list.filter((n) => (n === 'ALL' ? true : n.toLowerCase().includes(s))) : list;
  }, [options, q]);

  const label = value === 'ALL' ? 'الكل' : value;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(t)) {
        const panel = document.getElementById('product-filter-panel');
        if (panel && !panel.contains(t)) setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        className="
          w-64 px-4 py-2 rounded-lg
          bg-bg-input border border-border
          text-text-primary
          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
          transition-all duration-200
          flex items-center justify-between text-right
        "
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate font-medium">{label || 'اختر منتجًا'}</span>
        <span className="text-xs">▾</span>
      </button>

      {open && (
        <div
          id="product-filter-panel"
          className="absolute z-50 mt-1 w-64 rounded-lg border border-border bg-bg-surface shadow-2xl"
        >
          <div className="p-2 border-b border-border">
            <input
              className="
                w-full px-3 py-2 rounded-lg
                bg-bg-input border border-border
                text-text-primary placeholder:text-text-secondary
                focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                transition-all duration-200
                text-sm
              "
              placeholder="ابحث داخل القائمة..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-auto py-1">
            {shown.map((name) => (
              <div
                key={name}
                className={`
                  px-4 py-2.5 cursor-pointer
                  transition-colors duration-150
                  ${value === name 
                    ? 'bg-primary/15 font-semibold text-primary border-r-2 border-primary' 
                    : 'text-text-primary hover:bg-primary/5'
                  }
                `}
                onClick={() => {
                  onChange(name as any);
                  setOpen(false);
                }}
              >
                {name === 'ALL' ? 'الكل' : name}
              </div>
            ))}
            {shown.length === 0 && (
              <div className="px-4 py-4 text-sm text-text-secondary text-center">
                <span className="text-2xl mb-2 block opacity-50">🔍</span>
                لا نتائج
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================== الصفحة ========================== */
export default function PackagesRoutingPage() {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([
    { id: 'provider-a', name: 'Provider A', type: 'external' },
    { id: 'provider-b', name: 'Provider B', type: 'external' },
  ]);
  const [codeGroups, setCodeGroups] = useState<CodeGroup[]>([
    { id: 'codes-1', name: 'مجموعة أكواد 1' },
  ]);
  
  // بيانات وهمية للتجربة
  const dummyRows: RoutingItem[] = [
    {
      packageId: 'pkg-1',
      publicCode: 'PUBG-60UC',
      productName: 'PUBG',
      packageName: 'PUBG 60 UC',
      basePrice: 5.99,
      routing: {
        mode: 'auto',
        primaryProviderId: 'provider-a',
        fallbackProviderId: null,
        providerType: 'external',
        codeGroupId: null,
      },
      providers: [
        { providerId: 'provider-a', providerName: 'Provider A', costCurrency: 'USD', costAmount: 5.50 },
        { providerId: 'provider-b', providerName: 'Provider B', costCurrency: 'USD', costAmount: 5.75 },
      ],
    },
    {
      packageId: 'pkg-2',
      publicCode: 'FF-100D',
      productName: 'Free Fire',
      packageName: 'Free Fire 100 Diamonds',
      basePrice: 3.99,
      routing: {
        mode: 'manual',
        primaryProviderId: null,
        fallbackProviderId: null,
        providerType: 'manual',
        codeGroupId: null,
      },
      providers: [
        { providerId: 'provider-a', providerName: 'Provider A', costCurrency: 'USD', costAmount: 3.50 },
        { providerId: 'provider-b', providerName: 'Provider B', costCurrency: 'USD', costAmount: 3.75 },
      ],
    },
  ];

  const [rows, setRows] = useState<RoutingItem[]>(dummyRows);
  const [selected, setSelected] = useState< Record<string, boolean> >({});
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<string>('');

  // العملات
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // فلتر المنتجات (قائمة منسدلة ببحث داخلي)
  const [productFilter, setProductFilter] = useState<'ALL' | string>('ALL');

  const load = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await api.get(API_ROUTES.admin.integrations.routingAll(q)) as any;
      const data = res.data || {};
      const loadedProviders = data.providers || [];
      const loadedCodeGroups = data.codeGroups || [];
      const loadedItems = data.items || [];
      
      // إذا لم تأتِ بيانات من السيرفر، نبقي على البيانات الوهمية
      if (loadedProviders.length > 0) setProviders(loadedProviders);
      if (loadedCodeGroups.length > 0) setCodeGroups(loadedCodeGroups);
      if (loadedItems.length > 0) setRows(loadedItems);
    } catch (e: any) {
      // في حالة الخطأ، نبقي على البيانات الوهمية
      setMsg(e?.response?.data?.message || e?.message || 'Failed to load routing');
    } finally {
      setLoading(false);
    }
  };

  // تحميل البيانات الأساسية
  useEffect(() => {
    // لا نقوم بتحميل البيانات تلقائياً، نبقي على البيانات الوهمية
    // load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تحميل العملات (سعر صرف TRY والرموز)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(API_ROUTES?.currencies?.base ?? '/currencies') as any;
        const list = Array.isArray(res.data) ? res.data : [];
        setCurrencies(list as Currency[]);
      } catch {
        // لو فشل، نخلي fallback لاحقاً
      }
    })();
  }, []);

  // رموز وأرقام التحويل
  const usdSymbol = useMemo(
    () => (currencies.find(c => c.code === 'USD')?.symbolAr ?? '$'),
    [currencies]
  );
  const tryMeta = useMemo(() => {
    const c = currencies.find(x => x.code === 'TRY');
    const raw = Number(c?.rate) || 1;
    // إن كانت القيمة كبيرة (>=5) أعتبرها "ليرات لكل 1$" → نضرب مباشرة
    // وإن كانت صغيرة (<5) أعتبرها "دولارات لكل 1 ليرة" → نعكسها
    const factor = raw >= 5 ? raw : (raw > 0 ? 1 / raw : 1);
    return {
      factor,
      symbol: c?.symbolAr ?? '₺',
    };
  }, [currencies]);

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selected[r.packageId]),
    [rows, selected],
  );

  const toggleAll = () => {
    if (allSelected) setSelected({});
    else {
      const obj: Record<string, boolean> = {};
      rows.forEach((r) => (obj[r.packageId] = true));
      setSelected(obj);
    }
  };

  const toggleOne = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  // خيارات نوع التوجيه: Manual + مزودين + قسم الأكواد
  const providerOptions = [
    { id: '', name: 'Manual', type: 'manual' as any, price: null },
    ...providers.map(p => ({
      ...p,
      name: p.name === 'Provider A' ? 'Provider A - $5.50' : p.name === 'Provider B' ? 'Provider B - $5.75' : p.name,
      price: p.name === 'Provider A' ? 5.50 : p.name === 'Provider B' ? 5.75 : null,
    })),
    { id: CODES_ID, name: 'أكواد - $5.25', type: 'internal_codes' as any, price: 5.25 },
  ];

  const handleChangeProvider = async (
    pkgId: string,
    which: 'primary' | 'fallback',
    providerId: string, // '' = Manual, CODES_ID = الأكواد
  ) => {
    setMsg('');

    // الأكواد الرقمية
    if (providerId === CODES_ID) {
      setRows(arr =>
        arr.map(r =>
          r.packageId === pkgId
            ? {
                ...r,
                routing: {
                  ...r.routing,
                  providerType: 'internal_codes',
                  mode: 'auto',
                  primaryProviderId: null,
                  fallbackProviderId: null,
                } as any,
              }
            : r
        )
      );

      try {
        await api.post(API_ROUTES.admin.integrations.routingSetType, {
          packageId: pkgId,
          providerType: 'internal_codes',
        });
        setMsg('تم التحويل إلى الأكواد الرقمية.');
      } catch (e: any) {
        setMsg(e?.response?.data?.message || e?.message || 'تعذر التحويل إلى الأكواد');
      }
      return;
    }

    // Manual
    if (!providerId) {
      setRows(arr =>
        arr.map(r =>
          r.packageId === pkgId
            ? {
                ...r,
                routing: {
                  ...r.routing,
                  providerType: 'manual',
                  mode: 'manual',
                  [`${which}ProviderId`]: null,
                } as any,
              }
            : r
        )
      );

      try {
        await api.post(API_ROUTES.admin.integrations.routingSetType, {
          packageId: pkgId,
          providerType: 'manual',
        });
        await api.post(API_ROUTES.admin.integrations.routingSet, {
          packageId: pkgId,
          which,
          providerId: null,
        });
        setMsg('تم الحفظ (وضع Manual).');
      } catch (e: any) {
        setMsg(e?.response?.data?.message || e?.message || 'تعذر الحفظ');
      }
      return;
    }

    // مزوّد خارجي
    setRows(arr =>
      arr.map(r => {
        if (r.packageId !== pkgId) return r;
        const next = {
          ...r,
          routing: {
            ...r.routing,
            providerType: 'external',
            mode: 'auto',
            [`${which}ProviderId`]: providerId,
          } as any,
        };
        // إن كان الذي اخترته كـ API1 يساوي الموجود في API2، نظّف API2
        if (which === 'primary' && next.routing.fallbackProviderId === providerId) {
          next.routing.fallbackProviderId = null;
        }
        return next;
      })
    );

    try {
      await api.post(API_ROUTES.admin.integrations.routingSetType, {
        packageId: pkgId,
        providerType: 'external',
      });

      await api.post(API_ROUTES.admin.integrations.routingSet, {
        packageId: pkgId,
        which,
        providerId,
      });

      const res = await api.post<{ mapped?: boolean; cost?: { amount: number; currency: string }; message?: string }>(
        API_ROUTES.admin.integrations.providerCost,
        { packageId: pkgId, providerId },
      );
      const payload = res?.data;

      if (payload?.mapped) {
        setRows(arr =>
          arr.map(r => {
            if (r.packageId !== pkgId) return r;
            const nextProviders = r.providers.map(p =>
              p.providerId === providerId
                ? {
                    ...p,
                    costAmount: payload?.cost?.amount ?? p.costAmount,
                    costCurrency: payload?.cost?.currency ?? p.costCurrency,
                  }
                : p
            );
            return { ...r, providers: nextProviders };
          })
        );
        setMsg('تم الحفظ وتحديث تكلفة المزوّد.');
      } else {
        setMsg(payload?.message || 'لا يوجد ربط لهذه الباقة مع هذا المزوّد.');
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e?.message || 'تعذر الحفظ');
    }
  };

  // حفظ مجموعة الأكواد
  const handleChangeCodeGroup = async (pkgId: string, codeGroupId: string) => {
    // حدّث الواجهة
    setRows(arr => arr.map(r => r.packageId === pkgId ? ({
      ...r,
      routing: { ...r.routing, providerType: 'internal_codes', codeGroupId, mode: codeGroupId ? 'auto' : 'manual', primaryProviderId: null, fallbackProviderId: null }
    }) : r));

    setMsg('');
    try {
      await api.post(API_ROUTES.admin.integrations.routingSetCodeGroup, {
        packageId: pkgId,
        codeGroupId: codeGroupId || null,
      });
      setMsg(codeGroupId ? 'تم اختيار مجموعة الأكواد وتفعيل التوجيه الداخلي.' : 'تم إلغاء مجموعة الأكواد (عاد Manual).');
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e?.message || 'تعذر حفظ مجموعة الأكواد');
    }
  };

  const applyFilter = async () => { await load(); };

  // قائمة المنتجات الفريدة (بدون تكرار)
  const productNames = useMemo(() => {
    const setNames = new Set<string>();
    rows.forEach(r => { if (r.productName) setNames.add(r.productName); });
    return Array.from(setNames.values()).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [rows]);

  // صفوف الجدول بعد تطبيق فلتر المنتج
  const visibleRows = useMemo(() => {
    if (productFilter === 'ALL') return rows;
    return rows.filter(r => r.productName === productFilter);
  }, [rows, productFilter]);

  return (
    <div className="p-4 md:p-6 text-text-primary min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔀</span>
          <h1 className="text-xl font-bold text-text-primary">توجيه الباقات</h1>
        </div>
        <button 
          onClick={load} 
          disabled={loading}
          className="
            px-4 py-2 rounded-lg font-medium text-sm
            bg-blue-600 text-white
            hover:bg-blue-700 hover:shadow-md
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            flex items-center gap-2
          "
        >
          <span>{loading ? '⏳' : '🔄'}</span>
          <span>{loading ? 'جارٍ التحميل...' : 'تحديث'}</span>
        </button>
      </div>

      {/* شريط البحث والفلاتر */}
      <div className="mb-6 p-4 rounded-xl border border-border bg-bg-surface shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-primary">فلتر المنتج:</span>
            <ProductFilterCombo
              value={productFilter}
              onChange={setProductFilter}
              options={productNames}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث باسم المنتج أو الباقة..."
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
              onClick={applyFilter}
              className="
                px-4 py-2 rounded-lg font-medium text-sm
                bg-primary text-primary-contrast
                hover:bg-primary/90 hover:shadow-md
                transition-all duration-200
                flex items-center gap-2 whitespace-nowrap
              "
            >
              <span>🔍</span>
              <span>بحث</span>
            </button>
          </div>
        </div>
      </div>

      {/* رسالة النتيجة */}
      {msg && (
        <div className="mb-6 p-4 rounded-xl border border-primary/30 bg-primary/10">
          <div className="flex items-start gap-2 text-text-primary">
            <span>ℹ️</span>
            <span className="text-sm font-medium">{msg}</span>
          </div>
        </div>
      )}

      {/* الجدول */}
      <div className="overflow-auto rounded-xl border border-border shadow-lg bg-bg-surface">
        <table className="min-w-full w-full text-sm">
          <thead className="bg-gradient-to-l from-primary/10 to-primary/5 border-b-2 border-primary/20">
            <tr>
              <th className="px-4 py-4 font-bold text-text-primary text-center whitespace-nowrap w-10">
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-border cursor-pointer"
                />
              </th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">المنتج</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">اسم الباقة</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">رأس المال</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">التوجيه</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">API 2 (احتياطي)</th>
              <th className="px-4 py-4 font-bold text-text-primary text-right whitespace-nowrap">مجموعة الأكواد</th>
            </tr>
          </thead>
          <tbody>
            {!loading && visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-5xl opacity-50">📭</span>
                    <span className="text-text-secondary text-lg">لا توجد باقات</span>
                  </div>
                </td>
              </tr>
            )}

            {visibleRows.map((r) => {
              // التحقق من وجود routing وإنشاء واحد افتراضي إذا لم يكن موجوداً
              if (!r.routing) {
                r.routing = {
                  mode: 'manual',
                  primaryProviderId: null,
                  fallbackProviderId: null,
                  providerType: 'manual',
                  codeGroupId: null,
                };
              }

              const isCodes = r.routing.providerType === 'internal_codes';

              const usdValue = Number.isFinite(r.basePrice) ? r.basePrice : 0;
              const tryValue = usdValue * (Number.isFinite(tryMeta.factor) ? tryMeta.factor : 1);

              // 👇 توليد خيارات API 2 حسب القاعدة:
              // - إن لم يكن primary خارجي ⇒ خيار واحد "مقفل".
              // - إن كان primary خارجي ⇒ "مقفل" + كل المزوّدين الآخرين (بدون الأكواد/Manual).
              const api2Options = r.routing.providerType !== 'external'
                ? [{ id: '', name: '— مقفل —' }]
                : [
                    { id: '', name: '— مقفل —' },
                    ...providers
                      .filter(p =>
                        p.id &&
                        p.id !== r.routing.primaryProviderId &&   // استبعاد API1
                        p.id !== CODES_ID                          // لا للأكواد
                      )
                      .map(p => ({ id: p.id, name: p.name })),
                  ];

              return (
                <tr 
                  key={r.packageId} 
                  className="
                    transition-all duration-200
                    bg-bg-surface
                    hover:bg-primary/5 hover:shadow-sm
                    border-b border-border/30
                  "
                >
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      checked={!!selected[r.packageId]} 
                      onChange={() => toggleOne(r.packageId)}
                      className="w-4 h-4 rounded border-border cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-3 font-semibold text-text-primary">{r.productName}</td>
                  <td className="px-4 py-3 font-medium text-text-primary">{r.packageName}</td>

                  {/* رأس المال: بالدولار فقط */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-text-primary">
                      {usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {usdSymbol}
                    </div>
                  </td>

                  {/* التوجيه الأساسي (Manual / External / Codes) */}
                  <td className="px-4 py-3">
                    <select
                      className="
                        w-full px-3 py-2 rounded-lg
                        bg-bg-input border border-border
                        text-text-primary text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                        transition-all duration-200
                      "
                      value={
                        r.routing.providerType === 'internal_codes'
                          ? CODES_ID
                          : (r.routing.primaryProviderId ?? '')
                      }
                      onChange={(e) => handleChangeProvider(r.packageId, 'primary', e.target.value)}
                    >
                      {providerOptions.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* الاحتياطي — يعمل حسب القاعدة أعلاه */}
                  <td className="px-4 py-3">
                    <select
                      className="
                        w-full px-3 py-2 rounded-lg
                        bg-bg-input border border-border
                        text-text-primary text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                      "
                      disabled={r.routing.providerType !== 'external'}
                      value={r.routing.fallbackProviderId ?? ''}
                      onChange={(e) => handleChangeProvider(r.packageId, 'fallback', e.target.value)}
                    >
                      {api2Options.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* اختيار مجموعة الأكواد - يظهر فقط عند internal_codes */}
                  <td className="px-4 py-3">
                    <select
                      className="
                        w-full px-3 py-2 rounded-lg
                        bg-bg-input border border-border
                        text-text-primary text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                      "
                      disabled={!isCodes}
                      value={r.routing.codeGroupId ?? ''}
                      onChange={(e) => handleChangeCodeGroup(r.packageId, e.target.value)}
                    >
                      <option value="">— اختر مجموعة —</option>
                      {codeGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    {isCodes && !r.routing.codeGroupId && (
                      <div className="text-xs text-text-secondary mt-1">اختر مجموعة لتفعيل التوجيه الداخلي تلقائيًا.</div>
                    )}
                  </td>
                </tr>
              );
            })}

            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-text-secondary">يحمل..</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
