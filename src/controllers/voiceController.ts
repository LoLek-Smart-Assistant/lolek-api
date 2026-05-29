import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import { parseVoiceTranscript } from '../voice/parser';
import { normalizeTranscript } from '../voice/normalizer';
import { transcribeWithWhisper } from '../voice/whisperClient';

const tempUploadDir = path.join(os.tmpdir(), 'lolek-api-voice');

async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      await ensureUploadDir();
      callback(null, tempUploadDir);
    } catch (error) {
      callback(error as Error, tempUploadDir);
    }
  },
  filename: (_req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname || '') || '.webm';
    callback(null, `voice-${uniqueSuffix}${extension}`);
  },
});

export const voiceUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

const acceptedUploadFields = ['audio', 'file', 'voice', 'blob'] as const;
const uploadFieldsMiddleware = voiceUpload.fields(
  acceptedUploadFields.map((name) => ({ name, maxCount: 1 }))
);

export function voiceUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  uploadFieldsMiddleware(req, res, (error?: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({
          error: `Unexpected file field. Use one of: ${acceptedUploadFields.join(', ')}`,
        });
        return;
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Audio file is too large (max 25MB)' });
        return;
      }
    }

    next(error as any);
  });
}

function resolveUploadedFile(req: Request): Express.Multer.File | undefined {
  if (req.file) {
    return req.file;
  }

  if (!req.files) {
    return undefined;
  }

  if (Array.isArray(req.files)) {
    return req.files[0];
  }

  const filesByField = req.files as Record<string, Express.Multer.File[]>;
  for (const fieldName of acceptedUploadFields) {
    const file = filesByField[fieldName]?.[0];
    if (file) {
      return file;
    }
  }

  const firstField = Object.keys(filesByField)[0];
  return firstField ? filesByField[firstField]?.[0] : undefined;
}

async function removeTempFile(filePath?: string): Promise<void> {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore cleanup errors.
  }
}

// POST /voice/transcribe
export async function transcribeVoice(req: Request, res: Response): Promise<void> {
  const uploadedFile = resolveUploadedFile(req);

  if (!uploadedFile) {
    res.status(400).json({ error: 'No audio file was uploaded' });
    return;
  }

  try {
    const rawTranscript = await transcribeWithWhisper(uploadedFile.path);
    const transcript = normalizeTranscript(rawTranscript);
    const parsed = await parseVoiceTranscript(transcript);

    res.json({ transcript, parsed });
  } catch (error: any) {
    console.error('transcribeVoice error:', error);

    // Whisper service unreachable or returned a service-level error
    if (error?.status === 503 || error?.status === 502 || error?.code === 'ECONNREFUSED') {
      res.status(503).json({ error: error?.message || 'Whisper service unavailable' });
      return;
    }

    res.status(500).json({ error: error?.message || 'Failed to transcribe audio' });
  } finally {
    await removeTempFile(uploadedFile.path);
  }
}

