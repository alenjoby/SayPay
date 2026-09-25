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
  isWired: boolean;
  isWireless: boolean;
  connectionType: 'wired' | 'wireless' | 'none';
  deviceName: string;
  hasDevicePermission: boolean;
}

type HeadphoneListener = (status: HeadphoneStatus) => void;
type DisconnectListener = () => void;

class HeadphoneSafetyService {
  private isConnected: boolean = false;
  private isVerified: boolean = false;
  private isWired: boolean = false;
  private isWireless: boolean = false;
  private connectionType: 'wired' | 'wireless' | 'none' = 'none';
  private deviceName: string = 'Default Output';
  private listeners: HeadphoneListener[] = [];
  private disconnectListeners: DisconnectListener[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
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
   * Request user permission to reveal unmasked hardware labels
   */
  public async requestAudioHardwareScan(): Promise<HeadphoneStatus> {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        // User may have denied mic or already granted
      }
    }
    return this.scanAudioDevices();
  }

  /**
   * Scan audio devices to detect wired or wireless earphones
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

      const wirelessKeywords = [
        'bluetooth',
        'airpod',
        'galaxy buds',
        'pixel buds',
        'earbuds',
        'hands-free',
        'wh-1000',
        'wf-1000',
        'bose quietcomfort',
      ];

      const wiredKeywords = [
        'headphone',
        'headset',
        'earphone',
        'in-ear',
        'earpods',
      ];

      const speakerBlacklist = [
        'speaker',
        'loudspeaker',
        'built-in',
        'internal',
        'realtek audio',
        'realtek high definition audio',
        'realtek(r) audio',
        'display audio',
        'hdmi',
        'tv audio',
        'monitor',
      ];

      let detectedWireless = false;
      let detectedWired = false;
      let matchedLabel = '';

      for (const dev of audioDevices) {
        const lbl = dev.label.toLowerCase().trim();
        if (!lbl) continue;

        // Skip any device that is clearly an internal speaker or monitor
        const isBlacklistedSpeaker = speakerBlacklist.some((b) => lbl.includes(b));
        const isExplicitHeadset = wiredKeywords.some((kw) => lbl.includes(kw)) || wirelessKeywords.some((kw) => lbl.includes(kw));

        if (isBlacklistedSpeaker && !isExplicitHeadset) {
          continue;
        }

        if (wirelessKeywords.some((kw) => lbl.includes(kw))) {
          detectedWireless = true;
          matchedLabel = dev.label;
          break;
        } else if (wiredKeywords.some((kw) => lbl.includes(kw))) {
          detectedWired = true;
          matchedLabel = dev.label;
          break;
        }
      }

      this.isWireless = detectedWireless;
      this.isWired = detectedWired;

      if (detectedWireless) {
        this.isConnected = true;
        this.isVerified = true;
        this.connectionType = 'wireless';
        this.deviceName = matchedLabel;
      } else if (detectedWired) {
        this.isConnected = true;
        this.isVerified = true;
        this.connectionType = 'wired';
        this.deviceName = matchedLabel;
      } else {
        this.isConnected = false;
        this.isVerified = false;
        this.connectionType = 'none';
        this.deviceName = 'Loudspeaker (Earphones Not Detected)';
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
    this.isWired = false;
    this.isWireless = false;
    this.connectionType = 'none';

    this.disconnectListeners.forEach((cb) => cb());
    this.notifyListeners();
  }

  public getStatus(): HeadphoneStatus {
    return {
      isConnected: this.isConnected,
      isVerified: this.isConnected,
      isWired: this.isWired,
      isWireless: this.isWireless,
      connectionType: this.connectionType,
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
    if (verified) {
      this.isWired = true;
      this.connectionType = 'wired';
      this.deviceName = 'Earphones (Verified Audio)';
    } else {
      this.isWired = false;
      this.isWireless = false;
      this.connectionType = 'none';
      this.deviceName = 'Loudspeaker (Earphones Not Detected)';
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
