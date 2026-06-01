# Whisper Service

FastAPI microservice for audio transcription using `faster-whisper`.

## Docker

Build the image from inside the `whisper-service` folder:

```powershell
docker build -t lolek-whisper-service .
```

Run the container on port `8001`:

```powershell
docker run --rm -p 8001:8001 lolek-whisper-service
```

If you want to keep the model cache between restarts, mount a volume for the Hugging Face cache:

```powershell
docker run --rm -p 8001:8001 -v ${PWD}\.hf-cache:/root/.cache/huggingface lolek-whisper-service
```

The container defaults to CPU mode (`FORCE_CPU=1`) so it works reliably without CUDA.

## Noise filter presets

You can control how aggressive the built-in filter is with the `NOISE_FILTER_PRESET` environment variable.

- `light` (default): mild denoising, preserves more of the original audio
- `medium`: moderate denoising
- `strong`: aggressive denoising (may remove desirable audio in noisy clips)

Example (use light preset):

```powershell
SET NOISE_FILTER_PRESET=light
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

Or with Docker:

```powershell
docker run -e NOISE_FILTER_PRESET=light -p 8001:8001 lolek-whisper-service
```

## Quick start

Create a virtual environment, install the dependencies, and start the server:

```powershell
cd .\whisper-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## What it does

- accepts uploaded audio at `POST /transcribe`
- runs transcription with Faster-Whisper
- returns a simple JSON response with the transcript text
- logs the recognized transcript to the console

## Notes

- On Windows PowerShell, you may need to allow script execution first:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
```

- If you created a `.venv` already, you can skip the first two commands and just activate it.


