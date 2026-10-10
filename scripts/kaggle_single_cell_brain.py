"""
═════════════════════════════════════════════════════════════════════════════════
TripVerse • ConCode AI Brain — Kaggle GPU Master Runner (Single Cell)
═════════════════════════════════════════════════════════════════════════════════
Instructions:
1. In your Kaggle Notebook (right sidebar):
   - Input: Click '+' next to 'Concode_kaggle_dataset'
   - Settings: Accelerator -> 'GPU T4 x 2' (or P100)
   - Settings: Internet -> 'On'
2. Paste this entire cell into the notebook and click RUN (Shift + Enter).
═════════════════════════════════════════════════════════════════════════════════
"""

import os
import re
import sys
import time
import shutil
import zipfile
import subprocess
from pathlib import Path

print("🚀 Step 1/5: Verifying Kaggle GPU & Environment...")
try:
    import torch
    if not torch.cuda.is_available():
        print("⚠️ WARNING: GPU is not active! Please change Accelerator to GPU T4 x 2 or P100 in the right sidebar.")
    else:
        print(f"✅ GPU Detected: {torch.cuda.get_device_name(0)} (CUDA {torch.version.cuda})")
except ImportError:
    pass

# ── 1. Locate and Extract Dataset ─────────────────────────────────────────────
print("\n📦 Step 2/5: Locating and Extracting ConCode Dataset...")
INPUT_ROOT = Path('/kaggle/input')
archives = sorted(INPUT_ROOT.glob('*/concode_kaggle_dataset.zip'))
if not archives:
    archives = sorted(Path('/kaggle').glob('**/concode_kaggle_dataset.zip'))

PROJECT_ROOT = Path('/kaggle/working/CONCODE_BRAIN')
PROJECT_ROOT.mkdir(parents=True, exist_ok=True)

if archives:
    print(f"📂 Found dataset archive: {archives[0]}")
    with zipfile.ZipFile(archives[0]) as archive:
        archive.extractall(PROJECT_ROOT)
    print("✅ Extracted ConCode Brain to /kaggle/working/CONCODE_BRAIN")
else:
    candidates = sorted(INPUT_ROOT.glob('*/src/service.py'))
    if candidates:
        PROJECT_ROOT = candidates[0].parent.parent
        print(f"✅ Found source folder at {PROJECT_ROOT}")
    else:
        raise FileNotFoundError(
            "Could not find 'concode_kaggle_dataset.zip' in /kaggle/input/. "
            "Please click '+ Add Input' on the right sidebar and attach 'Concode_kaggle_dataset'!"
        )

# ── 2. Install Dependencies & Build CUDA llama.cpp ───────────────────────────
print("\n⚙️ Step 3/5: Installing Dependencies & CUDA acceleration...")
dependencies = [
    'fastapi>=0.100.0', 'uvicorn[standard]>=0.22.0', 'transformers>=4.30.0',
    'sentence-transformers>=2.2.2', 'faiss-cpu>=1.7.4', 'pydantic>=2.0',
    'pyyaml>=6.0', 'python-dotenv>=1.0.0', 'requests>=2.31.0', 'cmake', 'ninja', 'scikit-build-core'
]
subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--quiet', *dependencies])

build_env = os.environ.copy()
build_env['CMAKE_ARGS'] = '-DGGML_CUDA=on'
build_env['FORCE_CMAKE'] = '1'
subprocess.check_call([
    sys.executable, '-m', 'pip', 'install', '--quiet', '--no-cache-dir', 'llama-cpp-python'
], env=build_env)

# ── 3. Configure API Key & Launch Server ──────────────────────────────────────
print("\n🧠 Step 4/5: Booting ConCode FastAPI with CodeLlama-7B GGUF...")
API_KEY = os.environ.get("CONCODE_API_KEY", "concode_gpu_brain_tripverse_secret_key_2026_xyz")
try:
    from kaggle_secrets import UserSecretsClient
    sec = UserSecretsClient().get_secret('CONCODE_API_KEY')
    if sec and len(sec) >= 32:
        API_KEY = sec
except Exception:
    pass

os.environ['CONCODE_API_KEY'] = API_KEY
os.environ['CONCODE_REQUIRE_API_KEY'] = '1'
os.environ['CONCODE_INFERENCE_BACKEND'] = 'local'
os.environ['CONCODE_MODEL_DIR'] = str(PROJECT_ROOT / 'models')
os.environ['CONCODE_USER_PROFILES_PATH'] = '/kaggle/working/concode_user_profiles.json'
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'

log_file = open('/kaggle/working/concode-uvicorn.log', 'w')
server = subprocess.Popen(
    [sys.executable, '-m', 'uvicorn', 'src.service:app', '--host', '127.0.0.1', '--port', '8000', '--workers', '1'],
    cwd=PROJECT_ROOT,
    env=os.environ.copy(),
    stdout=log_file,
    stderr=subprocess.STDOUT,
)

BASE_URL = 'http://127.0.0.1:8000'
import requests

for i in range(120):
    if server.poll() is not None:
        raise RuntimeError('ConCode exited during model startup. Inspect /kaggle/working/concode-uvicorn.log')
    try:
        if requests.get(BASE_URL + '/ready', timeout=2).ok:
            print("✅ ConCode Brain model loaded into GPU memory!")
            break
    except Exception:
        pass
    time.sleep(3)
else:
    print("⏳ Server is still initializing. Continuing to tunnel setup...")

# ── 4. Launch Cloudflare Tunnel ───────────────────────────────────────────────
print("\n🌐 Step 5/5: Opening Public Cloudflare Tunnel...")
cloudflared_path = '/kaggle/working/cloudflared'
if not Path(cloudflared_path).is_file():
    subprocess.run(
        ['wget', '-q', '-O', cloudflared_path, 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64'],
        check=True
    )
os.chmod(cloudflared_path, 0o755)

tunnel_log = open('/kaggle/working/cloudflared.log', 'w')
tunnel = subprocess.Popen(
    [cloudflared_path, 'tunnel', '--no-autoupdate', '--url', BASE_URL],
    stdout=tunnel_log,
    stderr=subprocess.STDOUT,
)

PUBLIC_URL = None
for _ in range(30):
    try:
        log_content = Path('/kaggle/working/cloudflared.log').read_text(errors='replace')
        match = re.search(r'https://[a-z0-9-]+\\.trycloudflare\\.com', log_content)
        if match:
            PUBLIC_URL = match.group(0)
            break
    except Exception:
        pass
    time.sleep(2)

print("\n" + "═" * 70)
if PUBLIC_URL:
    print("🎉 CONCODE AI BRAIN IS LIVE AND HOSTED ON KAGGLE GPU!")
    print(f"👉 PUBLIC API URL: {PUBLIC_URL}")
    print(f"🔑 API KEY:        {API_KEY}")
    print("\nCONNECT TO TRIPVERSE:")
    print("1. In TripVerse App: Open AI Co-Pilot -> Click 'Configure GPU'")
    print(f"2. Endpoint URL: {PUBLIC_URL}")
    print(f"3. API Key:      {API_KEY}")
    print("4. Click 'Test Connection & Save'!")
else:
    print("⚠️ Tunnel could not establish automatically. Check /kaggle/working/cloudflared.log")
print("═" * 70 + "\n")

# Keep cell alive for inference requests
try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    print("ConCode Brain shut down.")
