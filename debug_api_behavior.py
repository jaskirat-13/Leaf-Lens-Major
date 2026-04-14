import io
import numpy as np
from PIL import Image
import requests


def make_bytes(arr):
    img = Image.fromarray(arr.astype(np.uint8), mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()

samples = {
    "black": np.zeros((256, 256, 3), dtype=np.uint8),
    "white": np.full((256, 256, 3), 255, dtype=np.uint8),
    "gray": np.full((256, 256, 3), 127, dtype=np.uint8),
    "noise1": np.random.randint(0, 256, (256, 256, 3), dtype=np.uint8),
    "noise2": np.random.randint(0, 256, (256, 256, 3), dtype=np.uint8),
}

CROP = "Tomato"

grad = np.tile(np.linspace(0, 255, 256, dtype=np.uint8), (256, 1))
samples["gradient"] = np.stack([grad, grad, grad], axis=-1)

for name, arr in samples.items():
    files = {"image": (f"{name}.png", io.BytesIO(make_bytes(arr)), "image/png")}
    r = requests.post("http://localhost:5000/predict", files=files, data={"crop": CROP}, timeout=30)
    print(f"{name:10s} status={r.status_code}")
    print(r.json())
    print("-" * 80)
