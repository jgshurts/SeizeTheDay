// A short two-beep chime for "meeting starting soon", synthesized with the
// Web Audio API rather than shipping an audio file. Reuses one AudioContext
// across calls -- browsers cap how many can exist, and creating one fresh
// per beep would eventually throw.
let audioContext: AudioContext | null = null;

export function playAlertTone(): void {
  try {
    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioContext) audioContext = new AudioContextCtor();

    const ctx = audioContext;
    // Autoplay policies suspend a freshly-created context until a user
    // gesture happens somewhere on the page -- by the time a meeting alert
    // fires the user has almost certainly clicked something, but resume()
    // is a harmless no-op if the context is already running.
    void ctx.resume();

    const startTime = ctx.currentTime;
    for (const offset of [0, 0.22]) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, startTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, startTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + offset + 0.18);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startTime + offset);
      oscillator.stop(startTime + offset + 0.2);
    }
  } catch {
    // Audio can be unavailable (blocked autoplay, no AudioContext support)
    // -- the glow effect on the event itself still carries the alert.
  }
}
