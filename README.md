# LeafLens - Plant Disease and Farm Intelligence Platform

LeafLens is a full-stack project for crop support with:

- Plant disease detection from leaf images (PyTorch model)
- Soil profile analysis and recommendations
- 3-day weather forecast and farming advisories
- Nearby agro-store discovery (map APIs)
- Multi-language UI support

The frontend is built with React + Vite and the backend is Flask + PyTorch.

## Features

- Disease prediction API with top-3 classes and confidence scores
- Crop-aware prediction filtering
- Invalid/low-quality image checks (blur, lighting, vegetation ratio)
- Soil analysis endpoint with fertility scoring, risk flags, and recommendations
- Health check endpoint for uptime monitoring
- Frontend runtime API-base configuration via `VITE_API_BASE_URL`
- Language support through translation context and translation service

## Tech Stack

### Frontend

- React 18
- Vite 5
- Plain CSS

### Backend

- Flask 3
- Flask-CORS
- PyTorch 2.0.1 + TorchVision 0.15.2
- NumPy, Pillow
- Gunicorn (production server)

### External APIs used by frontend

- Open-Meteo (forecast + geocoding)
- Nominatim (search)
- Overpass API (agro store lookup)
- MyMemory API (translation)

## Project Structure

```text
.
|- api.py
|- requirements.txt
|- render.yaml
|- .python-version
|- vercel.json
|- .env.example
|- plant-disease-model-complete (1).pth
|- package.json
|- vite.config.js
|- index.html
|- styles.css
|- src/
|  |- App.jsx
|  |- main.jsx
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

Important:

- Keep the model file `plant-disease-model-complete (1).pth` in the project root.
- Python 3.14 is not compatible with this pinned PyTorch version (`torch==2.0.1`).

## Environment Variables

Use `.env.example` as reference:

```env
VITE_API_BASE_URL=
```

Behavior:

- Localhost frontend uses `http://localhost:5000` if this variable is empty.
- Hosted frontend uses:
	- `VITE_API_BASE_URL` when provided, otherwise
	- the default hosted backend URL defined in `src/App.jsx`.

## Run Locally

### 1. Start backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python api.py
```

Backend starts on `http://localhost:5000`.

### 2. Start frontend

```bash
npm install
npm run dev
```

Frontend starts on Vite dev server (typically `http://localhost:5173`).

## Frontend Scripts

```bash
npm run dev      # start development server
npm run build    # production build
npm run preview  # preview production build locally
```

## API Reference

### GET `/`

Returns service metadata and available endpoints.

### GET `/health`

Returns backend status and number of model classes.

### POST `/predict`

Content type: `multipart/form-data`

Fields:

- `image` (required): leaf image file
- `crop` (optional): crop filter (`all`, `tomato`, `potato`, etc.)

Example:

```bash
curl -X POST \
	-F "image=@leaf.jpg" \
	-F "crop=tomato" \
	http://localhost:5000/predict
```

Response includes:

- `disease`, `confidence`, `top_3`
- `needs_review`, `invalid_image`
- `confidence_margin`, image-quality metrics, and uncertainty reasons

### POST `/analyze-soil`

Content type: `application/json`

Example request:

```json
{
	"crop": "Tomato",
	"ph": 6.7,
	"nitrogen": 80,
	"phosphorus": 45,
	"potassium": 130,
	"moisture": 52,
	"organicCarbon": 1.0,
	"temperature": 28,
	"rainfall": 40
}
```

Response includes fertility score, risk categories, drivers, and recommendations.

## Deployment

### Backend on Render

This project includes:

- `render.yaml` (service definition)
- `.python-version` (pins Python to 3.11.9)

Render settings summary:

- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn --bind 0.0.0.0:$PORT api:app`

After deploy, test:

- `https://<your-render-domain>/health`

### Frontend on Vercel

This project includes `vercel.json` with Vite build config.

In Vercel project settings, add env variable:

- `VITE_API_BASE_URL=https://<your-render-domain>`

Then redeploy.

Important:

- Set env vars in Vercel dashboard (not inside `vercel.json`).

## Troubleshooting

### Render build uses Python 3.14 and fails torch install

Cause:

- `torch==2.0.1` wheels are available up to Python 3.11.

Fix:

- Ensure `.python-version` is present with `3.11.9`.

### Vercel tries to install Python requirements

Cause:

- Monorepo root contains backend files and Vercel auto-detected Python.

Fix:

- Keep `vercel.json` with explicit Node/Vite build commands.
- Configure `VITE_API_BASE_URL` in Vercel project settings.

### API unreachable from frontend

Checklist:

- Backend `/health` responds
- `VITE_API_BASE_URL` is set correctly in Vercel
- Redeploy after env var changes
- No trailing spaces in env var value

## Utility Scripts

These files help debugging and inspection during development:

- `inspect_model.py`
- `test_model.py`
- `debug_api_behavior.py`
- `debug_model_behavior.py`
- `debug_predict.py`

## Notes

- CORS is enabled in backend (`CORS(app)`).
- Model is loaded at startup, so first boot can take longer.
- For production-scale usage, consider request limits, authentication, and model optimization.


## Live Demo

- Frontend: https://leaf-lens-major.vercel.app/
- Backend: https://leaf-lens-major.onrender.com