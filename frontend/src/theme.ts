// تطبيق تخصيص المظهر (لوحة التخصيص) على متغيّرات CSS — لكل متجر إعداداته.
export interface ThemeConfig {
  mode?: "light" | "dark";
  primary?: string;
  primary_strong?: string;
  th_bg?: string;
  th_ink?: string;
  announce?: string;
  btn_radius?: string;   // "3px" | "10px" | "999px"
  radius?: string;       // "0".."22" (px)
  font?: string;
  fs?: string;           // "14px" | "16px" | "17px"
  show_announce?: boolean;
  show_ticker?: boolean;
  row_sep?: boolean;
}

export const THEME_DEFAULTS: Required<ThemeConfig> = {
  mode: "light",
  primary: "#3a6b73",
  primary_strong: "#2b545b",
  th_bg: "",       // فارغ = يتبع الثيم (surface-2)
  th_ink: "",
  announce: "#3f8f86",
  btn_radius: "8px",
  radius: "14",
  font: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif',
  fs: "16px",
  show_announce: true,
  show_ticker: true,
  row_sep: true,
};

const VAR_MAP: [keyof ThemeConfig, string][] = [
  ["primary", "--primary"],
  ["primary_strong", "--primary-dark"],
  ["th_bg", "--th-bg"],
  ["th_ink", "--th-ink"],
  ["announce", "--announce"],
  ["btn_radius", "--btn-radius"],
  ["font", "--font"],
  ["fs", "--fs"],
];

export function applyThemeConfig(cfg: ThemeConfig) {
  const root = document.documentElement;
  const c = { ...THEME_DEFAULTS, ...cfg };
  root.setAttribute("data-mode", c.mode);
  for (const [key, cssVar] of VAR_MAP) {
    const v = c[key] as string;
    if (v) root.style.setProperty(cssVar, v);
    else root.style.removeProperty(cssVar);
  }
  // مشتقّات
  root.style.setProperty("--primary-soft", c.primary_strong || c.primary);
  root.style.setProperty("--tab-active-text", c.primary_strong || c.primary);
  root.style.setProperty("--announce-2", c.announce);
  root.style.setProperty("--radius", `${c.radius}px`);
  if (!c.row_sep) root.style.setProperty("--row-sep", "var(--border)");
  else root.style.removeProperty("--row-sep");
}
