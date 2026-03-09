class SoundManager {
  private muted: boolean;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.muted = localStorage.getItem('sound_muted') === 'true';
  }

  get isMuted() {
    return this.muted;
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem('sound_muted', String(this.muted));
    return this.muted;
  }

  setMuted(val: boolean) {
    this.muted = val;
    localStorage.setItem('sound_muted', String(val));
  }

  private getCtx() {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    return this.audioCtx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  // Coin drop - betting
  playBet() {
    if (this.muted) return;
    const ctx = this.getCtx();
    [800, 1000, 1200, 900].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.08, 'square', 0.08), i * 40);
    });
  }

  // Rising tone - aviator flying
  playFly() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 200;
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 1.5);
      g.gain.value = 0.06;
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch {}
  }

  // Explosion - crash
  playCrash() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = 0.2;
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      source.connect(g);
      g.connect(ctx.destination);
      source.start();
    } catch {}
  }

  // Cash register - cashout
  playCashout() {
    if (this.muted) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.15, 'sine', 0.12), i * 80);
    });
  }

  // Win jingle
  playWin() {
    if (this.muted) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'sine', 0.1), i * 100);
    });
  }

  // Lose sound
  playLose() {
    if (this.muted) return;
    [400, 350, 300].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'triangle', 0.1), i * 120);
    });
  }
}

export const soundManager = new SoundManager();
