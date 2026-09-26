# SayPay demo script (4 min 50 s)

Order of emphasis: **AI/ML first** (longest), then **Web accessibility**, then **Blockchain**.
Two people: **Narrator** (voice-over) and **Operator** (presses Space, speaks commands).
Lines in quotes after "SAY" are spoken to the app. *Italics* = what the app answers.

## Before recording (10 min)

- [ ] Fresh chain: stop and restart `npx hardhat node`, then `npm run deploy:local` → wallet shows **2.5 ETH**
- [ ] Model running (`uvicorn`, check http://localhost:8000/health). If you have the mmBERT files, `/health` says `v3+mmbert`
- [ ] Window **A**: the app in Chrome/Edge (wallet open, Voice-Assisted mode). Window **C**: contract tester http://127.0.0.1:5174 (off-camera or second screen). Tab: the Sepolia contract on Etherscan
- [ ] Say "change to Arabic" off-camera (the cold open starts in Arabic)
- [ ] Recorder captures **system audio + your mic** (OBS, or Win+Alt+R Xbox Game Bar); **earphones on** so the mic doesn't re-hear the app
- [ ] Windows Hello / fingerprint works (or the software fallback)
- [ ] Rehearse once; record scene by scene and cut; the typed box is the backup if a voice line misfires

---

## 0:00–0:20 Cold open (screen dark)

Operator turns on **Screen Curtain** (Privacy menu): the screen goes black. Only audio.

- Operator holds Space, SAY: "كم رصيدي"
- *App (Arabic): "إجمالي قيمة محفظتك… 2.5 إيثيريوم تجريبي…"*

**Narrator:** "That was a blind user checking their crypto wallet, in Gulf Arabic, with the screen off. This is SayPay."

Turn Screen Curtain off.

## 0:20–0:40 The problem

**Narrator:** "Crypto wallets are built for eyes. In a study of 23 blind users on MetaMask, people couldn't read 42-character addresses, missed pop-ups their screen reader never announced, and couldn't safely handle a 12-word seed phrase. And voice assistants expect clean English, but here in the Gulf people speak Arabic, Hindi and English, often in one sentence. SayPay fixes all three: the AI understands mixed-language speech, the interface announces everything, and the blockchain removes the seed phrase."

## 0:40–2:20 AI/ML: code-switching and spelling by ear (the core)

1. SAY: "Hindi mein baat karo" → *"भाषा बदलकर हिंदी कर दी गई है।"*
   SAY: "प्रिया को 0.05 ईथर भेजो" → Send popup: **Priya, 0.05**; *read-back in Hindi, amount in words*.
   Press **Escape**.
   **Narrator:** "Hindi, with the English word 'ether' inside. The amount is read back in words, so a misheard number is caught before anything moves."

2. SAY: "change to English", then SAY: "Send 0.05 to Sarah" → popup: **Sara, 0.05**. Escape.
   **Narrator:** "The contact is saved as Sara; speech-to-text wrote Sarah. We match names by sound, across Arabic, Latin and Devanagari script: 'mom', 'أمي' and 'मम्मी' all find Amma."

3. SAY: "Send money to Priya" → *"How much should I send to Priya?"* (no popup)
   SAY: "Ask Priya for 20 dollars" → *asks "receive or send?"*, never opens Send.
   **Narrator:** "When it isn't sure, it asks. Asking someone for money can never become sending it. The AI never moves money: it only proposes, and you approve with your fingerprint."

4. Point at the **voice card** above the voice bar (You said → understood as, % sure).
   **Narrator:** "This is our own model on our own server, not a chatbot API, so financial commands stay private. It's a TF-IDF model over normalised, transliterated and phonetic views of the sentence, ensembled with a fine-tuned multilingual transformer, mmBERT. On 120 hand-written commands we froze before training, it scores **97.5%**. A plain English-only model scores **69%**. When it acts without asking, it's right **100%** of the time, with **zero confident wrong sends**. It even handles Arabic dialects it never trained on: **92.5% Moroccan, 94% Tunisian**. And it answers in about **25 milliseconds**."

## 2:20–3:20 Web: nothing changes silently

1. **Narrator:** "Everything works by holding Space. And if speech fails, you can type."
   Operator types in the box: "What's my balance" + Enter → *answer*.
2. Operator: SAY "Send 0.1 ETH to Amma" → Send popup opens.
   **Narrator:** "Pop-ups are real dialogs: the screen reader announces them, focus moves in, and Escape returns you exactly where you were: the problem the MetaMask study found."
   (Leave the popup open for the next scene.)
3. **Narrator:** "Every state change is announced: polite for normal updates, an interrupting alert for security events, and a distinct sound for listening, success, error and warnings. It works with NVDA and TalkBack, and an earphone check stops balances being read out to the room."
   *(Optional 5 s clip, recorded separately: NVDA reading the Send dialog's title.)*

## 3:20–4:35 Blockchain: self-custody that doesn't assume you're alive and have eyes

1. In the open popup, SAY: "fingerprint" → Windows Hello → *"5 seconds to undo"* → *"Pending." → "Confirmed." → "Sent 0.1 test ETH to Amma."* Balance **2.5 → 2.4**.
   **Narrator:** "That's a real transaction on our SayPayVault smart contract, signed by a key that lives on the phone and only unlocks with the fingerprint. No seed phrase, ever."

2. Window **C** (show briefly): Guardian Ahmed → **Propose recovery**.
   App interrupts: *"Guardian Ahmed started moving your wallet to a new phone. If this wasn't you, say cancel recovery."*
   SAY: "cancel recovery" → fingerprint → *"Recovery cancelled. Your wallet is safe."*
   **Narrator:** "If you lose your phone, two of three guardians move the wallet to your new phone after a waiting period, and if it wasn't you, one sentence stops them. Guardians can never move funds themselves. And if the owner is gone, an inheritance switch passes the funds to their family, unless a guardian or the owner vetoes it."

3. Show the **Etherscan** tab for 3 seconds.
   **Narrator:** "The contract is tested (12 tests, including every case from our spec) and deployed on the Sepolia testnet. It's a testnet prototype, not audited."

## 4:35–4:50 Close

**Narrator:** "SayPay: speak in your own language, hear it back, approve with your fingerprint. No seed phrase, no silent screens. A crypto wallet built for people who can't see it."

---

## If something goes wrong on camera

| Problem | Do |
|---|---|
| A voice line is misheard | Type the same command in the box; keep going |
| The model server is down | The app still works with the basic parser (grey card); skip scene 1.4's numbers or say them over a slide |
| A transaction fails | Reset the chain (see top) and re-record that scene |
| Double speech | Screen reader and app voice both on: turn one off |

## Numbers (from `ml/reports/v4_ensemble_colab.md`)

| | English-only | v3 | **v3 + mmBERT** |
|---|---|---|---|
| Blind test (120 hand-written, frozen) | 69.2% | 96.7% | **97.5%** |
| Correct when it acts without asking | 89.0% | 100% | **100%** |
| Confident wrong sends | 0% | 0% | **0%** |
| Saudi / Moroccan / Tunisian Arabic | 61.9 / 60.0 / 78.1% | 94.3 / 90.0 / 87.0% | **97.3 / 92.5 / 94.0%** |

Use the v3 + mmBERT numbers only if the demo PC runs `v3+mmbert` (`/health`); otherwise say 96.7%.
