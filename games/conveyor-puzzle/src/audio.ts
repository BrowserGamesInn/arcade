let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function resume(): void {
  const c = getCtx();
  if (c.state === 'suspended') void c.resume();
}

function playTone(
  frequency: number,
  type: OscillatorType,
  gainPeak: number,
  attackSec: number,
  decaySec: number,
): void {
  resume();
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime);
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(gainPeak, c.currentTime + attackSec);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + attackSec + decaySec);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + attackSec + decaySec);
}

export function playSpawn(): void {
  playTone(220, 'square', 0.08, 0.005, 0.06);
}

export function playConsume(): void {
  playTone(660, 'sine', 0.18, 0.01, 0.12);
}

export function playWin(): void {
  resume();
  const c = getCtx();
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const start = c.currentTime + i * 0.12;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}
