import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import AdminLayout from "./layout/AdminLayout";
import Login from "./pages/Login";
import Dealers from "./pages/Dealers";
import Games from "./pages/Games";
import GameDetail from "./pages/GameDetail";
import PinList from "./pages/PinList";
import PriceGroups from "./pages/PriceGroups";
import DealerPrices from "./pages/DealerPrices";
import Providers from "./pages/Providers";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

function Placeholder({ title }: { title: string }) {
  return <div style={{ padding: 40, fontSize: 18, color: "var(--muted)" }}>{title} — قريباً</div>;
}
const P = (title: string) => <Protected><Placeholder title={title} /></Protected>;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* OyunPin */}
          <Route path="/oyunpin" element={<Protected><Games /></Protected>} />
          <Route path="/oyunpin/pin-list" element={<Protected><PinList /></Protected>} />
          <Route path="/oyunpin/orders" element={P("متابعة الطلبات")} />
          <Route path="/oyunpin/price-groups" element={<Protected><PriceGroups /></Protected>} />
          <Route path="/oyunpin/dealer-prices" element={<Protected><DealerPrices /></Protected>} />
          <Route path="/oyunpin/pool" element={P("بنك البينات")} />
          <Route path="/oyunpin/providers" element={<Protected><Providers /></Protected>} />
          <Route path="/oyunpin/:id" element={<Protected><GameDetail /></Protected>} />

          {/* Ayarlar */}
          <Route path="/dealers" element={<Protected><Dealers /></Protected>} />
          <Route path="/ayarlar/payments" element={P("متابعة الدفع")} />
          <Route path="/ayarlar/accounts" element={P("حساباتي")} />
          <Route path="/ayarlar/ledger" element={P("حركات الحسابات")} />
          <Route path="/ayarlar/groups" element={P("مجموعات الوكلاء")} />
          <Route path="/ayarlar/site" element={P("إعدادات الموقع")} />
          <Route path="/ayarlar/sms" element={P("إعدادات SMS")} />

          {/* Raporlar */}
          <Route path="/reports" element={P("تقرير الطلبات")} />
          <Route path="/reports/profits" element={P("تقرير الأرباح")} />
          <Route path="/reports/dealers" element={P("كشف الوكلاء")} />

          <Route path="*" element={<Navigate to="/dealers" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
