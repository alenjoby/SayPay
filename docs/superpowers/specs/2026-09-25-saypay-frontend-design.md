# SayPay Frontend Design Specification

- **Project**: SayPay
- **Target Audience**: Primary focus on blind and visually impaired users, with a world-class universal UI for sighted users and hackathon judges.
- **Languages**: English, Hindi, Arabic (with automatic spoken language detection and dynamic RTL/LTR layout shift).
- **Core Scope**: Frontend implementation with interactive voice control, Web Speech API / synthesis, audio earcons, seedless guardian recovery, accessible read-back modals, and live interactive wallet simulation.

---

## 1. Visual Aesthetics & Design System

### A. Color Palette (MetaMask & Exodus Inspired)
- **Base Canvas**: Deep Emerald Void (`#011715` / `#022421`) with radial aurora ambient lighting.
- **Card Surfaces**: Frosted glass dark emerald (`#09332e` / `rgba(9, 51, 46, 0.65)`) with `backdrop-blur-xl`.
- **Primary Brand Accent**: MetaMask Fox Orange (`#F6851B` / `#E2761B`) for active voice pulse, primary badges, and biometric approval.
- **High-Visibility Accent**: MetaMask Rebrand Mint (`#E5FFC3`) for hero headings, tabular numbers, and active badges.
- **Functional Accents**:
  - Confirmed / Safe: Emerald Mint (`#10B981`)
  - Warning / Delay Timer: Amber Gold (`#F59E0B`)
  - Alert / Emergency Cancel: Crimson Alert (`#EF4444`)
- **Specular Luminous Borders**: 1px gradient mask `linear-gradient(135deg, rgba(229, 255, 195, 0.3), rgba(246, 133, 27, 0.2) 50%, transparent)`.

### B. Typography & Contrast
- **Headings**: Modern geometric display sans (`Plus Jakarta Sans` / `Space Grotesk`) with tight tracking.
- **Numbers & Values**: Tabular numerals (`font-variant-numeric: tabular-nums`).
- **Contrast Ratios**: Strict adherence to WCAG AAA standards (> 7:1) for low-vision clarity.

---

## 2. Core Functional Modules

### A. Voice & Audio Accessibility Center
- **Giant Voice Trigger Button**: $\ge 88\text{px}$ touch target with pulsing waveform glow, accessible via `Spacebar` or touch.
- **Speech Recognition & Auto-Language Detection**:
  - Web Speech API integration supporting English (`en-US`), Hindi (`hi-IN`), and Arabic (`ar-SA`).
  - Auto-detects spoken dialect and syncs UI direction (`dir="rtl"` for Arabic, `dir="ltr"` for English/Hindi).
- **Dual ARIA Live Regions**:
  - `aria-live="polite"` for continuous state feedback.
  - `role="alert"` for security notifications.
- **Audio Earcons**: Distinct Web Audio API synthesizers for Listening Started, Action Proposed, Success, and Alert.

### B. Human Contacts & Accessible Send Dialog
- Maps names (`Amma`, `Rahul`, `Zaid`) to blockchain testnet addresses.
- Focus-trapped native `<dialog>` reading aloud: *"Send 0.1 ETH to Amma. Confirm with fingerprint."*
- Biometric approval simulation (WebAuthn / Passkey) with failure/success states.

### C. Seedless Smart Vault & Guardian Recovery
- Eliminates 12-word seed phrases.
- Social recovery simulation with 2-minute delay countdown timer and emergency owner cancellation.
- Dead-man's switch inactivity timer with guardian veto option.

---

## 3. Responsive Multi-Device Architecture
- **Mobile (< 768px)**: `100dvh` container, bottom-thumb reachability, gesture-friendly sheets.
- **Tablet (768px - 1024px)**: 2-column bento grid.
- **Desktop (> 1024px)**: Centered luxury bento layout (`max-w-5xl`) with full keyboard shortcut bindings.
