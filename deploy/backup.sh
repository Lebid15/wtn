#!/usr/bin/env bash
# نسخة احتياطية يومية لقاعدة البيانات.
#
# ضاعت البيانات كلّها مرّةً (2026-08-12) لأن لا نسخة كانت. والقاعدة اليوم على
# Neon ولا تُحذف بمرور الوقت — لكن خطأً في ترحيل، أو حذفَ صفٍّ بالخطأ، أو
# حساباً يُغلق، كلّها تُبقي الخطر قائماً. هذا الملف يغلقه.
#
# **ونسخةٌ لم تُجرَّب استعادتها ليست نسخة** — انظر آخر الملف.

set -euo pipefail

BACKUP_DIR="/opt/wtn-backups"
KEEP_DAYS=30
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="$BACKUP_DIR/wtn_$STAMP.sql.gz"

# رابط القاعدة من نفس ملفّ الموقع — مرجعٌ واحد لا نسختان تفترقان
set -a; . /opt/wtn/deploy/.env; set +a
: "${DATABASE_URL:?DATABASE_URL غير مضبوط في deploy/.env}"

mkdir -p "$BACKUP_DIR"

# pg_dump من صورة postgres — فلا نثبّت عميلاً على الخادم ولا نتعارض مع نسخته.
# **نسخة الأداة يجب ألّا تقلّ عن نسخة الخادم**، وإلّا رفضت العمل أصلاً
# (`server version mismatch`). Neon على 18 اليوم؛ عدّل المتغيّر إن رقّاه.
PG_IMAGE="${PG_IMAGE:-postgres:18-alpine}"

docker run --rm "$PG_IMAGE" \
	pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" \
	| gzip -9 > "$OUT.part"
mv "$OUT.part" "$OUT"     # الاسم النهائي بعد الاكتمال، فلا يبقى ملفٌّ نصفه

SIZE=$(du -h "$OUT" | cut -f1)

# ملفٌّ أصغر من 10 كيلوبايت يعني فشلاً مقنّعاً: pg_dump قد يخرج بلا خطأ
# ويكتب رأساً فارغاً. الحجم هو الفحص الوحيد الذي يمسك ذلك بلا استعادة كاملة.
if [ "$(stat -c%s "$OUT")" -lt 10240 ]; then
	echo "⚠ النسخة $OUT صغيرة جداً ($SIZE) — يُرجَّح أنها فاشلة" >&2
	exit 1
fi

find "$BACKUP_DIR" -name 'wtn_*.sql.gz' -mtime +$KEEP_DAYS -delete

echo "$(date '+%F %T') · نسخة $OUT · $SIZE"

# ─────────────────────────────────────────────────────────────────────
# الاستعادة — جرّبها **مرّةً على قاعدة تجريبية** قبل أن تحتاجها حقّاً:
#
#   gunzip -c /opt/wtn-backups/wtn_YYYY-MM-DD_HHMM.sql.gz \
#     | docker run --rm -i postgres:16-alpine psql "<رابط قاعدة فارغة>"
#
# ثم عدّ صفوف `orders` و`users` وقارنها بالحيّة. إن تطابقت فنسختك حقيقية.
# ─────────────────────────────────────────────────────────────────────
