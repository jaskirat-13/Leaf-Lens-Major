from flask import Flask, request, jsonify
from flask_cors import CORS
import __main__
import os
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import io
import numpy as np

# ===== ResNet9 Model Definition =====
def conv_block(in_channels, out_channels, pool=False):
    layers = [nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
              nn.BatchNorm2d(out_channels),
              nn.ReLU(inplace=True)]
    if pool:
        layers.append(nn.MaxPool2d(2))
    return nn.Sequential(*layers)

class ResNet9(nn.Module):
    def __init__(self, in_channels, num_classes):
        super().__init__()
        self.conv1 = conv_block(in_channels, 64)
        self.conv2 = conv_block(64, 128, pool=True)
        self.res1 = nn.Sequential(conv_block(128, 128), conv_block(128, 128))
        self.conv3 = conv_block(128, 256, pool=True)
        self.conv4 = conv_block(256, 512, pool=True)
        self.res2 = nn.Sequential(conv_block(512, 512), conv_block(512, 512))
        self.classifier = nn.Sequential(nn.MaxPool2d(4),
                                       nn.Flatten(),
                                       nn.Linear(512, num_classes))

    def forward(self, xb):
        out = self.conv1(xb)
        out = self.conv2(out)
        out = self.res1(out) + out
        out = self.conv3(out)
        out = self.conv4(out)
        out = self.res2(out) + out
        out = self.classifier(out)
        return out

# ===== 38 Plant Disease Classes =====
DISEASE_CLASSES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot_(Gray_leaf_spot)",
    "Corn_(maize)___Common_rust",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites_(Two-spotted_spider_mite)",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy"
]

CROP_ALIASES = {
    "all": ["*"],
    "all crops": ["*"],
    "auto": ["*"],
    "auto detect": ["*"],
    "apple": ["Apple"],
    "blueberry": ["Blueberry"],
    "cherry": ["Cherry_(including_sour)"],
    "maize": ["Corn_(maize)"],
    "corn": ["Corn_(maize)"],
    "grape": ["Grape"],
    "orange": ["Orange"],
    "peach": ["Peach"],
    "pepper": ["Pepper,_bell"],
    "bell pepper": ["Pepper,_bell"],
    "potato": ["Potato"],
    "raspberry": ["Raspberry"],
    "soybean": ["Soybean"],
    "squash": ["Squash"],
    "strawberry": ["Strawberry"],
    "tomato": ["Tomato"]
}

def get_allowed_indices(crop_name):
    crop_key = (crop_name or "all").strip().lower()
    aliases = CROP_ALIASES.get(crop_key)
    if not aliases:
        return list(range(len(DISEASE_CLASSES)))
    if aliases == ["*"]:
        return list(range(len(DISEASE_CLASSES)))

    allowed = []
    for idx, class_name in enumerate(DISEASE_CLASSES):
        class_crop = class_name.split("___", 1)[0]
        if class_crop in aliases:
            allowed.append(idx)
    return allowed

def assess_image_quality(image_rgb):
    # Basic quality checks to detect very dark, very bright, or blurry uploads.
    arr = np.asarray(image_rgb, dtype=np.float32)
    gray = arr.mean(axis=2)
    brightness = float(gray.mean())

    # Simple blur proxy using variance of finite differences.
    dx = np.diff(gray, axis=1)
    dy = np.diff(gray, axis=0)
    sharpness = float(np.var(dx) + np.var(dy))

    # Simple vegetation coverage proxy (green/yellow-brown leaf-like pixels).
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    green_mask = (g > (r * 1.08)) & (g > (b * 1.08)) & (g > 45)
    yellow_brown_mask = (r > 60) & (g > 45) & (b < g) & (r >= g * 0.85)
    vegetation_ratio = float(np.mean(green_mask | yellow_brown_mask))

    warnings = []
    if brightness < 35:
        warnings.append("Image is very dark. Retake photo in better light.")
    elif brightness > 225:
        warnings.append("Image is overexposed. Reduce glare or direct sunlight.")

    if sharpness < 40:
        warnings.append("Image appears blurry. Hold camera steady and refocus.")

    if vegetation_ratio < 0.08:
        warnings.append("Image may not contain enough clear leaf area.")

    return {
        'brightness': brightness,
        'sharpness': sharpness,
        'vegetation_ratio': vegetation_ratio,
        'warnings': warnings
    }


def _to_float(payload, key, default=None):
    value = payload.get(key, default)
    if value is None:
        raise ValueError(f"Missing required field: {key}")
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid numeric value for {key}")


def _soil_level(value, low, high):
    if value < low:
        return "low"
    if value > high:
        return "high"
    return "optimal"


def analyze_soil_profile(payload):
    # Required soil metrics (typical units used by field kits/lab reports).
    ph = _to_float(payload, 'ph')
    nitrogen = _to_float(payload, 'nitrogen')
    phosphorus = _to_float(payload, 'phosphorus')
    potassium = _to_float(payload, 'potassium')
    moisture = _to_float(payload, 'moisture')
    organic_carbon = _to_float(payload, 'organicCarbon')
    temperature = _to_float(payload, 'temperature')
    rainfall = _to_float(payload, 'rainfall', 0)
    crop_name = str(payload.get('crop', 'General Crop')).strip() or 'General Crop'

    if not (3.0 <= ph <= 10.0):
        raise ValueError('pH must be between 3.0 and 10.0')

    nutrient_levels = {
        'nitrogen': _soil_level(nitrogen, 40, 120),
        'phosphorus': _soil_level(phosphorus, 20, 60),
        'potassium': _soil_level(potassium, 80, 220),
        'organicCarbon': _soil_level(organic_carbon, 0.7, 1.5)
    }

    # Fertility index: weighted score focused on NPK + carbon and pH stability.
    fertility_score = 100.0
    penalties = []

    if ph < 6.0:
        penalties.append((12, 'Acidic soil may reduce nutrient uptake.'))
    elif ph > 7.8:
        penalties.append((10, 'Alkaline pH can lock phosphorus and micronutrients.'))

    if nutrient_levels['nitrogen'] == 'low':
        penalties.append((16, 'Nitrogen is low, reducing vegetative growth potential.'))
    elif nutrient_levels['nitrogen'] == 'high':
        penalties.append((6, 'Nitrogen is high; monitor excess foliage and pest pressure.'))

    if nutrient_levels['phosphorus'] == 'low':
        penalties.append((14, 'Phosphorus is low, affecting root development and flowering.'))
    elif nutrient_levels['phosphorus'] == 'high':
        penalties.append((6, 'Phosphorus is high; avoid unnecessary DAP applications.'))

    if nutrient_levels['potassium'] == 'low':
        penalties.append((12, 'Potassium is low, increasing stress and lodging risk.'))
    elif nutrient_levels['potassium'] == 'high':
        penalties.append((5, 'Potassium is high; rebalance future fertilizer schedule.'))

    if nutrient_levels['organicCarbon'] == 'low':
        penalties.append((11, 'Low organic carbon indicates poor soil structure and biology.'))

    if moisture < 30:
        penalties.append((12, 'Soil moisture is low and may limit nutrient availability.'))
    elif moisture > 75:
        penalties.append((9, 'Soil moisture is high and can increase root disease risk.'))

    if temperature > 35:
        penalties.append((7, 'High soil temperature can stress roots and microbial activity.'))
    elif temperature < 12:
        penalties.append((5, 'Low soil temperature can slow nutrient mineralization.'))

    if rainfall > 180:
        penalties.append((6, 'Very high rainfall may cause nutrient leaching.'))

    total_penalty = sum(p[0] for p in penalties)
    fertility_score = max(18.0, min(99.0, fertility_score - total_penalty))

    if fertility_score >= 80:
        fertility_band = 'High'
    elif fertility_score >= 60:
        fertility_band = 'Moderate'
    else:
        fertility_band = 'Low'

    water_risk = 'Low'
    if moisture < 30:
        water_risk = 'Drought Stress'
    elif moisture > 75 or rainfall > 140:
        water_risk = 'Waterlogging Risk'

    nutrient_risk = 'Balanced'
    if list(nutrient_levels.values()).count('low') >= 2:
        nutrient_risk = 'Nutrient Deficiency Risk'
    elif list(nutrient_levels.values()).count('high') >= 2:
        nutrient_risk = 'Nutrient Excess Risk'

    insights = [
        f"Estimated soil fertility index: {fertility_score:.1f}/100 ({fertility_band}).",
        f"Primary nutrient status: N={nutrient_levels['nitrogen']}, P={nutrient_levels['phosphorus']}, K={nutrient_levels['potassium']}.",
        f"Water condition: {water_risk} based on moisture {moisture:.1f}% and rainfall {rainfall:.1f} mm.",
        f"Organic carbon is {nutrient_levels['organicCarbon']} at {organic_carbon:.2f}% affecting soil structure and microbial health."
    ]

    major_drivers = [p[1] for p in penalties[:4]]
    if not major_drivers:
        major_drivers.append('Soil parameters are within a stable operational range.')

    recommendations = []
    if ph < 6.0:
        recommendations.append('Apply agricultural lime in split doses to gradually raise pH.')
    elif ph > 7.8:
        recommendations.append('Use gypsum and organic amendments to improve nutrient availability in alkaline soil.')

    if nutrient_levels['nitrogen'] == 'low':
        recommendations.append('Increase nitrogen through urea in split applications or composted manure.')
    if nutrient_levels['phosphorus'] == 'low':
        recommendations.append('Band-apply phosphorus fertilizer near root zone for better early uptake.')
    if nutrient_levels['potassium'] == 'low':
        recommendations.append('Supplement muriate of potash and monitor tissue potassium during growth stages.')
    if nutrient_levels['organicCarbon'] == 'low':
        recommendations.append('Incorporate FYM/compost and crop residue to lift soil organic carbon over time.')

    if water_risk == 'Drought Stress':
        recommendations.append('Schedule irrigation in smaller, more frequent cycles and add mulch to reduce evaporation.')
    elif water_risk == 'Waterlogging Risk':
        recommendations.append('Open drainage channels and avoid fertilizer application before heavy rainfall events.')

    if not recommendations:
        recommendations.append('Maintain current nutrient plan and repeat soil testing after 45-60 days for trend tracking.')

    if fertility_score >= 75:
        yield_outlook = 'Good yield potential if disease and weather are managed well.'
    elif fertility_score >= 60:
        yield_outlook = 'Moderate yield potential; targeted nutrient corrections can improve output.'
    else:
        yield_outlook = 'Yield is at risk without immediate nutrient and water management adjustments.'

    return {
        'crop': crop_name,
        'fertility_score': round(fertility_score, 1),
        'fertility_band': fertility_band,
        'water_risk': water_risk,
        'nutrient_risk': nutrient_risk,
        'yield_outlook': yield_outlook,
        'input_summary': {
            'ph': ph,
            'nitrogen': nitrogen,
            'phosphorus': phosphorus,
            'potassium': potassium,
            'moisture': moisture,
            'organicCarbon': organic_carbon,
            'temperature': temperature,
            'rainfall': rainfall
        },
        'levels': nutrient_levels,
        'major_insights': insights,
        'major_drivers': major_drivers,
        'recommendations': recommendations
    }


def should_flag_invalid_input(quality, confidence_score, confidence_margin):
    reasons = []

    if quality.get('vegetation_ratio', 0.0) < 0.08:
        reasons.append('Uploaded photo does not appear to contain enough leaf area.')
    if quality.get('brightness', 0.0) < 25 or quality.get('brightness', 0.0) > 235:
        reasons.append('Lighting is unsuitable for reliable diagnosis.')
    if quality.get('sharpness', 0.0) < 25:
        reasons.append('Photo sharpness is too low for reliable diagnosis.')

    # Prediction-level ambiguity checks.
    if confidence_score < 45:
        reasons.append('Model confidence is too low for a reliable disease label.')
    if confidence_score < 70 and confidence_margin < 12:
        reasons.append('Top predictions are too close; result is ambiguous.')

    return (len(reasons) > 0, reasons)

# ===== Initialize Flask App =====
app = Flask(__name__)
CORS(app)

def load_disease_model(model_path):
    # Legacy checkpoint was serialized from __main__. Expose symbols for gunicorn workers.
    setattr(__main__, 'ResNet9', ResNet9)
    setattr(__main__, 'conv_block', conv_block)

    loaded = torch.load(model_path, map_location='cpu', weights_only=False)
    if isinstance(loaded, nn.Module):
        loaded.eval()
        return loaded

    raise RuntimeError('Unsupported model checkpoint format. Expected a serialized nn.Module.')


# Load model
print("Loading model...")
model = load_disease_model('plant-disease-model-complete (1).pth')
print("✅ Model loaded successfully!")

# Image preprocessing
transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225])
])

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get image from request
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        selected_crop = request.form.get('crop', 'all')
        allowed_indices = get_allowed_indices(selected_crop)

        # Load image once for both quality checks and model preprocessing.
        image = Image.open(io.BytesIO(file.read())).convert('RGB')
        quality = assess_image_quality(image)
        image_tensor = transform(image).unsqueeze(0)
        
        # Run inference
        with torch.no_grad():
            outputs = model(image_tensor)
            filtered_logits = outputs[0, allowed_indices]
            filtered_probabilities = torch.nn.functional.softmax(filtered_logits, dim=0)
            confidence, predicted_local = torch.max(filtered_probabilities, dim=0)
        
        # Get results
        class_idx = allowed_indices[predicted_local.item()]
        disease_name = DISEASE_CLASSES[class_idx]
        predicted_crop = disease_name.split('___', 1)[0].replace('_', ' ')
        confidence_score = float(confidence.item()) * 100
        
        # Get top 3 predictions and top-2 margin for uncertainty checks.
        top_k = min(3, len(allowed_indices))
        top_probs, top_local_indices = torch.topk(filtered_probabilities, top_k)

        top_conf = float(top_probs[0].item()) * 100
        second_conf = float(top_probs[1].item()) * 100 if top_k > 1 else 0.0
        confidence_margin = top_conf - second_conf

        uncertainty_reasons = []
        if confidence_score < 75:
            uncertainty_reasons.append("Overall confidence is below 75%.")
        if confidence_margin < 20:
            uncertainty_reasons.append("Top prediction is too close to second-best prediction.")
        uncertainty_reasons.extend(quality['warnings'])

        invalid_image, invalid_reasons = should_flag_invalid_input(
            quality,
            confidence_score,
            confidence_margin
        )

        if invalid_image:
            for reason in invalid_reasons:
                if reason not in uncertainty_reasons:
                    uncertainty_reasons.append(reason)
            disease_name = 'Uncertain_input'
            predicted_crop = 'Unknown'

        needs_review = len(uncertainty_reasons) > 0

        top_predictions = [
            {
                'disease': DISEASE_CLASSES[allowed_indices[idx.item()]],
                'confidence': float(prob.item()) * 100
            }
            for prob, idx in zip(top_probs, top_local_indices)
        ]
        
        return jsonify({
            'success': True,
            'crop_filter': selected_crop,
            'crop_name': predicted_crop,
            'disease': disease_name,
            'confidence': confidence_score,
            'top_3': top_predictions,
            'needs_review': needs_review,
            'invalid_image': invalid_image,
            'confidence_margin': confidence_margin,
            'quality': {
                'brightness': quality['brightness'],
                'sharpness': quality['sharpness'],
                'vegetation_ratio': quality['vegetation_ratio']
            },
            'uncertainty_reasons': uncertainty_reasons
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'API is running', 'model_classes': len(DISEASE_CLASSES)})


@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'service': 'Leaflens ML API',
        'status': 'ok',
        'endpoints': ['/health', '/predict', '/analyze-soil']
    })


@app.route('/analyze-soil', methods=['POST'])
def analyze_soil():
    try:
        payload = request.get_json(silent=True) or {}
        analysis = analyze_soil_profile(payload)
        return jsonify({'success': True, 'analysis': analysis})
    except ValueError as error:
        return jsonify({'error': str(error)}), 400
    except Exception as error:
        return jsonify({'error': f'Failed to analyze soil data: {error}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    app.run(host='0.0.0.0', port=port, debug=False)
