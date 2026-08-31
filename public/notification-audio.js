export const SOUND_STORAGE_KEY = 'lexflow-notification-sounds';

const TONES = Object.freeze({
  notification: [
    { frequency: 659.25, offset: 0, duration: 0.34, volume: 0.045 },
    { frequency: 987.77, offset: 0.1, duration: 0.42, volume: 0.035 },
  ],
  completion: [
    { frequency: 523.25, offset: 0, duration: 0.28, volume: 0.035 },
    { frequency: 659.25, offset: 0.075, duration: 0.32, volume: 0.038 },
    { frequency: 783.99, offset: 0.15, duration: 0.44, volume: 0.032 },
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
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(tone.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.volume, start + 0.025);
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
