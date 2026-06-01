import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import { WhisperTranscriptResponse } from './types';

const WHISPER_SERVICE_URL = process.env.WHISPER_SERVICE_URL || 'http://localhost:8001/transcribe';

export async function transcribeWithWhisper(audioFilePath: string): Promise<string> {
  const formData = new FormData();
  const fileName = path.basename(audioFilePath);
  formData.append('file', fs.createReadStream(audioFilePath), fileName);
  try {
    const response = await axios.post<WhisperTranscriptResponse>(WHISPER_SERVICE_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const transcript = response.data?.text?.trim();
    if (!transcript) {
      const err: any = new Error('Whisper service returned an empty transcript');
      err.status = 502;
      throw err;
    }

    // Log the recognized transcript for visibility in the backend console
    try {
      // eslint-disable-next-line no-console
      console.info(`[whisper] transcribed: ${transcript}`);
    } catch {
      // ignore logging errors
    }

    return transcript;
  } catch (err: any) {
    // Normalize axios connection errors to a 503 so callers can return a useful client response
    if (axios.isAxiosError(err)) {
      const code = err.code;
      const status = err.response?.status || (code === 'ECONNREFUSED' ? 503 : 502);
      const message = `Whisper service error: ${code || err.message}`;
      const e: any = new Error(message);
      e.status = status;
      throw e;
    }

    throw err;
  }
}

