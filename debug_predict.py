import io
import requests

URLS = [
    "https://upload.wikimedia.org/wikipedia/commons/3/32/Apple_scab_on_fruit.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/4/49/Potato_blight.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/8/89/Tomato_plant_healthy.jpg"
]

CROP = "Tomato"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Leaflens-Debug-Script)"
}

for idx, image_url in enumerate(URLS, start=1):
    try:
        get_resp = requests.get(image_url, headers=HEADERS, timeout=20)
        get_resp.raise_for_status()
        data = get_resp.content
        files = {"image": (f"sample_{idx}.jpg", io.BytesIO(data), "image/jpeg")}
        form = {"crop": CROP}
        resp = requests.post("http://localhost:5000/predict", files=files, data=form, timeout=30)
        print(f"[{idx}] status={resp.status_code}")
        print(resp.text)
        print("-" * 80)
    except Exception as exc:
        print(f"[{idx}] ERROR: {exc}")
        print("-" * 80)
