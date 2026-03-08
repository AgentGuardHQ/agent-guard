// Web Audio API sound effects - all synthesized
let audioCtx = null,
  masterGain = null,
  muted = false,
  volume = 0.5;

function init() {
  if (audioCtx) return true;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(audioCtx.destination);
    return true;
  } catch (e) {
    return false;
  }
}

function ok() {
  if (!init()) return false;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return true;
}

export function unlock() {
  init();
  if (audioCtx?.state === 'suspended') audioCtx.resume();
}

export function toggleMute() {
  if (!audioCtx) return false;
  muted = !muted;
  masterGain.gain.value = muted ? 0 : volume;
  return muted;
}

function tone(freq, dur, type, vol, fade) {
  if (!ok()) return;
  try {
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = vol ?? 0.3;
    o.connect(g);
    g.connect(masterGain);
    o.start();
    if (fade) {
      g.gain.setValueAtTime(vol ?? 0.3, audioCtx.currentTime);
      g.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    }
    o.stop(audioCtx.currentTime + dur + 0.05);
  } catch (e) {}
}

function sweep(f1, f2, dur, type, vol) {
  if (!ok()) return;
  try {
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.type = type || 'sine';
    g.gain.value = vol ?? 0.3;
    o.connect(g);
    g.connect(masterGain);
    const t = audioCtx.currentTime;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    g.gain.setValueAtTime(vol ?? 0.3, t);
    g.gain.linearRampToValueAtTime(0.001, t + dur);
    o.start();
    o.stop(t + dur + 0.05);
  } catch (e) {}
}

function noise(dur, vol) {
  if (!ok()) return;
  try {
    const n = Math.max(1, (audioCtx.sampleRate * dur) | 0);
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = audioCtx.createBufferSource(),
      g = audioCtx.createGain();
    s.buffer = buf;
    g.gain.value = vol ?? 0.2;
    s.connect(g);
    g.connect(masterGain);
    s.start();
    s.stop(audioCtx.currentTime + dur + 0.05);
  } catch (e) {}
}

function delayed(fn, ms) {
  setTimeout(fn, ms);
}

export function playMenuNav() {
  tone(880, 0.06, 'square', 0.3);
}
export function playMenuConfirm() {
  tone(880, 0.07, 'square', 0.3);
  delayed(() => tone(1320, 0.09, 'square', 0.3, true), 70);
}
export function playMenuCancel() {
  sweep(440, 220, 0.12, 'square', 0.3);
}
export function playFootstep() {
  tone(200, 0.06, 'triangle', 0.15, true);
}

export function playEncounterAlert() {
  [523, 659, 784, 1047].forEach((f, i) =>
    delayed(() => tone(f, 0.1, 'square', 0.35, true), i * 100)
  );
}

export function playTransitionFlash() {
  noise(0.08, 0.25);
}
export function playAttack() {
  noise(0.1, 0.3);
  sweep(800, 200, 0.18, 'sawtooth', 0.3);
}
export function playFaint() {
  sweep(600, 100, 0.5, 'triangle', 0.3);
}

export function playCaptureSuccess() {
  [523, 659, 784, 1047, 1319].forEach((f, i) =>
    delayed(() => tone(f, i === 4 ? 0.25 : 0.12, 'sine', 0.35, true), i * 120)
  );
}

export function playCaptureFailure() {
  sweep(400, 800, 0.12, 'sine', 0.3);
  delayed(() => tone(600, 0.2, 'sine', 0.25, true), 130);
}

export function playBattleVictory() {
  [262, 330, 392, 523, 659].forEach((f, i) =>
    delayed(() => tone(f, i === 4 ? 0.35 : 0.14, 'sine', 0.35, true), i * 140)
  );
}

export function playEvolution() {
  sweep(200, 800, 1.5, 'sine', 0.2);
  [523, 659, 784, 880, 1047, 1319, 1568].forEach((f, i) =>
    delayed(() => tone(f, 0.3, 'sine', 0.15, true), 500 + i * 350)
  );
  [784, 988, 1175, 1568].forEach((f, i) =>
    delayed(() => tone(f, i === 3 ? 0.5 : 0.2, 'sine', 0.3, true), 3200 + i * 200)
  );
}
