# موجّهٌ يعرف Cloudflare.
#
# **لماذا نبني صورةً بدل `caddy:2-alpine` الجاهزة:** الشهادة الشاملة
# (`*.wtn4.com`) لا تُصدَر بتحقّق HTTP — لا يمكن أن تفتح Let's Encrypt رابطاً
# على عنوانٍ لم يُخلق بعد. تحقّقُها عبر DNS: يكتب Caddy سجلّاً مؤقّتاً في
# Cloudflare فيثبت ملكيّة النطاق. والصورة الجاهزة لا تحوي وحدة Cloudflare،
# فتردّ `unknown directive: dns` وتسقط الحاوية بلا موقع.

FROM caddy:2-builder-alpine AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
