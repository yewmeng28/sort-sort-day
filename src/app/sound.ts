/** Tiny synthesized UI sounds (our own, no sampled assets). Browsers need a user gesture before audio can start. */
type Sfx = 'tick' | 'confirm' | 'cancel' | 'chest' | 'sneak';

const MUTE_KEY = 'ssd:muted';

let ctx: AudioContext | undefined;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export const isMuted = () => muted;

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    /* storage unavailable: the preference just won't persist */
  }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain = 0.12, slideTo?: number) {
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
  amp.gain.setValueAtTime(gain, c.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(amp).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.02);
}

export function play(sfx: Sfx) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    switch (sfx) {
      case 'tick':
        tone(ctx, 880, 0, 0.05, 'square', 0.05);
        break;
      case 'confirm':
        tone(ctx, 523, 0, 0.09, 'triangle');
        tone(ctx, 784, 0.09, 0.14, 'triangle');
        break;
      case 'cancel':
        tone(ctx, 440, 0, 0.08, 'triangle');
        tone(ctx, 294, 0.08, 0.12, 'triangle');
        break;
      case 'chest':
        tone(ctx, 120, 0, 0.25, 'sawtooth', 0.08, 70);
        tone(ctx, 392, 0.2, 0.1, 'triangle');
        tone(ctx, 587, 0.3, 0.18, 'triangle');
        break;
      case 'sneak':
        tone(ctx, 300, 0, 0.12, 'sine', 0.08, 600);
        tone(ctx, 600, 0.14, 0.12, 'sine', 0.08, 200);
        break;
    }
  } catch {
    /* audio unavailable: stay silent */
  }
}
