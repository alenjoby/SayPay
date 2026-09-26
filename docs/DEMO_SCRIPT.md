# SayPay demo script (2:00)

Emphasis: **AI/ML** (~55 s) → **Web** (~25 s) → **Blockchain** (~30 s).
Record the app's actions first, then add the narration as a voice-over **on top**
(lower the app's volume under the narration; raise it for the key replies).
"SAY" = spoken to the app. *Italics* = the app's answer.

## Before recording

- [ ] Fresh chain: restart `npx hardhat node` → `npm run deploy:local` → wallet shows **2.5 ETH**
- [ ] Model running (`/health`); say 97.5% only if it shows `v3+mmbert`, otherwise 96.7%
- [ ] App in Chrome/Edge, Voice-Assisted mode; a terminal in `contracts/` ready (off-camera) for `npm run demo ...`
- [ ] Off-camera: SAY "change to Arabic"
- [ ] Record **system audio + mic** (OBS or Win+Alt+R), earphones on
- [ ] Record each scene separately and cut; if a voice line misfires, type it in the box instead

---

## 0:00–0:12 Cold open (screen black)

Screen Curtain on. SAY: **"كم رصيدي"** → *Arabic balance answer*

**Narrator:** "A blind user, checking their crypto wallet in Gulf Arabic, with the screen off. This is SayPay."

Screen Curtain off.

## 0:12–1:05 AI/ML: code-switching and spelling by ear

1. SAY: **"Hindi mein baat karo"** → *Hindi confirmation*
   SAY: **"प्रिया को 0.05 ईथर भेजो"** → Send popup **Priya, 0.05**, *Hindi read-back*. Press Escape.
2. SAY: **"change to English"**, then SAY: **"Send 0.05 to Sarah"** → popup **Sara, 0.05**. Escape.
3. SAY: **"Send money to Priya"** → *"How much should I send to Priya?"*

**Narrator (over 1–3):**
"Gulf users mix Arabic, Hindi and English, and speech-to-text spells names however it hears them. Our own model, running on our server, not a chatbot API, understands the mix: Hindi with the English word 'ether', a contact saved as Sara but heard as Sarah, amounts read back in words. When it's unsure, it asks instead of acting.
On 120 hand-written commands frozen before training it scores **97.5%**, against **69%** for an English-only model, with **zero confident wrong sends**, and **94%** on Tunisian Arabic it never trained on."

## 1:05–1:30 Web: nothing changes silently

SAY: **"Send 0.1 ETH to Amma"** → the Send popup opens (the dialog is announced; focus moves in).
Point at the typed box under the voice bar.

**Narrator:** "Everything is announced: real dialogs a screen reader can't miss, an interrupting alert for security events, a distinct sound for each state, and a typed fallback when speech fails."

## 1:30–1:55 Blockchain: no seed phrase, and it doesn't assume you're alive

1. SAY: **"fingerprint"** → Windows Hello → *"Pending." → "Confirmed." → "Sent 0.1 test ETH to Amma."* Balance **2.5 → 2.4**.
2. Off-camera, in a terminal in `contracts/`: `npm run demo recovery` (acts as Guardian Ahmed) → the app **interrupts**: *"…started moving your wallet to a new phone. If this wasn't you, say cancel recovery."*
   SAY: **"cancel recovery"** → *"Recovery cancelled. Your wallet is safe."*

**Narrator:** "A real transaction on our SayPayVault contract, signed by a key that only unlocks with your fingerprint. Lose your phone and guardians restore it, but you can always stop them, and they can never move your money. If you're gone, an inheritance switch passes it to your family. Tested, and on the Sepolia testnet."

## 1:55–2:00 Close

**Narrator:** "SayPay. Speak it, hear it back, approve with your fingerprint."

---

## Cuts if you run long

1. Drop "Send money to Priya" (keep the "it asks when unsure" line in the narration).
2. Drop the Sarah example (say "names matched by sound" over the Hindi scene).
3. Never cut: the Arabic cold open, the Hindi read-back, fingerprint → Pending → Confirmed.

## Numbers (`ml/reports/v4_ensemble_colab.md`)

| | English-only | v3 | **v3 + mmBERT** |
|---|---|---|---|
| Blind test (120 hand-written, frozen) | 69.2% | 96.7% | **97.5%** |
| Confident wrong sends | 0% | 0% | **0%** |
| Tunisian Arabic (unseen dialect) | 78.1% | 87.0% | **94.0%** |
