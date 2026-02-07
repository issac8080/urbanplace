# Urban Place

**AI-governed home services and tutor marketplace** — connect with verified providers and tutors. Identity checks and tutor evaluations are powered by AI; only approved providers appear in search.

---

## What it looks like

> **Tip:** Add your own screenshots by saving PNGs as `screenshots/home.png`, `screenshots/login.png`, etc. The images below use placeholders until then.

### Home & Auth

| Landing | Sign in | Create account |
|--------|--------|-----------------|
| [![Home](https://placehold.co/400x250/f8fafc/64748b?text=Home&font=inter)](screenshots/home.png) | [![Sign in](https://placehold.co/400x250/f8fafc/64748b?text=Sign+in&font=inter)](screenshots/login.png) | [![Create account](https://placehold.co/400x250/f8fafc/64748b?text=Create+account&font=inter)](screenshots/register.png) |

- **Home**: Urban branding, **Login** and **Create account**.
- **Sign in**: Email, password; redirects to **Dashboard**.
- **Create account**: Name, email, password, role (**Customer**, **Worker**, **Tutor**); then **Dashboard**.

### After login

| Dashboard | Find Providers | Worker / Tutor profile |
|-----------|----------------|------------------------|
| [![Dashboard](https://placehold.co/400x250/f8fafc/64748b?text=Dashboard&font=inter)](screenshots/dashboard.png) | [![Search](https://placehold.co/400x250/f8fafc/64748b?text=Find+Providers&font=inter)](screenshots/search.png) | [![Profile](https://placehold.co/400x250/f8fafc/64748b?text=Profile&font=inter)](screenshots/profile.png) |

- **Dashboard**: Role-specific view — bookings, **Create worker profile** or **Create tutor profile**, or **Find Providers**.
- **Find Providers**: Choose **Home services** or **Tutors**, pick type/subject, see only **approved** providers; book with total price (30% commission applied).
- **Worker profile**: Service type, price, optional ID upload → AI identity verification → approved/rejected.
- **Tutor profile**: Subject, price, qualification text, experience, demo transcript → AI qualification + skill score, approval, profile summary.

### AI & trust

- **Workers**: Optional ID document → AI verifies identity; only approved workers show in search.
- **Tutors**: Qualification + experience + demo transcript → AI returns qualification score, skill score, approval, and profile summary.
- **Trust score**: From AI result, completion rate, cancellation rate, and ratings; updated when bookings are completed.

---

## Features

- **Roles**: Customer, Worker (home services), Tutor.
- **AI verification**: Workers — identity; Tutors — qualification + skill evaluation (OpenAI).
- **Policy-based listing**: Only approved providers in search.
- **30% commission**: Platform 30%, provider 70% per booking.
- **Local stack**: SQLite, local file storage, no cloud required.

---

## Tech stack

| Layer    | Stack |
|----------|--------|
| Backend  | FastAPI, SQLAlchemy, SQLite, JWT, OpenAI API |
| Frontend | Next.js (App Router), Tailwind CSS, Axios |

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **OpenAI API key**

---

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=your_jwt_secret_key_here
DATABASE_URL=sqlite:///./urban.db
```

### 2. Frontend

```bash
cd frontend
npm install
```

Optional: create `frontend/.env.local` if the API is not on `localhost:8000`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Run

**Terminal 1 — Backend**

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Frontend (Urban) |
| http://localhost:8000 | Backend API |
| http://localhost:8000/docs | API docs |

---

## Usage (matches the app)

1. **Register** as Customer, Worker, or Tutor (Create account).
2. **Workers**: Dashboard → **Create worker profile** → service type, price, optional ID → AI verifies → approved/rejected.
3. **Tutors**: Dashboard → **Create tutor profile** → subject, price, qualification, experience, demo transcript → AI scores and approval.
4. **Customers**: **Find Providers** → Home services or Tutors → pick type/subject → only approved providers → book (total price; 30% commission applied).
5. **Providers**: Accept/reject bookings; mark **Completed**. Trust score updates after completion.

---

## Database & files

- **SQLite**: `backend/urban.db` (created on first run).
- **Uploads**: `backend/uploads/`.
- **AI logs**: `ai_decision_logs` table.

---

## API overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Auth |
| `GET /api/constants/service-types` | Home services & tutor subjects |
| `POST /api/workers/profile`, `GET /api/workers/profile` | Worker profile (multipart) |
| `POST /api/tutors/profile`, `GET /api/tutors/profile` | Tutor profile (multipart) |
| `GET /api/providers/search?service_type=...` or `?subject=...` | Search approved providers |
| `POST /api/bookings`, `GET /api/bookings`, `PATCH /api/bookings/{id}` | Bookings |
| `POST /api/ratings` | Ratings |

---

## Adding your own screenshots

1. Run the app, then capture screenshots of: **Home**, **Sign in**, **Create account**, **Dashboard**, **Find Providers**, and **Worker/Tutor profile**.
2. Save them in the `screenshots/` folder as: `home.png`, `login.png`, `register.png`, `dashboard.png`, `search.png`, `profile.png`.
3. In this README, replace each `https://placehold.co/...` image URL in the tables above with the local path, e.g. `screenshots/home.png`.
4. Commit and push — the README will then show your real app screenshots.
