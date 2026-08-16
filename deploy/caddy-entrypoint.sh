#!/bin/sh
# يركّب إعداد Caddy عند الإقلاع: الموقع الرئيسي دائماً، وعناوين المتاجر
# **إن وُجد مفتاح Cloudflare** وحده.
#
# ولماذا لا تُترك الكتلة مكتوبةً دائماً؟ لأن Caddy يفحص المفتاح عند **تحميل
# الإعداد** لا عند إصدار الشهادة: مفتاحٌ فارغ يُسقط الإعداد كلَّه، فيدخل
# الموجّه حلقة إعادة تشغيل ويسقط الموقع الرئيسي معه. حدث هذا فعلاً.
set -e

CONF=/run/Caddyfile
cp /etc/caddy/Caddyfile "$CONF"

if [ -n "$CF_API_TOKEN" ]; then
	cat /etc/caddy/stores.caddy >> "$CONF"
	echo "wtn: عناوين المتاجر مفعّلة — المفتاح موجود"
else
	echo "wtn: لا CF_API_TOKEN — الموقع الرئيسي يعمل، وعناوين المتاجر معطّلة"
fi

exec caddy run --config "$CONF" --adapter caddyfile
