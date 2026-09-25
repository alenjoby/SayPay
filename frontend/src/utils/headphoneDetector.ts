/**
 * SayPay Earphone & Headphone Safety Detection Service.
 * 
 * In Blind / Voice-Assisted Mode, financial privacy is paramount:
 * Hearing private balances, transaction amounts, and contacts out loud
 * in public over loudspeakers exposes users to acoustic shoulder surfing.
 * 
 * This service detects headphone/earphone connections via Web Audio &
 * MediaDevices APIs, provides stereo verification tests, and enforces
 * privacy interlocks when earphones are disconnected.
 */

export interface HeadphoneStatus {
  isConnected: boolean;
  isVerified: boolean;
  deviceName: string;
  hasDevicePermission: boolean;
}

type HeadphoneListener = (status: HeadphoneStatus) => void;
type DisconnectListener = () => void;

class HeadphoneSafetyService {
  private isConnected: boolean = false;
  private isVerified: boolean = false;
  private deviceName: string = 'Default Output';
  private listeners: HeadphoneListener[] = [];
  private disconnectListeners: DisconnectListener[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('saypay_headphones_verified');
      if (stored === 'true') {
        this.isVerified = true;
      }
      this.initDetection();
    }
  }

  private async initDetection() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return;
    }

    try {
      await this.scanAudioDevices();

      // Listen for physical plug/unplug of 3.5mm jack, USB headsets, or Bluetooth disconnection
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        const wasConnected = this.isConnected;
        await this.scanAudioDevices();

        if (wasConnected && !this.isConnected) {
          // Earphones disconnected! Emergency privacy silence
          this.triggerPrivacyMute();
        }
      });
    } catch (err) {
      console.warn('Media devices enumeration notice:', err);
    }
  }

  /**
   * Scan audio devices to detect headphones, earbuds, AirPods, or Bluetooth headsets
   */
  public async scanAudioDevices(): Promise<HeadphoneStatus> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return this.getStatus();
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(
        (d) => d.kind === 'audiooutput' || d.kind === 'audioinput'
      );

      // Search for headphone/earphone markers in device labels
      const headphoneKeywords = [
        'headphone',
        'headset',
        'earphone',
        'airpod',
        'buds',
        'bluetooth',
        'wh-',
        'wf-',
        'galaxy buds',
        'pixel buds',
        'ear',
        'audio jack',
      ];

      let detectedHeadphone = false;
      let matchedLabel = '';

      for (const dev of audioDevices) {
        const lbl = dev.label.toLowerCase();
        if (headphoneKeywords.some((kw) => lbl.includes(kw))) {
          detectedHeadphone = true;
          matchedLabel = dev.label;
          break;
        }
      }

      // If user had previously verified earphones or a headphone device is found:
      if (detectedHeadphone) {
        this.isConnected = true;
        this.deviceName = matchedLabel;
      } else {
        // In some browsers, device labels are sanitized until microphone permission is granted.
        // We preserve isVerified if the user confirmed headphone connection.
        this.isConnected = this.isVerified;
      }

      this.notifyListeners();
    } catch (e) {
      console.warn('Audio scan warning:', e);
    }

    return this.getStatus();
  }

  /**
   * Privacy Mute: Cancels any active speech synthesis immediately
   * when earphones are disconnected.
   */
  private triggerPrivacyMute() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isVerified = false;
    this.isConnected = false;
    localStorage.removeItem('saypay_headphones_verified');

    this.disconnectListeners.forEach((cb) => cb());
    this.notifyListeners();
  }

  public getStatus(): HeadphoneStatus {
    return {
      isConnected: this.isConnected || this.isVerified,
      isVerified: this.isVerified,
      deviceName: this.deviceName,
      hasDevicePermission: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
    };
  }

  /**
   * Confirm that earphones are plugged in (via user voice command or test click)
   */
  public confirmEarphonesConnected(verified: boolean = true) {
    this.isConnected = verified;
    this.isVerified = verified;
    if (typeof window !== 'undefined') {
      if (verified) {
        localStorage.setItem('saypay_headphones_verified', 'true');
      } else {
        localStorage.removeItem('saypay_headphones_verified');
      }
    }
    this.notifyListeners();
  }

  public onStatusChange(callback: HeadphoneListener) {
    this.listeners.push(callback);
    callback(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public onDisconnect(callback: DisconnectListener) {
    this.disconnectListeners.push(callback);
    return () => {
      this.disconnectListeners = this.disconnectListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => cb(status));
  }
}

export const headphoneSafety = new HeadphoneSafetyService();
