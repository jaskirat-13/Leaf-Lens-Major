# majro-project

Leaflens is now converted to a React website powered by Vite.

## Run Locally

```bash
npm install
npm run dev
```

## Build For Production

```bash
npm run build
npm run preview
```

## Live Deployment

- Frontend: deploy to Vercel
- Backend: deploy to Render using `render.yaml`

## Live ML Integration (Backend + Frontend)

1. Deploy the Flask backend (`api.py`) on Render. Keep `plant-disease-model-complete (1).pth` in the project root.
2. In Vercel, set `VITE_API_BASE_URL=https://<your-render-backend-domain>` for the frontend project.
3. Redeploy the Vercel project so the frontend rebuilds with the backend URL.
4. Test `/health`, image prediction, and soil analysis from the live site.

If `VITE_API_BASE_URL` is not set locally, the app uses `http://localhost:5000`. In production it falls back to the default Render backend URL in the app.

## Backend Endpoints Used by Frontend

- `POST /predict` for disease detection from uploaded image
- `POST /analyze-soil` for soil insights
- `GET /health` for API health check

## Project Structure

- `index.html` - React mount point
- `src/main.jsx` - app bootstrap
- `src/App.jsx` - main UI and interactions
- `styles.css` - global styling
