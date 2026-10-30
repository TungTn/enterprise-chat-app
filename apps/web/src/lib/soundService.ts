/**
 * Sound Service - Zero-dependency Web Audio Synthesizer
 * Provides subtle audio tones for sent/received messages and phone ringtones.
 */

let audioCtx: AudioContext | null = null;
let ringtoneInterval: number | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Automatically unlock Web Audio on first user interaction anywhere in the window
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('click', unlockAudio, { passive: true });
}

/**
 * Play a subtle "pop / swoosh" sound when sending a message
 */
export function playMessageSentSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // Ignore audio restrictions
  }
}

/**
 * Play harmonic dual-chime (C5 -> E5) when receiving a message
 */
export function playMessageReceivedSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First note: C5 (~523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Second note: E5 (~659.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.09);
    gain2.gain.setValueAtTime(0.25, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.33);
  } catch {
    // Ignore audio restrictions
  }
}

/**
 * Synthesize standard dual-frequency telephone ringback tone (440Hz + 480Hz)
 */
function playSingleRingBurst(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const duration = 1.2;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(440, now);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(480, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
  gain.gain.setValueAtTime(0.08, now + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0.0001, now + duration);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + duration);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
}

/**
 * Start looping ringtone for active calls
 */
export function playCallRingtone(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    stopCallRingtone();
    playSingleRingBurst(ctx);

    ringtoneInterval = window.setInterval(() => {
      const activeCtx = getAudioContext();
      if (activeCtx) {
        playSingleRingBurst(activeCtx);
      }
    }, 3200);
  } catch {
    // Ignore audio restrictions
  }
}

/**
 * Stop active ringtone
 */
export function stopCallRingtone(): void {
  if (ringtoneInterval !== null) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

/**
 * Play call disconnection beep
 */
export function playCallEndSound(): void {
  try {
    stopCallRingtone();
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.setValueAtTime(320, now + 0.12);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Ignore audio restrictions
  }
}
