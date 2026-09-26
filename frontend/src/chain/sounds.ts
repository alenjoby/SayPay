/**
 * Transaction sounds, distinct from the app's other earcons so a blind user can
 * tell the stages apart without words: Pending = two soft low blips,
 * Confirmed = a rising three-note chime, Failed = a falling two-note tone.
 */
let ctx: AudioContext | null = null;

function tone(freq: number, start: number, dur: number, gain = 0.12, type: OscillatorType = 'sine') {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function ready(): boolean {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    ctx = ctx ?? new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

export const txSounds = {
  pending() {
    if (!ready()) return;
    tone(392, 0, 0.09, 0.08);
    tone(392, 0.16, 0.09, 0.08);
  },
  confirmed() {
    if (!ready()) return;
    tone(523.25, 0, 0.12);
    tone(659.25, 0.1, 0.12);
    tone(783.99, 0.2, 0.22);
  },
  failed() {
    if (!ready()) return;
    tone(349.23, 0, 0.16, 0.1, 'triangle');
    tone(261.63, 0.15, 0.26, 0.1, 'triangle');
  },
};
