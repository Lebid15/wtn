import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import AdminLayout from "./layout/AdminLayout";
import Login from "./pages/Login";
import Dealers from "./pages/Dealers";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

function Placeholder({ title }: { title: string }) {
  return <div style={{ padding: 40, fontSize: 18, color: "var(--muted)" }}>{title} — قريباً</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dealers" element={<Protected><Dealers /></Protected>} />
          <Route path="/oyunpin" element={<Protected><Placeholder title="قسم الألعاب" /></Protected>} />
          <Route path="/reports" element={<Protected><Placeholder title="التقارير" /></Protected>} />
          <Route path="*" element={<Navigate to="/dealers" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
