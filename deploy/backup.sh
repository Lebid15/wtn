#!/usr/bin/env bash
# نسخة احتياطية يومية لقاعدة البيانات.
#
# ضاعت البيانات كلّها مرّةً (2026-08-12) لأن لا نسخة كانت. والقاعدة اليوم على
# الخادم نفسه (2026-08-23)، فصار هذا الملفّ هو الحارس الوحيد: خطأٌ في ترحيل،
# أو حذفُ صفٍّ بالخطأ، أو ضياعُ الخادم كلِّه.
#
# **ولذلك تُرفع النسخة خارج الخادم** (`BACKUP_REMOTE`): نسخةٌ تسكن مع قاعدتها
# على قرصٍ واحد لا تحمي من ضياع ذلك القرص.
#
# **ونسخةٌ لم تُجرَّب استعادتها ليست نسخة** — انظر آخر الملف.

set -euo pipefail

BACKUP_DIR="/opt/wtn-backups"
KEEP_DAYS=30
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="$BACKUP_DIR/wtn_$STAMP.sql.gz"
COMPOSE="/opt/wtn/deploy/docker-compose.yml"

# أسماء القاعدة من نفس ملفّ الموقع — مرجعٌ واحد لا نسختان تفترقان
set -a; . /opt/wtn/deploy/.env; set +a

mkdir -p "$BACKUP_DIR"

# `pg_dump` من داخل حاوية القاعدة نفسها: الأداة والقاعدة من صورةٍ واحدة، فلا
# يقع `server version mismatch`. وكان يقع حين كانت الأداة تُسحب صورةً منفصلة
# والقاعدة على مزوّدٍ يرقّي نفسه متى شاء.
docker compose -f "$COMPOSE" exec -T db \
	pg_dump --no-owner --no-privileges --format=plain \
		-U "${POSTGRES_USER:-wtn}" "${POSTGRES_DB:-wtn}" \
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

# ── خارج الخادم ──────────────────────────────────────────────────────
# `BACKUP_REMOTE` وجهةُ rsync (مثلاً `u123456@u123456.your-storagebox.de:wtn/`).
# وغيابُه يصرخ في السجلّ ولا يسكت: نسخةٌ على قرص القاعدة نفسها تحمي من الخطأ
# البشري وحده، لا من ضياع الخادم.
if [ -n "${BACKUP_REMOTE:-}" ]; then
	rsync -e "ssh -p ${BACKUP_REMOTE_PORT:-23} -o StrictHostKeyChecking=accept-new" \
		"$OUT" "$BACKUP_REMOTE" && echo "↗ رُفعت خارج الخادم"
else
	echo "⚠ BACKUP_REMOTE غير مضبوط — النسخة على الخادم وحده، فضياعُه يمحوها معه" >&2
fi

echo "$(date '+%F %T') · نسخة $OUT · $SIZE"

# ─────────────────────────────────────────────────────────────────────
# الاستعادة — جرّبها **مرّةً على قاعدة تجريبية** قبل أن تحتاجها حقّاً:
#
#   gunzip -c /opt/wtn-backups/wtn_YYYY-MM-DD_HHMM.sql.gz \
#     | docker compose -f /opt/wtn/deploy/docker-compose.yml exec -T db \
#         psql -U wtn -d wtn
#
# ثم عدّ صفوف `orders` و`users` وقارنها بالحيّة. إن تطابقت فنسختك حقيقية.
# ─────────────────────────────────────────────────────────────────────
