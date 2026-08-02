"""
تطبيع أرقام الهاتف إلى الصيغة التي يفهمها واتساب.

واتساب لا يعرف «05xxxxxxxx» ولا «+90 555 …» — يريد **أرقاماً متّصلة تبدأ برمز
الدولة بلا + ولا صفر بادئ**: 905551234567. وأرقامنا يكتبها البشر بأشكال شتّى،
فالتطبيع يقع مرّةً عند الحفظ لا عند كل إرسال.
"""
import re

# رمز الاتصال لكل بلد نستعمله في «بيانات الوكيل» — مصدره قائمة البلدان في الواجهة.
DIAL_CODES = {
    "SY": "963", "TR": "90", "SA": "966", "IQ": "964", "AE": "971",
    "EG": "20", "JO": "962", "LB": "961", "DE": "49",
}

# أطوال معقولة: أقصر رقم دولي ~8 خانات وأطوله 15 (معيار E.164)
MIN_LEN, MAX_LEN = 8, 15

ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")


def normalize(raw: str, country: str = "") -> str:
    """
    يعيد الرقم بصيغة واتساب، أو "" إن تعذّر.

    - يقبل الأرقام العربية والفواصل والأقواس والشرطات ويطرحها.
    - «00» أو «+» بادئة = رقم دولي كامل، تُطرح البادئة ويُعتمد الباقي.
    - صفر بادئ = رقم محلّي، يُستبدل الصفر برمز دولة الوكيل.
    - رقم بلا صفر ولا رمز: إن كان يبدأ برمز دولة معروف قُبل كما هو،
      وإلّا أُلحق به رمز دولة الوكيل.
    """
    if not raw:
        return ""
    s = str(raw).translate(ARABIC_DIGITS).strip()
    intl = s.startswith("+") or s.startswith("00")
    digits = re.sub(r"\D", "", s)
    if not digits:
        return ""

    if intl:
        if digits.startswith("00"):
            digits = digits[2:]
    elif digits.startswith("0"):
        code = DIAL_CODES.get((country or "").upper(), "")
        if not code:
            return ""  # رقم محلّي بلا بلد معروف — لا نخمّن
        rest = digits.lstrip("0")
        # «0963944…»: كثيرون يكتبون صفراً ثم رمز الدولة. لو ألحقنا الرمز مرّةً
        # أخرى لخرج رقم مضاعف الرمز يُرسَل إلى لا أحد. فإن كان الباقي يبدأ
        # برمز دولةٍ معروف اعتبرناه دولياً كما هو.
        if any(rest.startswith(c) for c in DIAL_CODES.values()) and len(rest) >= MIN_LEN:
            digits = rest
        else:
            digits = code + rest
    elif not any(digits.startswith(c) for c in DIAL_CODES.values()):
        code = DIAL_CODES.get((country or "").upper(), "")
        if code:
            digits = code + digits

    return digits if MIN_LEN <= len(digits) <= MAX_LEN else ""


def jid(number: str) -> str:
    """معرّف واتساب لمحادثة فردية."""
    return f"{number}@s.whatsapp.net"


def pretty(number: str) -> str:
    """عرضٌ مقروء للمالك: +905551234567."""
    return f"+{number}" if number else ""
