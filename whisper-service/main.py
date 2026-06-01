from __future__ import annotations

import os
import tempfile
from pathlib import Path

import logging

from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')

app = FastAPI(title='LoL Whisper Service')

_model: WhisperModel | None = None


def _cuda_available() -> bool:
    """Return True if PyTorch reports a usable CUDA device.

    This is a best-effort check; if torch is not installed or CUDA isn't
    available, returns False.
    """
    try:
        import torch

        return torch.cuda.is_available()
    except Exception:
        return False


def get_model() -> WhisperModel:
    global _model

    if _model is not None:
        return _model

    # Allow forcing CPU via environment for machines without proper CUDA
    force_cpu = os.environ.get('FORCE_CPU', '0') in ('1', 'true', 'True')

    use_cuda = not force_cpu and _cuda_available()

    if use_cuda:
        logging.info('Initializing WhisperModel on CUDA (float16)')
        try:
            _model = WhisperModel('small.en', device='cuda', compute_type='float16')
            return _model
        except Exception:
            logging.exception('Failed to initialize CUDA model, falling back to CPU')

    logging.info('Initializing WhisperModel on CPU (int8)')
    _model = WhisperModel('small.en', device='cpu', compute_type='int8')
    return _model


def apply_background_noise_filter(input_path: str) -> str:
    # No background filtering applied. The uploaded audio will be passed
    # directly to the transcription model.
    return input_path


@app.post('/transcribe')
async def transcribe(file: UploadFile = File(...)) -> dict[str, str]:
    global _model

    suffix = Path(file.filename or '').suffix or '.audio'
    temp_path = None
    filtered_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(await file.read())
            temp_path = temp_file.name

        model = get_model()

        try:
            segments, _info = model.transcribe(temp_path, beam_size=5)
        except RuntimeError as runtime_exc:
            # Detect missing CUDA runtime DLLs (eg. cublas64_12.dll) and retry once on CPU
            msg = str(runtime_exc).lower()
            if 'cublas' in msg or 'cublas64' in msg or 'cuda' in msg:
                logging.exception('CUDA runtime error during transcription; retrying on CPU')
                # Recreate model as CPU and retry
                try:
                    # Reset global model and force CPU
                    _model = None
                    os.environ['FORCE_CPU'] = '1'
                    model = get_model()
                    segments, _info = model.transcribe(temp_path, beam_size=5)
                except Exception:
                    logging.exception('Retry on CPU also failed')
                    raise
            else:
                raise

        text = ' '.join(segment.text.strip() for segment in segments).strip()
        # Log the recognized transcript for debugging/visibility
        logging.info(f"Transcribed: {text}")

        return {'text': text}
    except Exception as exc:  # pragma: no cover - service level guard
        # Log full traceback to help diagnose 500 responses from clients
        logging.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:

        try:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host='0.0.0.0', port=8001)


