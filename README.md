# SayPay: Voice-First Accessible Web3 Smart Wallet

SayPay is an accessible, voice-first cryptocurrency smart wallet engineered for blind and visually impaired individuals. It eliminates traditional Web3 usability barriers by removing 12-word seed phrases, replacing 42-character hexadecimal addresses with verified human contacts, enforcing hardware biometric authorization via WebAuthn passkeys, and providing privacy-preserving auditory interfaces.

---

## 1. Usability Research and Problem Statement

SayPay was developed based on empirical findings from visual accessibility research in decentralized finance (notably Zhou et al., SOUPS 2023):
* **Prolonged Task Duration**: Blind screen-reader users spend on average 70% longer on fundamental crypto tasks compared to sighted users (47.9 minutes versus 28.2 minutes).
* **Silent State Changes**: Standard browser extension wallets fail to announce dynamic modal confirmations and balance updates to screen readers such as NVDA, TalkBack, and VoiceOver.
* **Seed Phrase Cognitive Burden**: Manual transcription and verification of 12 or 24 random seed words lead to high abandonment rates and irreversible fund loss.
* **Hexadecimal Address Misdirection**: Distinguishing 42-character alphanumeric addresses through text-to-speech is error-prone and leads to misdirected transfers.
* **Acoustic and Visual Eavesdropping**: Sighted onlookers and malicious actors can observe sensitive balances or record spoken PINs in public environments.

---

## 2. Core Architecture and Innovations

### 2.1 Account Abstraction (ERC-4337) and Biometric Passkeys
* **Seedless Security**: Private keys are replaced with device-bound FIDO2 credentials generated via the W3C Web Authentication API (`navigator.credentials.create`).
* **Secure Enclave Storage**: Passkeys reside within the user's hardware secure element (Apple Secure Enclave, Android Titan M, Windows Hello TPM).
* **Separation of Intent and Signing**: Speech recognition parses commands and constructs transaction payloads, but cryptographic signing strictly demands physical biometric verification (fingerprint, facial recognition, or device PIN). Spoken passwords and PINs are completely eliminated to prevent acoustic spoofing.

### 2.2 Strict Hardware Earphone Privacy Interlock
* **Media Device Hardware Verification**: Uses `navigator.mediaDevices.enumerateDevices()` to inspect real-time audio output configurations.
* **Loudspeaker and Motherboard Filtering**: Implements a strict exclusion list to prevent internal laptop speakers, Realtek motherboard audio, and HDMI/monitor outputs from being falsely identified as private listening devices.
* **Headset Verification**: Restricts voice synthesis and vocal balance readouts exclusively to verified wired headphones and wireless Bluetooth headsets (AirPods, Galaxy Buds, Pixel Buds, and over-ear headphones).
* **Automatic Safeguard**: If earphones are disconnected during a session, vocal readouts immediately pause to ensure financial privacy in public spaces.

### 2.3 Stealth Screen Curtain (Anti-Shoulder Surfing Mode)
* **Voice-Activated Privacy**: Users can speak "Turn on privacy mode", "Enable stealth mode", or "Blank screen" at any time.
* **Full Blackout Display**: The screen transitions to a pure black overlay, completely hiding balances, recipient names, and interactive buttons from physical onlookers and surveillance cameras.
* **Uninterrupted Voice Controls**: All push-to-talk voice commands, synthetic earcon cues, and auditory feedback remain fully functional while the display is blanked.
* **Instant Wake**: Users can speak "Disable privacy mode" or tap the screen anywhere to restore the visual interface.

### 2.4 Digital Inheritance and Dead-Man's Switch
* **Beneficiary Wallet Support**: Dedicated configuration supporting both 0x hexadecimal EVM addresses and Ethereum Name Service (.eth) handles.
* **Real-Time Validation**: Features automated checksum validation, address length verification (42 characters), and clipboard paste functionality.
* **Inactivity Trigger Periods**: Users configure automated execution periods (180 days, 1 year, or 2 years) without needing probate court intervention or third-party custody.
* **Smart Contract Escrow**: Smart contract architecture holds assets in a non-custodial time-lock that automatically transfers custody if the primary wallet remains inactive past the chosen threshold.

### 2.5 Multi-Signature Social Recovery
* **Guardian Management**: 2-of-3 social recovery architecture distributing recovery keys among trusted guardians (family, friends, or trusted institutions).
* **Timelocked Protection**: A 48-hour recovery execution delay provides the original wallet owner an active window to veto unauthorized recovery attempts.

### 2.6 Responsive Layout Engine
* **Desktop Two-Column Grid**: Optimizes widescreen viewports with a persistent security status card, quick QR verification, real-time portfolio analytics, and multi-token asset management.
* **Mobile Single-Column Flow**: Automatically refactors into a focused vertical stack on mobile devices for one-thumb reachability and mobile screen reader gestures.

---

## 3. Technology Stack

* **Frontend**: React 19, TypeScript, Vite
* **Design and Styling**: Tailwind CSS, Lucide Icons, Canvas Confetti
* **Speech and Audio Processing**:
  * Web Speech API (`SpeechRecognition` for input, `SpeechSynthesis` for output)
  * Web Audio API (Synthetic earcon audio cues across distinct harmonic frequencies)
* **Authentication and Security**:
  * W3C Web Authentication API (FIDO2 / WebAuthn Passkeys)
  * Web Crypto API (`window.crypto.subtle`) for SHA-256 digest creation and challenge generation
* **Cross-Tab Synchronization**:
  * HTML5 `BroadcastChannel` API and storage event hooks

---

## 4. Repository Structure

```text
SayPay/
├── README.md                           # Comprehensive project documentation
├── package.json                        # Root repository configuration
└── frontend/
    ├── index.html                      # Application entry point with ARIA targets
    ├── package.json                    # Frontend dependencies and scripts
    ├── tsconfig.json                   # TypeScript compiler configuration
    ├── vite.config.ts                  # Vite build tool configuration
    └── src/
        ├── App.tsx                     # Main application router and landing page
        ├── main.tsx                    # React DOM initialization
        ├── index.css                   # Tailwind styles and WCAG focus outlines
        ├── components/
        │   ├── FunctionalWalletPage.tsx       # Core smart wallet interface and desktop grid
        │   ├── CreateWalletModal.tsx          # Accessible wallet creation dialog
        │   ├── FundWalletModal.tsx            # Testnet faucet and deposit modal
        │   ├── SwapModal.tsx                  # Biometric-verified token swap interface
        │   ├── SendModal.tsx                  # Transfer confirmation with passkey signing
        │   ├── ReceiveModal.tsx               # QR code, address display, and audio readout
        │   ├── ContactsModal.tsx              # Human-readable contact address book
        │   ├── GuardiansModal.tsx             # Social recovery guardians dashboard
        │   ├── AccessibilitySettingsModal.tsx # Digital inheritance and WCAG AAA controls
        │   ├── HeadphoneSafetyModal.tsx       # Earphone hardware safety verification
        │   ├── InteractiveWalletDemo.tsx      # Interactive prototype showcase
        │   └── LiveAnnouncer.tsx              # Dual ARIA live announcement manager
        └── utils/
            ├── audioCues.ts                   # Synthetic Web Audio API earcon tones
            ├── headphoneDetector.ts           # Hardware headset and audio device detection
            ├── i18n.ts                        # Multilingual support (English, Hindi, Arabic)
            ├── intentParser.ts                # Natural voice intent parsing engine
            ├── passkeyAuth.ts                 # WebAuthn passkey registration and signing
            └── walletState.ts                 # Local state persistence and BroadcastChannel sync
```

---

## 5. Getting Started

### Prerequisites
* Node.js version 18.0 or higher
* npm version 9.0 or higher
* Modern web browser with Web Speech API and WebAuthn support (Google Chrome, Microsoft Edge, Safari, or Brave)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/alenjoby/SayPay.git
   cd SayPay/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit:
   ```text
   http://localhost:5173
   ```

### Production Build
To create an optimized production build:
```bash
npm run build
```

---

## 6. Voice Command Reference

SayPay provides natural language voice command processing. Hold the **Spacebar** or click the **Microphone** button to speak:

| Category | Command Examples | Action Triggered |
| :--- | :--- | :--- |
| **Balance** | "What is my balance?", "Check my funds", "रुपये कितने हैं" | Speaks out total USD portfolio valuation and ETH balance. |
| **Transfers** | "Send 0.1 ETH to Amma", "Pay Rahul 50 USDC", "Arsil 0.1 ila Amma" | Opens Send modal with recipient and amount pre-filled. |
| **Biometric Sign** | "Confirm", "Fingerprint", "Sign", "بصمة" | Prompts hardware passkey biometric dialog to execute payment. |
| **Privacy Mode** | "Turn on privacy mode", "Enable stealth mode", "Black screen" | Blankens the display completely while maintaining voice interaction. |
| **Restore Display** | "Disable privacy mode", "Turn off stealth mode", "Show screen" | Restores the visual user interface. |
| **Funding** | "Add cash", "Fund wallet", "Deposit 1 ETH", "पैसे जोड़ें" | Opens the faucet deposit window. |
| **Swapping** | "Swap tokens", "Swap ETH for USDC", "टोकन बदलें" | Opens the decentralized swap window. |
| **Token Overview** | "Show crypto", "What tokens do I have?" | Displays the token breakdown table. |
| **Collectibles** | "Show my NFTs", "Check badges", "एनएफटी दिखाओ" | Navigates to the NFTs tab with audio alt-text readout. |
| **Security Shield** | "Check approvals", "Show permissions" | Reviews and revokes third-party smart contract token spend allowances. |
| **Contacts** | "Open contacts", "Show address book" | Opens the human-readable address book. |

---

## 7. Accessibility and Compliance Specifications

* **W3C WCAG 2.2 AAA Compliance**: Contrast ratios exceed 7:1 across all interactive components, full keyboard navigability with visible focus indicators, and zero silent DOM updates.
* **Dual ARIA Live Regions**: Segregated `polite` and `assertive` live regions guarantee high-priority financial warnings interrupt background state updates without speech collision.
* **Hardware Earphone Gate**: Ensures financial privacy by preventing loud speaker announcements of account balances in shared spaces.
* **Stealth Screen Curtain**: Eliminates shoulder-surfing vulnerabilities for blind users operating smartphones in public.
* **No Spoken Sensitive Secrets**: PINs, passwords, and cryptographic keys are never spoken aloud or accepted as speech input.

---

## 8. License

This project is licensed under the MIT License. Developed for accessibility research and inclusive Web3 infrastructure.
