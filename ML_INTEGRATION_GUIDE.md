# 🚀 ML Model Integration Setup

Your Leaflens app now integrates a **PyTorch ResNet9 model** that detects plant diseases across 38 different crops and conditions.

## 📋 Project Structure

```
majro project/
├── index.html                          # React entry point
├── src/
│   ├── App.jsx                        # Updated with ML API integration
│   └── main.jsx
├── api.py                              # Flask backend API (NEW)
├── plant-disease-model-complete (1).pth # PyTorch model
├── inspect_model.py                    # Model inspection script
└── package.json
```

---

## 🔧 Setup & Running the App

### Step 1: Install Python Dependencies
The required packages are already installed in your virtual environment:
- Flask
- torch
- torchvision
- pillow
- flask-cors

### Step 2: Start the Flask API Backend
Run this in your terminal (from the project root):

```bash
# Activate virtual environment (if needed)
.venv\Scripts\activate

# Start the Flask server
python api.py
```

You should see:
```
✅ Model loaded successfully!
 * Running on http://127.0.0.1:5000
```

**Keep this terminal window open** while using the app.

### Step 3: Start the React Development Server
In a **new terminal window**, run:

```bash
npm run dev
```

### Step 4: Open the App
- Navigate to the URL shown in the npm terminal (usually `http://localhost:5173`)
- Upload a plant/leaf image
- The app will send it to the Flask backend for ML analysis
- Results show within seconds

---

## 🎯 Model Details

### Input
- **Format**: JPEG, PNG, or any image format
- **Size**: Model auto-resizes to 256×256 internally
- **Color**: RGB (converted automatically)

### Output
- **Disease Name**: One of 38 classes (e.g., "Tomato___Early_blight")
- **Confidence %**: 0-100% certainty score
- **Top 3 Predictions**: Alternative diseases with confidence scores

### 38 Disease Classes Covered
```
Apple (scab, black rot, cedar apple rust, healthy)
Blueberry (healthy)
Cherry (powdery mildew, healthy)
Corn/Maize (Cercospora, common rust, Northern Leaf Blight, healthy)
Grape (black rot, Esca, leaf blight, healthy)
Orange (Huanglongbing)
Peach (bacterial spot, healthy)
Pepper (bacterial spot, healthy)
Potato (early blight, late blight, healthy)
Raspberry (healthy)
Soybean (healthy)
Squash (powdery mildew)
Strawberry (leaf scorch, healthy)
Tomato (bacterial spot, early blight, late blight, leaf mold, 
         Septoria leaf spot, spider mites, target spot, 
         mosaic virus, healthy, yellow leaf curl virus)
```

---

## 🔌 API Endpoints

### POST `/predict`
Send an image and get disease detection results.

**Request:**
```bash
curl -X POST -F "image=@leaf_photo.jpg" http://localhost:5000/predict
```

**Response (Success):**
```json
{
  "success": true,
  "disease": "Tomato___Early_blight",
  "confidence": 94.67,
  "top_3": [
    {
      "disease": "Tomato___Early_blight",
      "confidence": 94.67
    },
    {
      "disease": "Tomato___Late_blight",
      "confidence": 3.24
    },
    {
      "disease": "Tomato___healthy",
      "confidence": 1.89
    }
  ]
}
```

**Response (Error):**
```json
{
  "error": "No image provided"
}
```

### GET `/health`
Check if the API is running.

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "API is running",
  "model_classes": 38
}
```

---

## ⚠️ Troubleshooting

### "API request failed. Is the backend running on port 5000?"
- Make sure you ran `python api.py` in the terminal
- Check that Flask is listening on `http://localhost:5000`
- Try accessing `http://localhost:5000/health` in your browser

### "Model loaded successfully!" but detection fails
- Ensure image format is JPEG, PNG, or supported format
- Check file size (should be < 10MB)
- Try a different image

### Port 5000 already in use
- Change the port in `api.py`: `app.run(debug=True, port=5001)`
- Update the fetch URL in `App.jsx` to match

---

## 🚀 Production Deployment

For production, you'll want to:

1. **Use a production WSGI server** instead of Flask's dev server:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 api:app
   ```

2. **Deploy on cloud platforms**:
   - Railway, Render, Heroku, or AWS
   - Store model in a deployment package or cloud storage

3. **Add request validation**:
   - Limit file size (current: unlimited)
   - Add rate limiting
   - Validate image dimensions

4. **Use a reverse proxy**:
   - Nginx to serve both React and Flask
   - Handle CORS properly in production

---

## 📊 Next Steps

With ML integration working, consider adding:
1. **Disease history tracking** - Save detections to localStorage
2. **Batch upload** - Analyze multiple images at once
3. **Multi-crop selection** - Already in UI, now fully functional
4. **Confidence score UI** - Display confidence visually (color-coded bars)

---

## 📝 Notes

- The model was trained on plant leaves from the **Plant Village dataset**
- Accuracy varies by crop and disease (typical: 85-95%)
- For low-confidence results (<70%), recommend expert verification
- Model runs on CPU by default (fast enough for real-time use)

---

Happy farming! 🌾
