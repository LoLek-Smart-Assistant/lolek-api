export type VoiceIntent = 'enemy_build_update' | 'recommendation_request';

export interface ParsedVoiceCommand {
  intent: VoiceIntent;
  champion?: string;
  items?: string[];
}

export interface WhisperTranscriptResponse {
  text: string;
}

