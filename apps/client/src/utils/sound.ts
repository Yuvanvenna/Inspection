/**
 * Sound Utility for Antigravity Inspection Platform
 * Synthesizes a crisp, elegant dual-tone audio chime using the Web Audio API.
 * No external MP3/audio files needed; works reliably across all modern browsers.
 */

const AUDIO_CHIME_KEY = 'inspection_audio_chime_enabled';

/**
 * Checks if notification audio chime is enabled for the current user.
 */
export function isSoundEnabled(userId?: string): boolean {
  try {
    const key = userId ? `${AUDIO_CHIME_KEY}_${userId}` : AUDIO_CHIME_KEY;
    const val = localStorage.getItem(key);
    if (val !== null) {
      return val === 'true';
    }
    // Check fallback global key
    const globalVal = localStorage.getItem(AUDIO_CHIME_KEY);
    return globalVal === 'true';
  } catch {
    return false;
  }
}

/**
 * Enables or disables the notification audio chime.
 */
export function setSoundEnabled(enabled: boolean, userId?: string): void {
  try {
    const key = userId ? `${AUDIO_CHIME_KEY}_${userId}` : AUDIO_CHIME_KEY;
    localStorage.setItem(key, String(enabled));
    localStorage.setItem(AUDIO_CHIME_KEY, String(enabled));
  } catch (err) {
    console.warn('Failed to save sound preference to localStorage:', err);
  }
}

/**
 * Plays a pleasant, subtle two-tone notification chime.
 * Frequency 1: 587.33 Hz (D5) -> Frequency 2: 880.00 Hz (A5)
 */
export function playNotificationSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // Browser autoplay policy requires user interaction before audio plays
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // --- Tone 1 (D5 ~ 587.33Hz) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.36);

    // --- Tone 2 (A5 ~ 880.00Hz, harmonious fifth above) ---
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.09);

    gain2.gain.setValueAtTime(0, now + 0.09);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.09);
    osc2.stop(now + 0.56);

    // Auto-close context after playing to free audio resources
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch (err) {
    console.warn('Audio chime playback was blocked or failed:', err);
  }
}
