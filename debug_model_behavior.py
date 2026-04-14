import numpy as np
from PIL import Image
import io
import requests


API_URL = "http://localhost:5000/predict"
CROP = "Tomato"

def predict_pil(img):
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    files = {"image": ("synthetic.png", buffer, "image/png")}
    data = {"crop": CROP}
    response = requests.post(API_URL, files=files, data=data, timeout=30)
    response.raise_for_status()
    return response.json()


samples = {
    "black": Image.fromarray(np.zeros((256, 256, 3), dtype=np.uint8), mode="RGB"),
    "white": Image.fromarray(np.full((256, 256, 3), 255, dtype=np.uint8), mode="RGB"),
    "gray": Image.fromarray(np.full((256, 256, 3), 127, dtype=np.uint8), mode="RGB"),
    "random_noise": Image.fromarray(np.random.randint(0, 256, (256, 256, 3), dtype=np.uint8), mode="RGB"),
}

# simple gradient
grad = np.tile(np.linspace(0, 255, 256, dtype=np.uint8), (256, 1))
grad_rgb = np.stack([grad, grad, grad], axis=-1)
samples["gradient"] = Image.fromarray(grad_rgb, mode="RGB")

for name, img in samples.items():
    prediction = predict_pil(img)
    print(
        f"{name:12s} -> {prediction['disease']} "
        f"conf={prediction['confidence']:.2f}% needs_review={prediction.get('needs_review', False)}"
    )
