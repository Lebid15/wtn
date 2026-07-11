# ── المرحلة 1: بناء الواجهة (Vite) ───────────────────────────────
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# .env.production يضبط VITE_API_URL=/api (أصل واحد)
RUN npm run build

# ── المرحلة 2: الخلفية (Django) تقدّم الـ API + الواجهة ───────────
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
# الواجهة المبنية تُقدَّم من هذا المسار (WhiteNoise + SPA fallback)
COPY --from=frontend /app/frontend/dist /app/frontend_dist
ENV FRONTEND_DIST=/app/frontend_dist

# جمع أصول لوحة الأدمن الثابتة (لا يحتاج قاعدة بيانات)
RUN SECRET_KEY=build-only python manage.py collectstatic --noinput

RUN chmod +x start.sh
CMD ["./start.sh"]
