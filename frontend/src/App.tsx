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
import Orders from "./pages/Orders";
import Pool from "./pages/Pool";
import SiteSettings from "./pages/SiteSettings";
import Accounts from "./pages/Accounts";
import PaymentTracking from "./pages/PaymentTracking";
import Reports from "./pages/Reports";
import DealerGroups from "./pages/DealerGroups";
import Store from "./pages/Store";
import Platform from "./pages/Platform";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

function BareProtected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
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
          <Route path="/store" element={<BareProtected><Store /></BareProtected>} />
          <Route path="/platform" element={<BareProtected><Platform /></BareProtected>} />

          {/* OyunPin */}
          <Route path="/oyunpin" element={<Protected><Games /></Protected>} />
          <Route path="/oyunpin/pin-list" element={<Protected><PinList /></Protected>} />
          <Route path="/oyunpin/orders" element={<Protected><Orders /></Protected>} />
          <Route path="/oyunpin/price-groups" element={<Protected><PriceGroups /></Protected>} />
          <Route path="/oyunpin/dealer-prices" element={<Protected><DealerPrices /></Protected>} />
          <Route path="/oyunpin/pool" element={<Protected><Pool /></Protected>} />
          <Route path="/oyunpin/providers" element={<Protected><Providers /></Protected>} />
          <Route path="/oyunpin/:id" element={<Protected><GameDetail /></Protected>} />

          {/* Ayarlar */}
          <Route path="/dealers" element={<Protected><Dealers /></Protected>} />
          <Route path="/ayarlar/payments" element={<Protected><PaymentTracking /></Protected>} />
          <Route path="/ayarlar/accounts" element={<Protected><Accounts /></Protected>} />
          <Route path="/ayarlar/ledger" element={P("حركات الحسابات")} />
          <Route path="/ayarlar/groups" element={<Protected><DealerGroups /></Protected>} />
          <Route path="/ayarlar/site" element={<Protected><SiteSettings /></Protected>} />
          <Route path="/ayarlar/sms" element={P("إعدادات SMS")} />

          {/* Raporlar */}
          <Route path="/reports" element={<Protected><Reports /></Protected>} />
          <Route path="/reports/profits" element={P("تقرير الأرباح")} />
          <Route path="/reports/dealers" element={P("كشف الوكلاء")} />

          <Route path="*" element={<Navigate to="/dealers" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
