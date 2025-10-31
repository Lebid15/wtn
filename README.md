# WTN Platform - Multi-Tenant SaaS for Digital Recharge Services

منصة وطن (WTN) - نظام SaaS متعدد المستأجرين لبيع وإدارة متاجر الشحن الرقمي.

---

## 📁 Project Structure

```
WTN/
├── backend/              # Django Backend
│   ├── core/            # Shared models, utils, permissions
│   ├── super_admin/     # Super Admin management
│   ├── tenant/          # Tenant management
│   ├── agent/            # Agent operations
│   ├── manage.py
│   ├── settings.py
│   └── requirements.txt
│
├── frontend/             # Next.js Frontend (App Router)
│   ├── src/
│   │   └── app/
│   │       ├── (super-admin)/   # Super Admin layout
│   │       ├── (tenant)/        # Tenant layout
│   │       ├── (agent)/          # Agent layout
│   │       └── _shared/          # Shared components
│   └── package.json
│
└── wtn4-documantation/   # Project documentation
    ├── information.md
    ├── wtn_dbdiagram.md
    ├── wtn_design.md
    └── ...
```

---

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Create .env file (copy from .env.example)
# Configure PostgreSQL, Redis settings

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Celery Workers

```bash
# Worker 1: Provider webhooks & API calls
celery -A backend worker -Q provider_tasks --loglevel=info

# Worker 2: Secondary tasks (emails, reports)
celery -A backend worker -Q secondary_tasks --loglevel=info
```

---

## 🛠️ Tech Stack

### Backend
- Django 5.x + DRF
- PostgreSQL
- Redis
- Celery
- JWT Authentication

### Frontend
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- React Hook Form + Zod
- Zustand

---

## 📚 Documentation

See `wtn4-documantation/` for complete documentation:
- **information.md**: Tech stack, business model, patterns
- **wtn_dbdiagram.md**: Complete database schema
- **wtn_design.md**: Frontend design system
- **routing_mapping.md**: Order routing system
- **financial_system.md**: Wallet & payment system
- **products_section.md**: Product management
- And more...

---

## 🏗️ Architecture

### Three Roles
1. **Super Admin**: Platform developer, manages tenants
2. **Tenant**: Store owner, manages products & agents
3. **Agent**: Reseller, creates orders

### Key Features
- Multi-tenant isolation
- Global product library
- Auto-routing system (External/Internal/Stock)
- Multi-currency support (USD base)
- Agent wallet with overdraft
- Tier & goals system
- API for external clients

---

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
SECRET_KEY=...
DEBUG=True
DB_NAME=wtn_db
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 📖 License

Private - All rights reserved

---

**Built with ❤️ for WTN Platform**

