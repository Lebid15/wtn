# deploy — نشر wtn على خادم واحد

> خادم Hetzner **CX23** · Falkenstein · Ubuntu 24.04 · `46.224.47.213`
> النطاق **wtn4.com** عبر Cloudflare (`DNS only` أثناء الإعداد).
>
> القاعدة **خارج الخادم** (Neon) عمداً: ضاعت البيانات مرّةً حين كانت رهينة
> المضيف ([info.md §1.5](../info.md))، فلا تعود رهينة هذا الخادم أيضاً.

---

## ما يعمل على الخادم

| | |
|---|---|
| `web` | الموقع كلّه — Django يقدّم الـ API والواجهة من أصل واحد |
| `caddy` | الموجّه: يصنع شهادة HTTPS **ويجدّدها وحده** |
| `bot` | بوت واتساب — كان على جهاز المالك فينام معه |
| `cron` | متابعة الطلبات كل دقيقة · نسخة احتياطية كل ليلة |

---

## أوّل مرّة

```bash
git clone https://github.com/Lebid15/wtn /opt/wtn
cd /opt/wtn

cp deploy/.env.example deploy/.env
nano deploy/.env          # املأ الأسرار الخمسة
cp deploy/.env.bot.example deploy/.env.bot
nano deploy/.env.bot

docker compose -f deploy/docker-compose.yml up -d --build
```

الشهادة تُصدَر وحدها خلال ثوانٍ من أول طلب. لا خطوة يدوية.

---

## الأسرار

| المفتاح | من أين | إن ضاع |
|---|---|---|
| `SECRET_KEY` | `openssl rand -base64 48` | تُبطَل الجلسات فقط — يُولَّد جديد |
| `DATABASE_URL` | لوحة Neon (أو Render ← Environment) | **لا يعمل شيء** |
| `INTERNAL_API_KEY` | `openssl rand -hex 32` | يتوقّف البوت (والواجهة الداخلية تُغلق 503) |
| `BOT_ENCRYPTION_KEY` | `cd bot && npm run keygen` | **تُفقد كل جلسات واتساب** — احتفظ بنسخة خارج الخادم |
| `CF_API_TOKEN` | Cloudflare ← My Profile ← API Tokens ← قالب «Edit zone DNS» | تتوقّف عناوين المتاجر الفرعية وحدها — والموقع الرئيسي يعمل. يُنشأ غيرُه ولا يضيع شيء |

`deploy/.env` و`deploy/.env.bot` **خارج المستودع** (`.gitignore`). صلاحيتهما `600`.

---

## المهامّ المجدولة

```cron
* * * * *  cd /opt/wtn && docker compose -f deploy/docker-compose.yml exec -T web python manage.py sync_orders --quiet
17 3 * * * /opt/wtn/deploy/backup.sh >> /var/log/wtn-backup.log 2>&1
```

**الأولى تغلق أقدم دَين في المشروع:** كانت متابعة الطلبات يحرّكها متصفّح
الأدمن المفتوح وحده، فمتى أُغلقت اللوحة تجمّد كل طلبٍ أكّد المزوّد استلامه.
والأمر يحمل قفل ملفّ فلا تتراكب نبضتان.

---

## التحديث

```bash
cd /opt/wtn && git pull && docker compose -f deploy/docker-compose.yml up -d --build
```

الترحيلات تعمل وحدها عند الإقلاع (`backend/start.sh`).

> **بعد كل تحديث تأكّد أن الأثر ظهر على الموقع** لا أن الدفع نجح. بقي فرع
> Render قديماً أياماً فتراكمت خمسة التزامات والموقع يعمل بكودٍ قديم ونحن
> نظنّه محدَّثاً ([info.md §0](../info.md)).

---

## عناوين المتاجر (`islam.wtn4.com`)

**لا تُفتح Cloudflare عند كل متجر جديد.** السجلّ `*.wtn4.com` والشهادة
الشاملة يغطّيان كل اسمٍ لم يُخلق بعد — فإنشاء متجرٍ صار صفّاً في القاعدة،
وعنوانه يعمل في نفس اللحظة.

| | |
|---|---|
| الشهادة | واحدة شاملة، تحقّقُها عبر DNS بـ `CF_API_TOKEN`، يجدّدها Caddy وحده |
| الموجّه | يُبنى من [caddy.Dockerfile](caddy.Dockerfile) — الصورة الرسمية بلا وحدة Cloudflare |
| كتلة المتاجر | في [stores.caddy](stores.caddy) منفصلاً — تُلحق عند الإقلاع **إن وُجد المفتاح** وحده |
| الوسيط | [backend/core/middleware.py](../backend/core/middleware.py) — يستنتج المتجر من `Host` |
| السحابة | تبقى **رمادية** (`DNS only`). البرتقالية تحتاج تحقّقاً من خطة Cloudflare للشهادة الشاملة |

**ثلاثة عناوين ليست متاجر**: `wtn4.com` و`www` و`api` — تبقى الباب العام
ولوحة المنصّة. وعنوانٌ لا متجر له يعطي صفحة «لا متجر بهذا العنوان» لا صفحة
الدخول، ومتجرٌ موقوفٌ يعطي صفحة توقّف.

**فحصُ أن الشهادة صدرت** بعد أول نشر:

```bash
# الموجّه يقول أيَّ الحالين هو فيه عند كل إقلاع:
docker compose -f deploy/docker-compose.yml logs caddy | grep "wtn:"
docker compose -f deploy/docker-compose.yml logs caddy | grep -i "certificate obtained"
curl -sI https://<أي-متجر>.wtn4.com | head -1
```

> **وبلا المفتاح لا يسقط شيء:** الموقع الرئيسي يعمل، وعناوين المتاجر وحدها
> معطّلة. وقد كانت الكتلة داخل `Caddyfile` أوّلاً فأسقطت الموقع كلَّه —
> Caddy يفحص المفتاح عند تحميل الإعداد لا عند إصدار الشهادة.
