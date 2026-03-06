// Web Audio API sound effects - all sounds synthesized, no files needed

let ctx = null;
let masterGain = null;
let muted = false;
let volume = 0.3;

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
  osc.type = type || 'square';
  osc.frequency.value = freq;
  g.gain.value = gain !== undefined ? gain : 0.3;
  osc.connect(g);
  g.connect(masterGain);
  const now = ctx.currentTime;
  osc.start(now);
  if (rampDown) {
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  }
  osc.stop(now + duration);
}

function playToneAt(freq, duration, type, gain, startTime, rampDown) {
  if (!ensureContext()) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  g.gain.value = gain !== undefined ? gain : 0.3;
  osc.connect(g);
  g.connect(masterGain);
  osc.start(startTime);
  if (rampDown) {
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  }
  osc.stop(startTime + duration);
}

function playSweep(startFreq, endFreq, duration, type, gain) {
  if (!ensureContext()) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = startFreq;
  g.gain.value = gain !== undefined ? gain : 0.3;
  osc.connect(g);
  g.connect(masterGain);
  const now = ctx.currentTime;
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

function playNoise(duration, gain) {
  if (!ensureContext()) return;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const g = ctx.createGain();
  g.gain.value = gain !== undefined ? gain : 0.15;
  source.connect(g);
  g.connect(masterGain);
  const now = ctx.currentTime;
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.start(now);
  source.stop(now + duration);
}

// --- Sound effects ---

export function playMenuNav() {
  playTone(880, 0.05, 'square', 0.2);
}

export function playMenuConfirm() {
  if (!ensureContext()) return;
  const now = ctx.currentTime;
  playToneAt(880, 0.06, 'square', 0.2, now);
  playToneAt(1320, 0.08, 'square', 0.2, now + 0.06, true);
}

export function playMenuCancel() {
  playSweep(440, 220, 0.1, 'square', 0.2);
}

export function playFootstep() {
  playTone(200, 0.03, 'triangle', 0.08, true);
}

export function playEncounterAlert() {
  if (!ensureContext()) return;
  const now = ctx.currentTime;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    playToneAt(freq, 0.08, 'square', 0.25, now + i * 0.08, true);
  });
}

export function playTransitionFlash() {
  playNoise(0.06, 0.15);
}

export function playAttack() {
  if (!ensureContext()) return;
  playNoise(0.08, 0.2);
  playSweep(800, 200, 0.15, 'sine', 0.25);
}

export function playFaint() {
  playSweep(600, 100, 0.5, 'triangle', 0.25);
}

export function playCaptureSuccess() {
  if (!ensureContext()) return;
  const now = ctx.currentTime;
  const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
  notes.forEach((freq, i) => {
    const dur = i === notes.length - 1 ? 0.2 : 0.1;
    playToneAt(freq, dur, 'sine', 0.25, now + i * 0.1, true);
  });
}

export function playCaptureFailure() {
  if (!ensureContext()) return;
  playSweep(400, 800, 0.1, 'sine', 0.2);
  setTimeout(() => playSweep(800, 300, 0.15, 'sine', 0.2), 100);
}

export function playBattleVictory() {
  if (!ensureContext()) return;
  const now = ctx.currentTime;
  const notes = [262, 330, 392, 523, 659]; // C4, E4, G4, C5, E5
  notes.forEach((freq, i) => {
    const dur = i === notes.length - 1 ? 0.3 : 0.12;
    playToneAt(freq, dur, 'sine', 0.25, now + i * 0.12, true);
  });
}
