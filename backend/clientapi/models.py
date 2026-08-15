"""
توكن الوكيل — مفتاحه لواجهتنا الخارجية.

**لماذا يُحفظ نصّاً لا بصمةً:** الوكيل يرى توكنه في صفحته متى شاء ويعطيه
لمبرمجه، كما تفعل ZDK تماماً. حفظ بصمة (hash) كان يعني عرضه مرّةً واحدة عند
التوليد ثم ضياعه — سلوك يخالف ما ينتظره السوق ويولّد توكناً جديداً كل مرّة
يُنسى فيها. المقابل: من يقرأ قاعدتنا يقرأ التوكنات، وهو من يقرأ كلمات السرّ
المشفّرة والأرصدة أصلاً.

**التوليد يُبطل القديم فوراً** (سجلّ واحد لكل وكيل)، فهو زرّ الطوارئ عند التسريب.
"""
import secrets

from django.db import models

from core.models import User


def generate_token() -> str:
    """43 محرفاً من `secrets` — عشوائية تشفيرية، لا `random`."""
    return secrets.token_urlsafe(32)


class ApiToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="api_token")
    token = models.CharField(max_length=64, unique=True, db_index=True, default=generate_token)
    created_at = models.DateTimeField(auto_now_add=True)
    # آخر استعمال — يراه الوكيل ليعرف أن ربطه حيّ. يُكتب مرّة كل دقيقة على
    # الأكثر (انظر auth.py) فلا يصير كل نداء كتابةً في القاعدة.
    last_used_at = models.DateTimeField(null=True, blank=True)
    calls = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "api_tokens"

    def __str__(self):
        return f"توكن {self.user.login_id}"
