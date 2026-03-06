// Web Audio API sound effects - all sounds synthesized, no files needed

let ctx = null;
let masterGain = null;
let muted = false;
let volume = 0.5;

function ensureContext() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);
    } catch (e) {
      return false;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

export function unlock() {
  ensureContext();
}

export function toggleMute() {
  if (!ctx) return false;
  muted = !muted;
  masterGain.gain.value = muted ? 0 : volume;
  return muted;
}

// --- Synthesis primitives ---

function playTone(freq, duration, type, gain, rampDown) {
  if (!ensureContext()) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const vol = gain !== undefined ? gain : 0.3;
  osc.type = type || 'square';
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(masterGain);
  const now = ctx.currentTime;
  g.gain.setValueAtTime(vol, now);
  if (rampDown) {
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  }
  osc.start(now);
  osc.stop(now + duration + 0.01);
}

function playToneAt(freq, duration, type, gain, startTime, rampDown) {
  if (!ensureContext()) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const vol = gain !== undefined ? gain : 0.3;
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(masterGain);
  g.gain.setValueAtTime(vol, startTime);
  if (rampDown) {
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  }
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

function playSweep(startFreq, endFreq, duration, type, gain) {
  if (!ensureContext()) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const vol = gain !== undefined ? gain : 0.3;
  osc.type = type || 'sine';
  osc.connect(g);
  g.connect(masterGain);
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration + 0.01);
}

function playNoise(duration, gain) {
  if (!ensureContext()) return;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const g = ctx.createGain();
  const vol = gain !== undefined ? gain : 0.15;
  source.connect(g);
  g.connect(masterGain);
  const now = ctx.currentTime;
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.start(now);
  source.stop(now + duration + 0.01);
}

// --- Sound effects ---

export function playMenuNav() {
  playTone(880, 0.06, 'square', 0.3);
}

export function playMenuConfirm() {
  if (!ensureContext()) return;
  const now = ctx.currentTime;
  playToneAt(880, 0.07, 'square', 0.3, now);
  playToneAt(1320, 0.09, 'square', 0.3, now + 0.07, true);
}

export function playMenuCancel() {
  playSweep(440, 220, 0.12, 'square', 0.3);
}

export function playFootstep() {
  playTone(200, 0.05, 'triangle', 0.15, true);
}

export function playEncounterAlert() {
  if (!ensureContext()) return;
  const now = ctx.currentTime;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    playToneAt(freq, 0.1, 'square', 0.35, now + i * 0.1, true);
  });
}

export function playTransitionFlash() {
  playNoise(0.08, 0.2);
}

export function playAttack() {
  if (!ensureContext()) return;
  playNoise(0.1, 0.3);
  playSweep(800, 200, 0.18, 'sawtooth', 0.3);
}

export function playFaint() {
  playSweep(600, 100, 0.5, 'triangle', 0.3);
}

export function playCaptureSuccess() {
  if (!ensureContext()) return;
  const now = ctx.currentTime;
  const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
  notes.forEach((freq, i) => {
    const dur = i === notes.length - 1 ? 0.25 : 0.12;
    playToneAt(freq, dur, 'sine', 0.35, now + i * 0.12, true);
  });
}

export function playCaptureFailure() {
  if (!ensureContext()) return;
  const now = ctx.currentTime;
  playSweep(400, 800, 0.12, 'sine', 0.3);
  // Schedule second part using Web Audio timing instead of setTimeout
  playToneAt(800, 0.18, 'sine', 0.3, now + 0.12, true);
}

export function playBattleVictory() {
  if (!ensureContext()) return;
  const now = ctx.currentTime;
  const notes = [262, 330, 392, 523, 659]; // C4, E4, G4, C5, E5
  notes.forEach((freq, i) => {
    const dur = i === notes.length - 1 ? 0.35 : 0.14;
    playToneAt(freq, dur, 'sine', 0.35, now + i * 0.14, true);
  });
}
