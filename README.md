# Voice recognition pipeline

This repository now includes a lightweight League of Legends voice pipeline:

- `POST /voice/transcribe` in the TypeScript backend
- a separate Python FastAPI Whisper microservice at `whisper-service/main.py`
- transcript normalization and dictionary-based parsing for LoL terminology

## TypeScript backend

Install the required packages:

```bash
npm install express cors dotenv multer axios form-data fuse.js
npm install -D typescript ts-node-dev @types/node @types/express @types/multer @types/form-data
```

Run the backend as usual:

```bash
npm run dev
```

The new route accepts `multipart/form-data` with an `audio` file field:

- `POST /voice/transcribe`

Set `WHISPER_SERVICE_URL` if the Python service is not running at the default:

- `http://localhost:8001/transcribe`

## Python Whisper service

Install the dependencies:

```bash
pip install fastapi uvicorn faster-whisper python-multipart
```

Run the service:

```bash
cd whisper-service
uvicorn main:app --host 0.0.0.0 --port 8001
```

## Response shape

Example response from the backend:

```json
{
  "transcript": "Sion built Thornmail and Heartsteel",
  "parsed": {
    "intent": "enemy_build_update",
    "champion": "Sion",
    "items": ["Thornmail", "Heartsteel"]
  }
}
```

