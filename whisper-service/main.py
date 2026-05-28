from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel
import logging

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')

app = FastAPI(title='LoL Whisper Service')

_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    global _model

    if _model is not None:
        return _model

    try:
        _model = WhisperModel('small.en', device='cuda', compute_type='float16')
    except Exception:
        # Fallback keeps the service usable on local CPU-only machines.
        _model = WhisperModel('small.en', device='cpu', compute_type='int8')

    return _model


@app.post('/transcribe')
async def transcribe(file: UploadFile = File(...)) -> dict[str, str]:
    suffix = Path(file.filename or '').suffix or '.audio'
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(await file.read())
            temp_path = temp_file.name

        model = get_model()
        segments, _info = model.transcribe(temp_path, beam_size=5)
        text = ' '.join(segment.text.strip() for segment in segments).strip()
        # Log the recognized transcript for debugging/visibility
        logging.info(f"Transcribed: {text}")
        return {'text': text}
    except Exception as exc:  # pragma: no cover - service level guard
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host='0.0.0.0', port=8001)


