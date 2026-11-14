// Tiny synthesized sound effects (WebAudio), no audio files needed.
let ac: AudioContext | null = null;

export function unlockAudio() {
  try {
    ac ??= new AudioContext();
    if (ac.state === 'suspended') void ac.resume();
  } catch { /* audio unavailable */ }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slide = 0) {
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur);
}

export const sfx = {
  pick: () => tone(880, 0.09, 'triangle', 0.12, 300),
  score: () => { tone(660, 0.1, 'square', 0.06); setTimeout(() => tone(990, 0.15, 'square', 0.06), 90); },
  dash: () => tone(300, 0.18, 'sawtooth', 0.05, -180),
  bump: () => tone(140, 0.12, 'triangle', 0.15, -60),
  power: () => { tone(520, 0.1, 'triangle', 0.1); setTimeout(() => tone(780, 0.1, 'triangle', 0.1), 80); setTimeout(() => tone(1040, 0.18, 'triangle', 0.1), 160); },
  tool: (t: 'axe' | 'pickaxe' | 'rake', drop: boolean) => {
    if (t === 'axe') tone(180, 0.08, 'square', 0.07, -60);
    else if (t === 'pickaxe') tone(520, 0.07, 'square', 0.05, 200);
    else tone(330, 0.07, 'triangle', 0.08, 120);
    if (drop) setTimeout(() => tone(880, 0.09, 'triangle', 0.1, 300), 90);
  },
  star: () => { tone(784, 0.15, 'square', 0.07); setTimeout(() => tone(1175, 0.25, 'square', 0.07), 120); },
};
