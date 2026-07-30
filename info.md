# info — معلومات النشر والوصول

> ملف مرجعي سريع: **أين الموقع مرفوع** · **كيف نرفعه ونحدّثه** · **حسابات الاختبار**.

---

## 1. أين الموقع مرفوع

| البند | القيمة |
|------|--------|
| **الاستضافة** | [Render](https://render.com) — خطة **Free** |
| **الرابط المباشر** | <https://wtn.onrender.com> |
| **المستودع** | `https://github.com/Lebid15/wtn` |
| **الفرع المنشور** | `claude/website-clone-auth-access-xp4oj8` |
| **اسم الخدمة على Render** | `wtn` (نوع: Web Service · Docker) |
| **قاعدة البيانات** | `wtn-db` — PostgreSQL خطة Free |
| **طريقة الإعداد** | Render **Blueprint** يقرأ ملف [render.yaml](render.yaml) تلقائياً |

**البنية على الاستضافة:** خدمة **واحدة** فقط — Django يقدّم الـ API *و* واجهة
React المبنية من نفس الأصل (same-origin)، فلا حاجة إلى CORS ولا إلى استضافة
منفصلة للواجهة.

---

## 2. طريقة الرفع (أول مرة — تمّت بالفعل)

الملفات الجاهزة في المستودع: [Dockerfile](Dockerfile) · [render.yaml](render.yaml) ·
[backend/start.sh](backend/start.sh) · [docs/DEPLOY.md](docs/DEPLOY.md).

1. الدخول إلى <https://render.com> والتسجيل بحساب **GitHub** (مجاني).
2. من اللوحة: **New → Blueprint**.
3. اختيار مستودع `Lebid15/wtn` والفرع `claude/website-clone-auth-access-xp4oj8`.
4. الضغط على **Apply** — يقرأ Render ملف `render.yaml` وينشئ تلقائياً:
   - قاعدة `wtn-db` (PostgreSQL · free).
   - خدمة الويب `wtn` (Docker · free) — تبني الواجهة ثم الخلفية.
5. أول إقلاع يشغّل الترحيلات (`migrate`) ويزرع البيانات التجريبية.
6. بعد ~3–5 دقائق يصبح الرابط `https://wtn.onrender.com` جاهزاً.

### متغيّرات البيئة
مضبوطة كلها داخل `render.yaml` — **لا يوجد ضبط يدوي**:

| المتغيّر | المصدر |
|---------|--------|
| `SECRET_KEY` | يولّده Render تلقائياً (`generateValue`) |
| `DEBUG` | `"0"` |
| `ALLOWED_HOSTS` | `"*"` |
| `DB_HOST` · `DB_PORT` · `DB_NAME` · `DB_USER` · `DB_PASSWORD` | تُسحب من قاعدة `wtn-db` |

---

## 3. طريقة التحديث (كل مرة لاحقاً)

النشر **تلقائي**: أي دفعة إلى الفرع المنشور تُطلق بناءً جديداً على Render.

```bash
git add -A
git commit -m "وصف التغيير"
git push origin claude/website-clone-auth-access-xp4oj8
```

ثم تُتابَع حالة البناء من Render Dashboard → خدمة `wtn` → **Logs**
(البناء ~3–5 دقائق). يمكن أيضاً إعادة النشر يدوياً من **Manual Deploy**.

### ماذا يحدث في كل نشر
1. **Docker مرحلة 1:** `npm ci` ثم `npm run build` للواجهة (Vite) —
   ملف `.env.production` يضبط `VITE_API_URL=/api`.
2. **Docker مرحلة 2:** تثبيت `backend/requirements.txt` + نسخ `frontend/dist`
   إلى `/app/frontend_dist` (يقدّمها WhiteNoise مع SPA fallback) + `collectstatic`.
3. **`backend/start.sh`:** `migrate` → بذور متسامحة (`seed_demo` · `seed_library` ·
   `seed_auto` · `seed_routing_test` تعمل في كل نشر · بذور الكتالوج الثقيلة
   مرّة واحدة فقط عند قاعدة فارغة) → تشغيل `gunicorn` بعاملين.

---

## 4. حسابات الاختبار

| الدور | اسم الدخول | كلمة السر | لوحته |
|------|-----------|-----------|-------|
| مالك المنصّة (`platform_owner`) | `9990000000` | `super123` | `/platform` |
| صاحب المتجر (`tenant_admin`) | `5550000007` | `admin123` | لوحة الإدارة (`/dealers` …) |
| وكيل كبير (`ana_bayi`) | `5552222222` | `big123` | `/bigagent` |
| وكيل (`bayi`) | `bayi003` | `bayi123` | `/store` |

> العميل النهائي بلا حساب. تفاصيل الأدوار في [docs/ROLES.md](docs/ROLES.md).

---

## 5. ملاحظات وقيود مهمّة

- ⏱ **الخطة المجانية تنام** بعد ~15 دقيقة خمول. أوّل فتح بعد النوم يستغرق
  ~دقيقة (إقلاع بارد) ثم يعمل بسرعته الطبيعية.
- ⚠ **قاعدة البيانات المجانية صالحة ~90 يوماً** من تاريخ إنشائها، ثم تُحذف.
  يلزم أخذ نسخة احتياطية أو إنشاء قاعدة جديدة قبل انتهاء المدة.
- 🔄 **تنبيه للنسخة المحلية:** قد يكون مجلد `d:\wtn` متأخّراً عن الفرع المنشور.
  للتحقّق والمزامنة:
  ```bash
  git fetch origin
  git log --oneline HEAD..origin/claude/website-clone-auth-access-xp4oj8
  git pull origin claude/website-clone-auth-access-xp4oj8
  ```

---

## 6. التشغيل محلياً

**وضع التطوير** (خادمان منفصلان):
```bash
bash scripts/dev.sh          # ثم افتح http://localhost:5173
```

**وضع مطابق للإنتاج** (خادم واحد يقدّم الواجهة والـ API):
```bash
cd frontend && npm run build
cd ../backend && FRONTEND_DIST=../frontend/dist DEBUG=0 \
  venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8000
```

---

## 7. ملفات ذات صلة

| الملف | المحتوى |
|------|---------|
| [docs/DEPLOY.md](docs/DEPLOY.md) | دليل النشر الأصلي المفصّل |
| [docs/START_HERE.md](docs/START_HERE.md) | توجيه أي جلسة جديدة — نظرة شاملة |
| [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) | ما تبقّى من خطوات |
| [plan.md](plan.md) | الخطة القادمة (قيد النقاش) |
| [docs/ROLES.md](docs/ROLES.md) | الأدوار الأربعة |
| [docs/BUILD_LOG.md](docs/BUILD_LOG.md) | سجلّ البناء خطوة بخطوة |
