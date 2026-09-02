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

  // Chip clink - single chip or check
  playChipClink() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      [1400, 2200].forEach((f, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = f + Math.random() * 80;
          g.gain.value = 0.12;
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.04);
        }, i * 35);
      });
    } catch {}
  }

  // Chip splash - bet or raise
  playChipSplash() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const frequencies = [850, 1100, 1450, 1800, 2100, 1600];
      frequencies.forEach((f, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = f + (Math.random() * 100 - 50);
          g.gain.value = 0.09;
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
        }, i * 22);
      });
    } catch {}
  }

  // Card slide / deal sound
  playCardDeal() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const bufferSize = Math.floor(ctx.sampleRate * 0.08);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 1.5;
      const g = ctx.createGain();
      g.gain.value = 0.15;
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      source.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      source.start();
    } catch {}
  }

  // Turn chime - golden bell alert
  playTurnAlert() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      [1174.66, 1760.00].forEach((f, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = f;
          g.gain.value = 0.14;
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.45);
        }, i * 110);
      });
    } catch {}
  }

  // All-in dramatic tone
  playAllIn() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      setTimeout(() => this.playChipSplash(), 200);
    } catch {}
  }

  // Grand VIP Win Fanfare
  playGrandWin() {
    if (this.muted) return;
    const ctx = this.getCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
    notes.forEach((f, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        g.gain.value = 0.16;
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }, i * 80);
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
