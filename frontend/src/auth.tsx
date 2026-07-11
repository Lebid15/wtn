import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User } from "./api";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (loginId: string, password: string, totp?: string) => Promise<LoginResult>;
  logout: () => void;
}
type LoginResult = { ok: true } | { requireTotp: true } | { ok: false; error: string };

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // استعادة الجلسة عند التحميل
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return setLoading(false);
    api
      .get("/auth/me/")
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem("access"))
      .finally(() => setLoading(false));
  }, []);

  // تطبيق ثيم وخط المستأجر على الصفحة
  useEffect(() => {
    const theme = user?.tenant?.theme || "teal";
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-font", (user?.tenant as any)?.font || "cairo");
  }, [user]);

  async function login(loginId: string, password: string, totp?: string): Promise<LoginResult> {
    try {
      const r = await api.post("/auth/login/", { login_id: loginId, password, totp });
      if (r.data.require_totp) return { requireTotp: true };
      localStorage.setItem("access", r.data.tokens.access);
      localStorage.setItem("refresh", r.data.tokens.refresh);
      setUser(r.data.user);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.detail || "فشل الاتصال بالخادم" };
    }
  }

  function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
