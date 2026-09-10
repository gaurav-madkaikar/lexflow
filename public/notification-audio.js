export const SOUND_STORAGE_KEY = 'lexflow-notification-sounds';

const TONES = Object.freeze({
  notification: [
    { frequency: 587.33, glideFrom: 554.37, offset: 0, duration: 0.42, volume: 0.025, type: 'sine' },
    { frequency: 880, glideFrom: 830.61, offset: 0.09, duration: 0.54, volume: 0.022, type: 'sine' },
    { frequency: 1760, offset: 0.13, duration: 0.31, volume: 0.006, type: 'triangle', attack: 0.012 },
  ],
  completion: [
    { frequency: 392, offset: 0, duration: 0.44, volume: 0.018, type: 'triangle' },
    { frequency: 523.25, glideFrom: 493.88, offset: 0.035, duration: 0.48, volume: 0.024, type: 'sine' },
    { frequency: 659.25, offset: 0.11, duration: 0.52, volume: 0.022, type: 'sine' },
    { frequency: 783.99, offset: 0.19, duration: 0.58, volume: 0.02, type: 'sine' },
    { frequency: 1046.5, offset: 0.27, duration: 0.5, volume: 0.012, type: 'triangle', attack: 0.018 },
  ],
  read: [
    { frequency: 783.99, offset: 0, duration: 0.22, volume: 0.03 },
    { frequency: 659.25, offset: 0.065, duration: 0.3, volume: 0.026 },
  ],
});

function safeGet(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Retain the preference in memory when storage is unavailable.
  }
}

export function createNotificationAudio({ storage, AudioContextClass, eventTarget }) {
  let context = null;
  let soundsEnabled = safeGet(storage, SOUND_STORAGE_KEY) !== 'muted';

  async function arm() {
    if (!AudioContextClass) return false;
    try {
      context ??= new AudioContextClass();
      if (context.state === 'suspended') await context.resume();
      return context.state === 'running';
    } catch {
      return false;
    }
  }

  function playChime(tones) {
    if (!soundsEnabled || !context || context.state !== 'running') return false;
    const now = context.currentTime;
    for (const tone of tones) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + tone.offset;
      const attack = tone.attack ?? 0.025;
      oscillator.type = tone.type ?? 'sine';
      oscillator.frequency.setValueAtTime(tone.glideFrom ?? tone.frequency, start);
      if (tone.glideFrom) {
        oscillator.frequency.exponentialRampToValueAtTime(tone.frequency, start + Math.min(0.09, tone.duration / 3));
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.volume, start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + tone.duration + 0.02);
    }
    return true;
  }

  const armFromGesture = () => { void arm(); };
  eventTarget?.addEventListener('pointerdown', armFromGesture, { once: true, capture: true });
  eventTarget?.addEventListener('keydown', armFromGesture, { once: true, capture: true });

  function setEnabled(value) {
    soundsEnabled = Boolean(value);
    safeSet(storage, SOUND_STORAGE_KEY, soundsEnabled ? 'enabled' : 'muted');
    return soundsEnabled;
  }

  return {
    arm,
    enabled: () => soundsEnabled,
    setEnabled,
    toggle: () => setEnabled(!soundsEnabled),
    playNotification: () => playChime(TONES.notification),
    playCompletion: () => playChime(TONES.completion),
    playRead: () => playChime(TONES.read),
    destroy() {
      eventTarget?.removeEventListener('pointerdown', armFromGesture, true);
      eventTarget?.removeEventListener('keydown', armFromGesture, true);
      try {
        const closing = context?.close?.();
        closing?.catch?.(() => undefined);
      } catch {
        // Closing is best-effort and must not affect the application.
      }
    },
  };
}
