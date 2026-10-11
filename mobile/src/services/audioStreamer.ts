/**
 * NeerNetra Audio Streamer
 * =======================
 * Cross-platform AudioTrack & AudioRecord PCM stream controller.
 * Handles high-fidelity 16kHz PCM chunk streaming, loudspeaker routing,
 * audio focus acquisition, and AMR voice burst playback for Walkie-Talkie.
 */

import {
  playAudioChunk,
  stopAudioChunkPlayback,
  startAudioCaptureStream,
  stopAudioCaptureStream,
  subscribeToAudioCapture,
  playVoiceAudio,
  stopVoiceAudio,
  playPttTone,
} from './gattServerBridge';

class AudioStreamer {
  private isCapturing: boolean = false;
  private isPlaying: boolean = false;
  private unsubscribeCaptureListener: (() => void) | null = null;
  private chunkCallback: ((chunk: string, sampleRate: number) => void) | null = null;

  constructor() {
    this.setupCaptureListener();
  }

  private setupCaptureListener() {
    this.unsubscribeCaptureListener = subscribeToAudioCapture((event) => {
      if (this.isCapturing && this.chunkCallback && event.chunk) {
        this.chunkCallback(event.chunk, event.sampleRate || 16000);
      }
    });
  }

  /**
   * Start live microphone audio streaming (16kHz PCM chunks)
   * Emits chunks to the callback in real-time as recorded by native AudioRecord.
   */
  public async startMicrophoneStream(
    onChunk: (chunk: string, sampleRate: number) => void
  ): Promise<boolean> {
    if (this.isCapturing) return true;
    try {
      this.chunkCallback = onChunk;
      this.isCapturing = true;
      const started = await startAudioCaptureStream();
      if (!started) {
        this.isCapturing = false;
        this.chunkCallback = null;
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[AudioStreamer] startMicrophoneStream error:', err);
      this.isCapturing = false;
      this.chunkCallback = null;
      return false;
    }
  }

  /**
   * Stop live microphone audio streaming
   */
  public async stopMicrophoneStream(): Promise<boolean> {
    this.isCapturing = false;
    this.chunkCallback = null;
    try {
      return await stopAudioCaptureStream();
    } catch (err) {
      console.warn('[AudioStreamer] stopMicrophoneStream error:', err);
      return false;
    }
  }

  /**
   * Play an incoming PCM audio chunk on the device loudspeaker via AudioTrack.
   * Acquires AudioFocus and sets speakerphone routing.
   */
  public async playChunk(base64Chunk: string): Promise<boolean> {
    if (!base64Chunk || base64Chunk.trim().length === 0) return false;
    try {
      this.isPlaying = true;
      // If the incoming audio payload is a full AMR container, route to playVoiceAudio
      if (base64Chunk.startsWith('IyFBTVI') || base64Chunk.startsWith('#!AMR')) {
        return await playVoiceAudio(base64Chunk);
      }
      return await playAudioChunk(base64Chunk);
    } catch (err) {
      console.warn('[AudioStreamer] playChunk error:', err);
      return false;
    }
  }

  /**
   * Play a full voice burst (AMR-NB or PCM) on loudspeaker with tone notification
   */
  public async playVoice(base64Audio: string, playTone: boolean = true): Promise<boolean> {
    if (!base64Audio || base64Audio.trim().length === 0) return false;
    try {
      this.isPlaying = true;
      if (playTone) {
        await playPttTone('incoming').catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      return await playVoiceAudio(base64Audio);
    } catch (err) {
      console.warn('[AudioStreamer] playVoice error:', err);
      return false;
    } finally {
      setTimeout(() => {
        this.isPlaying = false;
      }, 2500);
    }
  }

  /**
   * Stop all active audio playback, releasing AudioTrack and AudioFocus
   */
  public async stopPlayback(): Promise<boolean> {
    this.isPlaying = false;
    try {
      await stopAudioChunkPlayback().catch(() => {});
      await stopVoiceAudio().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  public isCapturingAudio(): boolean {
    return this.isCapturing;
  }

  public isPlayingAudio(): boolean {
    return this.isPlaying;
  }

  public destroy() {
    if (this.unsubscribeCaptureListener) {
      this.unsubscribeCaptureListener();
      this.unsubscribeCaptureListener = null;
    }
    this.stopMicrophoneStream().catch(() => {});
    this.stopPlayback().catch(() => {});
  }
}

export const audioStreamer = new AudioStreamer();
