# LeafLens - Crop Intelligence Platform

LeafLens is a full-stack agriculture assistant with ML disease detection, soil intelligence, weather guidance, authentication, and downloadable field reports.

- Frontend: React + Vite (deployed on Vercel)
- Backend: Flask + PyTorch (deployed on Render)
- Auth: Supabase Email/Password + password reset

## Core Features

- Leaf disease prediction from image upload (top-3 classes with confidence)
- Soil analysis with score, risk factors, and recommendations
- 3-day weather forecast and crop-aware advisory
- Nearby agri-store lookup with geolocation APIs
- Multi-language support
- User authentication (signup, login, logout, forgot/reset password)
- Per-user prediction history view
- Professional PDF report download from backend
- JWT-protected backend inference/report endpoints

## Tech Stack

### Frontend

- React 18
- Vite 5
- React Router DOM 6
- Supabase JS
- Plain CSS

### Backend

- Flask 3
- Flask-CORS
- Gunicorn
- PyTorch 2.0.1 + TorchVision 0.15.2
- NumPy, Pillow
- ReportLab (PDF generation)
- PyJWT[crypto] (JWT verification)

### External APIs

- Open-Meteo
- Nominatim
- Overpass API
- MyMemory translation API

## Project Structure

```text
.
|- api.py
|- requirements.txt
|- render.yaml
|- .python-version
|- vercel.json
|- .env.example
|- supabase_profiles.sql
|- plant-disease-model-complete (1).pth
|- package.json
|- vite.config.js
|- index.html
|- styles.css
|- src/
|  |- App.jsx
|  |- main.jsx
|  |- router/AppRouter.jsx
|  |- context/AuthContext.jsx
|  |- lib/supabaseClient.js
|  |- components/auth/ProtectedRoute.jsx
|  |- pages/AuthPage.jsx
|  |- pages/PredictionHistoryPage.jsx
|  |- TranslationContext.jsx
|  |- translationService.js
|- debug_api_behavior.py
|- debug_model_behavior.py
|- debug_predict.py
|- inspect_model.py
|- test_model.py
```

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.11.x
- pip

Notes:

- Keep `plant-disease-model-complete (1).pth` in project root.
- Python 3.14 is not compatible with pinned `torch==2.0.1`.

## Environment Variables

Use `.env.example` as the frontend reference.

### Frontend (.env)

```env
VITE_API_BASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- `VITE_API_BASE_URL`: Render backend base URL (for production)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon public key

### Backend (Render Environment)

- `SUPABASE_URL`: required for JWKS/JWT issuer validation
- `SUPABASE_JWT_SECRET`: only required if your project issues HS256 tokens (legacy mode)

## Local Development

### 1. Start backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python api.py
```

Backend runs on `http://localhost:5000`.

### 2. Start frontend

```bash
npm install
npm run dev
```

Frontend runs on Vite dev server, usually `http://localhost:5173`.

## Frontend Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Authentication Flow

- Signup sends confirmation link to `${window.location.origin}/auth`.
- Forgot-password sends reset link to `${window.location.origin}/auth?mode=reset`.
- `/auth` handles login/signup/forgot/reset modes.

Supabase dashboard settings must include both local and production URLs.

Recommended values:

- Site URL:
  - `https://leaf-lens-major.vercel.app`
- Additional Redirect URLs:
  - `https://leaf-lens-major.vercel.app`
  - `https://leaf-lens-major.vercel.app/auth`
  - `http://localhost:5173`
  - `http://localhost:5173/auth`

## API Endpoints

### Public

- `GET /`
- `GET /health`

### Auth Required (Bearer token)

- `POST /predict`
- `POST /analyze-soil`
- `POST /download-report`

The frontend sends Supabase access token in:

`Authorization: Bearer <token>`

## Deployment

### Backend on Render

This repo includes `render.yaml` and `.python-version`.

- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn --bind 0.0.0.0:$PORT api:app`

After deployment, test:

- `https://<your-render-domain>/health`

### Frontend on Vercel

`vercel.json` is configured for Vite and SPA rewrites.

Current rewrite ensures deep links such as `/auth` work:

```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

In Vercel Environment Variables, set:

- `VITE_API_BASE_URL=https://<your-render-domain>`
- `VITE_SUPABASE_URL=https://<your-supabase-project>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<your-anon-key>`

Redeploy after any env var change.

## Troubleshooting

### Reset/confirm email opens wrong URL

Cause:

- Supabase redirect settings or frontend redirect option not aligned with current domain.

Fix:

- Ensure auth redirects use current origin (already implemented in app).
- Add production and localhost URLs in Supabase URL Configuration.

### Vercel returns 404 on /auth

Cause:

- SPA deep-link rewrite missing.

Fix:

- Keep rewrite rule in `vercel.json` mapping all routes to `/index.html`.

### Render build fails with torch dependency

Cause:

- Python version too new for pinned torch wheel.

Fix:

- Keep `.python-version` at `3.11.9`.

### Backend returns auth error

Checklist:

- Frontend user is logged in and token is present
- `SUPABASE_URL` is set on Render
- If token algorithm is HS256, set `SUPABASE_JWT_SECRET`
- If asymmetric tokens (RS256/ES256), ensure internet access to Supabase JWKS endpoint

## Utility Scripts

- `inspect_model.py`
- `test_model.py`
- `debug_api_behavior.py`
- `debug_model_behavior.py`
- `debug_predict.py`

## Live Demo

- Frontend: https://leaf-lens-major.vercel.app/
- Backend: https://leaf-lens-major.onrender.com