const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const LOOKAHEAD = 0.14; // seconds scheduled ahead
const TICK_MS = 25;

/**
 * Tiny step-sequencer synth on the Web Audio API.
 * Everything is generated live, so there are no audio files to license or host.
 */
export class SynthEngine {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.playing = false;
    this.volume = 0.6;
    this.timer = 0;
    this.step = 0;
    this.stepTime = 0;
    this.anchor = 0; // ctx time that corresponds to position 0 of the current loop
    this.pausedPos = 0;
    this.bus = null;
  }

  /* ---------- setup ---------- */
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.volume * 0.9;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.ratio.value = 4;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.78;

    // short feedback delay for the plucks and bells
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = 0.3;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    this.delay.connect(fb);
    fb.connect(this.delay);
    this.delay.connect(wet);
    this.sendIn = ctx.createGain();
    this.sendIn.connect(this.delay);

    this.master.connect(this.comp);
    wet.connect(this.comp);
    this.comp.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // reusable noise buffer
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  get stepDur() {
    return 60 / this.track.bpm / 4;
  }
  get totalSteps() {
    return this.track.bars * 16;
  }
  get duration() {
    return this.totalSteps * this.stepDur;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v * 0.9, this.ctx.currentTime, 0.02);
  }

  getAnalyser() {
    return this.analyser || null;
  }

  /* ---------- transport ---------- */
  load(track) {
    const wasPlaying = this.playing;
    this.stopTimer();
    this.silence();
    this.track = track;
    this.pausedPos = 0;
    this.playing = false;
    if (wasPlaying) this.play();
  }

  position() {
    if (!this.track) return 0;
    if (!this.playing) return this.pausedPos;
    const d = this.duration;
    const p = this.ctx.currentTime - this.anchor;
    return ((p % d) + d) % d;
  }

  play() {
    this.ensure();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.silence();
    this.bus = this.ctx.createGain();
    this.bus.connect(this.master);
    this.playing = true;
    this.beginAt(this.pausedPos);
    this.stopTimer();
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  pause() {
    if (!this.playing) return;
    this.pausedPos = this.position();
    this.playing = false;
    this.stopTimer();
    this.silence();
  }

  seek(seconds) {
    const pos = Math.max(0, Math.min(this.duration - 0.01, seconds));
    if (this.playing) {
      this.silence();
      this.bus = this.ctx.createGain();
      this.bus.connect(this.master);
      this.beginAt(pos);
      this.schedule();
    } else {
      this.pausedPos = pos;
    }
  }

  beginAt(pos) {
    this.step = Math.round(pos / this.stepDur) % this.totalSteps;
    this.stepTime = this.ctx.currentTime + 0.06;
    this.anchor = this.stepTime - this.step * this.stepDur;
  }

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = 0;
  }

  /** Cut everything already scheduled by unplugging the per-play bus. */
  silence() {
    if (this.bus) {
      const old = this.bus;
      try {
        old.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
      } catch {
        /* ignore */
      }
      window.setTimeout(() => old.disconnect(), 120);
      this.bus = null;
    }
  }

  schedule() {
    if (!this.playing) return;
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    while (this.stepTime < horizon) {
      this.playStep(this.step, this.stepTime);
      this.step += 1;
      this.stepTime += this.stepDur;
      if (this.step >= this.totalSteps) {
        this.step = 0;
        this.anchor = this.stepTime;
      }
    }
  }

  /* ---------- sequencing ---------- */
  playStep(step, t) {
    const tr = this.track;
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chordIdx = bar % tr.chords.length;
    const chord = tr.chords[chordIdx];
    const swing = s % 2 === 1 ? tr.swing : 0;
    const when = t + swing;
    const on = (pat) => pat && pat[s] === 'x';

    if (on(tr.kick)) this.kick(when);
    if (on(tr.snare)) this.snare(when);
    if (on(tr.hat)) this.hat(when, false, s % 4 === 0 ? 1 : 0.55);
    if (on(tr.openHat)) this.hat(when, true, 1);
    if (on(tr.bass)) this.bass(when, midiToHz(tr.bassRoots[chordIdx]), this.stepDur * (tr.bpm > 120 ? 3 : 2.4));

    if (tr.pad && s === 0) this.pad(when, chord, this.stepDur * 16 * 0.98);

    if (tr.arp && on(tr.arp.pattern)) {
      const note = chord[tr.arp.order[(s / 2) % tr.arp.order.length | 0]] + tr.arp.octave;
      this.pluck(when, midiToHz(note));
    }

    if (tr.bell) {
      const pattern = tr.bell[bar % tr.bell.length];
      const idx = pattern[s];
      if (idx >= 0) this.bell(when, midiToHz(chord[idx] + 24));
    }

    if (tr.stab && on(tr.stab)) this.stab(when, chord);
  }

  /* ---------- voices ---------- */
  out() {
    return this.bus;
  }

  env(gainNode, t, peak, attack, release) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + release);
  }

  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(155, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    this.env(g, t, 0.95, 0.004, 0.34);
    o.connect(g).connect(this.out());
    o.start(t);
    o.stop(t + 0.42);
  }

  snare(t) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2200;
    f.Q.value = 0.8;
    const g = ctx.createGain();
    this.env(g, t, 0.4, 0.002, 0.17);
    n.connect(f).connect(g).connect(this.out());
    n.start(t, Math.random() * 0.5);
    n.stop(t + 0.22);

    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(210, t);
    o.frequency.exponentialRampToValueAtTime(130, t + 0.08);
    this.env(og, t, 0.3, 0.002, 0.1);
    o.connect(og).connect(this.out());
    o.start(t);
    o.stop(t + 0.14);
  }

  hat(t, open, vel) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7200;
    const g = ctx.createGain();
    const len = open ? 0.2 : 0.045;
    this.env(g, t, 0.13 * vel, 0.001, len);
    n.connect(f).connect(g).connect(this.out());
    n.start(t, Math.random() * 0.5);
    n.stop(t + len + 0.03);
  }

  bass(t, hz, len) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz;
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = hz;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const g = ctx.createGain();
    this.env(g, t, 0.62, 0.01, len);
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    o.connect(g);
    o2.connect(g2).connect(lp).connect(g);
    g.connect(this.out());
    o.start(t);
    o2.start(t);
    o.stop(t + len + 0.06);
    o2.stop(t + len + 0.06);
  }

  pad(t, chord, len) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.linearRampToValueAtTime(1500, t + len * 0.5);
    lp.frequency.linearRampToValueAtTime(600, t + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + len);
    lp.connect(g).connect(this.out());
    chord.forEach((m) => {
      [-6, 6].forEach((detune) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midiToHz(m);
        o.detune.value = detune;
        o.connect(lp);
        o.start(t);
        o.stop(t + len + 0.05);
      });
    });
  }

  pluck(t, hz) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz;
    const g = ctx.createGain();
    this.env(g, t, 0.16, 0.004, 0.26);
    o.connect(g);
    g.connect(this.out());
    g.connect(this.sendIn);
    o.start(t);
    o.stop(t + 0.34);
  }

  bell(t, hz) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    this.env(g, t, 0.17, 0.003, 1.1);
    g.connect(this.out());
    g.connect(this.sendIn);
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([mult, amp]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz * mult;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 1.2);
    });
  }

  stab(t, chord) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.22);
    const g = ctx.createGain();
    this.env(g, t, 0.13, 0.004, 0.2);
    lp.connect(g);
    g.connect(this.out());
    g.connect(this.sendIn);
    chord.forEach((m) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midiToHz(m + 12);
      o.connect(lp);
      o.start(t);
      o.stop(t + 0.28);
    });
  }
}
