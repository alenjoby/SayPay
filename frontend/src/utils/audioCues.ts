/**
 * Web Audio API synthesizer for instant, zero-latency earcons / sound feedback.
 * Provides accessible auditory cues for screen-reader and low-vision users.
 */

class AudioCueSystem {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Sound 1: Listening Started (Rising friendly chime)
   */
  public playListeningStarted() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Sound 2: Intent Recognized / Read-Back Dialog Opened (Soft harmonic double chime)
   */
  public playIntentRecognized() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.1, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.2);
    });
  }

  /**
   * Sound 3: Confirmed / Success (Bright major chord resolution)
   */
  public playSuccess() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.12, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + 0.55);
    });
  }

  /**
   * Sound 4: Security Alert / Error / Cancel (Distinct lower warning tone)
   */
  public playWarning() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Sound 5: Incoming Payment Received (Distinct bright cash register/bell chime)
   */
  public playIncomingPayment() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Two fast bell rings: E6 (1318.5) and G6 (1567.98)
    [1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  /**
   * Sound 6: Binaural Stereo Headphone Verification Test (Left ear chime then Right ear chime)
   */
  public playHeadphoneStereoTest() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Left Ear tone (at now)
    const oscLeft = ctx.createOscillator();
    const gainLeft = ctx.createGain();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(587.33, now); // D5
    gainLeft.gain.setValueAtTime(0.12, now);
    gainLeft.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    // Right Ear tone (at now + 0.35s)
    const oscRight = ctx.createOscillator();
    const gainRight = ctx.createGain();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(880.0, now + 0.35); // A5
    gainRight.gain.setValueAtTime(0.12, now + 0.35);
    gainRight.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    const anyCtx = ctx as any;
    if (typeof anyCtx.createStereoPanner === 'function') {
      const panLeft = anyCtx.createStereoPanner();
      panLeft.pan.setValueAtTime(-0.85, now);
      oscLeft.connect(gainLeft);
      gainLeft.connect(panLeft);
      panLeft.connect(ctx.destination);

      const panRight = anyCtx.createStereoPanner();
      panRight.pan.setValueAtTime(0.85, now + 0.35);
      oscRight.connect(gainRight);
      gainRight.connect(panRight);
      panRight.connect(ctx.destination);
    } else {
      oscLeft.connect(gainLeft);
      gainLeft.connect(ctx.destination);
      oscRight.connect(gainRight);
      gainRight.connect(ctx.destination);
    }

    oscLeft.start(now);
    oscLeft.stop(now + 0.3);
    oscRight.start(now + 0.35);
    oscRight.stop(now + 0.65);
  }

  /**
   * Sound 7: Headphone Disconnected Emergency Alert
   */
  public playHeadphoneDisconnectedAlert() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [300, 200].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.14, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.2);
    });
  }

  /**
   * Sound 8: Passkey Biometric Success (Deep subtle hardware click + chime)
   */
  public playPasskeySuccess() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(783.99, now); // G5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Sound 9: Interface State Rebuild and Transition Earcon
   * Solves silent interface updates by producing a crisp acoustic marker
   * whenever any tab, window, modal, or asynchronous screen rebuild occurs.
   */
  public playInterfaceTransition() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(329.63, now); // E4
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }
}

export const audioCues = new AudioCueSystem();
