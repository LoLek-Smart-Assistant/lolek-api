# Whisper Service

FastAPI microservice for audio transcription using `faster-whisper`.

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

## Notes

- On Windows PowerShell, you may need to allow script execution first:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
```

- If you created a `.venv` already, you can skip the first two commands and just activate it.
