/**
 * حجم العرض — رقمٌ واحد يكبّر الموقع كلَّه أو يصغّره.
 *
 * **لماذا رقمٌ واحد لا ثلاثة.** التصميم مرسومٌ بالبكسل: `height: 32`،
 * `fontSize: 14`، `padding: "0 16px"` — في CSS وفي أنماط React معاً. فتكبيرُ
 * الخط وحده يمدّ السطر ولا يمدّ الزرّ معه، فينكسر الصفّ وتخرج الكلمة من
 * حدّها. ولذلك يُطبَّق `zoom` على الجذر: يكبر كلُّ شيء بنفس النسبة — الخطوط
 * والأزرار والحقول والتباعد — تماماً كزوم المتصفّح.
 *
 * وقيمته من **المتجر** لا من المتصفّح: صاحب المتجر يضبطها مرّةً فيراها كلّ
 * وكلائه، ولا يُطلب من كلٍّ منهم أن يعرف أين زوم متصفّحه.
 */

export const UI_SCALE_MIN = 75;
export const UI_SCALE_MAX = 125;
export const UI_SCALE_STEP = 5;
export const UI_SCALE_DEFAULT = 100;

export function clampUiScale(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return UI_SCALE_DEFAULT;
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, v));
}

/**
 * تُطبَّق على `<html>` لا على `.app`: النوافذ المنبثقة `position: fixed`
 * وبعضُها خارج شجرة `.app`، فلو زُوِّم الوعاء وحده لبقيت هي على حجمها.
 */
export function applyUiScale(scale?: number | null): void {
  const n = scale == null ? UI_SCALE_DEFAULT : clampUiScale(scale);
  const root = document.documentElement.style;
  // من لم يغيّر الحجم لا تُكتب له خاصّية أصلاً — فلا يتغيّر شيء في سلوك صفحته
  if (n === UI_SCALE_DEFAULT) root.removeProperty("zoom");
  else root.setProperty("zoom", String(n / 100));
}
