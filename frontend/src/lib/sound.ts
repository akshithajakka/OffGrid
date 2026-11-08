// Alert sounds made in code: no audio files, works offline.
// Browsers only allow sound after the person has tapped something once.
let ctx: AudioContext | null = null;

export function beep(times = 1, freq = 880) {
  try {
    ctx ??= new AudioContext();
    const c = ctx;
    if (c.state === 'suspended') void c.resume();
    for (let i = 0; i < times; i++) {
      const t = c.currentTime + i * 0.28;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    }
  } catch {
    /* no sound available */
  }
}

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
