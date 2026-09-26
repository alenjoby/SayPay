# SayPay final test checklist

Every item comes from the project spec. Tick it only when it passes **with the
screen off or eyes closed**, unless it is a visual check. Write the failing step
and what happened next to anything that fails.

## Status of the gaps found before the final test

| # | Spec says | Now |
|---|---|---|
| G1 | The app uses the contract | ✅ **Fixed.** Balance comes from SayPayVault; sends go through it (Pending → Confirmed → Sent); guardian actions from other phones are announced; "cancel recovery", "I'm here", "finish recovery" call the contract. |
| G2 | "Every voice action also works by typing" | ✅ **Fixed.** Text box under the voice bar: "Type a command instead of speaking". |
| G3 | Confirmation steps are a real `<dialog>`, focus moves in and back | ✅ **Fixed** for Send, Receive, Contacts, Guardians, Transaction, Settings. (Create Wallet, Fund, Swap, onboarding popups are still `<div>`s.) |
| G4 | Amounts read in words ("zero point one test ETH") | ⚠️ Contract announcements still say "0.1 test ETH". The send wording in the app currently comes from the old parser ("Prepared transfer: Sending 0.05…"), not the model's read-back. |
| G5 | Installable as a PWA on Android | ❌ Not done. |
| G6 | Guardian and beneficiary screens | Contract tester page only (fine for the demo). |
| G7 | Manglish | Replaced by Arabic (team decision). |

---

## 0. Setup (all on the demo PC)

- [ ] `git pull` on branch `claude/trusting-allen-e40phb`; `npm install` in `frontend/` and `contracts/`; `pip install -r requirements.txt` in `ml/`
- [ ] **Model**: `cd ml` → `python -m uvicorn app.main:app --port 8000` → http://localhost:8000/health shows `"status":"ok"` (and `v3+mmbert` if the mmBERT files are in `ml/models/mmbert_fp32/`)
- [ ] **Contract**: Sepolia: `cd contracts` → `npm run wallets` (once) → `npm run deploy:sepolia` → Etherscan link opens and shows the contract
      *(or local: `npx hardhat node` + `npm run deploy:local`)*
- [ ] **Frontend**: `cd frontend` → `npm install` → `npm run dev` (start **after** the deploy) → http://localhost:5173 opens in **Edge**
- [ ] The wallet's ETH balance equals the vault's balance (0.1 on Sepolia by default, 2.5 locally), **not** a made-up number
- [ ] **Contract tester** (guardians / beneficiary): `cd contracts` → `npm run tester -- sepolia` → http://localhost:5174
- [ ] Earphones plugged in; Windows volume up; Edge Natural voices present (Settings → speech, or just listen: it should sound human)

## 1. AI / voice commands (spec: AI/ML module)

Press **Space**, speak, watch the voice card above the voice bar and DevTools console (`[SayPay model …]`).
Pick the page language (EN / हिंदी / العربية) **before** speaking that language.

**Intents (spec: at least these 6)**
- [ ] check_balance: "What's my balance" / "मेरा बैलेंस कितना है" / "كم رصيدي"
- [ ] send: "Send 0.05 ETH to Priya" / "प्रिया को 0.2 ईथर भेजो" / "حول 0.1 إيثيريوم لأمي"
- [ ] history: "Show my transactions" → Activity tab
- [ ] add_contact: "Save this number as Ravi" → Contacts with **Ravi** filled in
- [ ] recovery_help: "I lost my phone" / "نسيت كلمة السر" → Guardians
- [ ] cancel: "Cancel" / "rehne do" / "الغي"

**Language challenges (spec)**
- [ ] Code-switching: "Ahmed ko fifty dirham send karo", "send 50 درهم to Ahmed"
- [ ] Spelling by ear: "Send to **Sarah** 0.1" → Sara; "Send 0.1 to **Zayd**" → Zaid
- [ ] Transliteration: "7awel 0.1 la Amma" (Arabizi), "Rahul ko 500 bhejo" (Latin Hindi)
- [ ] Spoken numbers: "पांच सौ", "साढ़े तीन सौ" (350), "خمسين", "zero point one"
- [ ] Contact matching: "mom" / "أمي" / "मम्मी" → Amma

**Safety (spec: confidence rule, AI never moves money)**
- [ ] Low confidence → asks ("Did you want to … or …?"), **no Send popup**
- [ ] "Send money to Priya" → "How much…?", no popup
- [ ] "Send 50 dirhams to Priya" → "I can only send test ETH…", no popup
- [ ] "Ask Priya for 20 dollars" → **never** opens Send
- [ ] "Book a flight" → "Sorry, I didn't understand"
- [ ] Model server stopped → app still works with the basic parser (grey card)
- [ ] **Typed fallback**: type each command above in "Type a command instead of speaking" → same result as speaking

**Numbers for the pitch (spec: held-out test set vs English-only baseline)**
- [ ] `cd ml/scripts` → `python evaluate.py --sets blind_v2,blind_hi,blind_en` → note accuracy for `v3` and `english_only`
      (held-out hand-written sets: 120 + 79 + 69 = 268 commands, more than the spec's 150)
- [ ] Amount / contact extraction accuracy from the same report (`reports/eval.md`)
- [ ] Decide the model: current v3 (default) or `SAYPAY_V3_MODEL=models/intent_v5.joblib` (better Hindi, lower Arabic dialect scores)

## 2. Read-back and fingerprint (spec: "never cut")

- [ ] Every send is **read back** before anything happens: amount in words + name ("Send zero point zero five test ETH to Priya. Confirm with your fingerprint.")
- [ ] Say "fingerprint" / press Review & Sign → the **real** Windows Hello / phone fingerprint prompt appears
- [ ] Cancel the fingerprint → nothing is sent, and it says so
- [ ] Approve → 5-second undo window; "undo" within 5 s cancels
- [ ] Sent amount equals the spoken amount (0.05 stays 0.05)
- [ ] After the undo window you hear **"Pending." → "Confirmed." → "Sent 0.05 test ETH to Amma."**, and the balance drops by exactly that amount (check Etherscan: one transaction, not two)
- [ ] History shows the payment; on Sepolia its hash opens on Etherscan

## 3. Blockchain (spec: contract module)

- [ ] `cd contracts` → `npm test` → **12 passing**, including the spec's 5: recovery with threshold, cancelled by owner, inheritance vetoed, inheritance claimed, guardians can't send
- [ ] Deployed on a **public testnet** (Sepolia) with an Etherscan link; `npm run verify:sepolia` → source code visible on Etherscan
- [ ] Etherscan shows **no names, phone numbers or personal data**, only addresses and amounts
- [ ] **Send** (tester or `/chain-test.html`): Pending → Confirmed → "Sent … to Amma", Etherscan link works
- [ ] **Guardians can't send**: tester → act as Guardian → Send → "Only the owner can do that"
- [ ] **Recovery on a second device** (spec success criterion): second browser profile opens `/chain-test.html` as **New phone**; Guardian Ahmed proposes + Guardian Priya approves (tester) → owner phone hears the **urgent** warning → wait 2 min → New phone "Finish recovery" → "This phone now controls your wallet"; old phone hears "Your wallet moved…" and can no longer send
- [ ] **Owner cancels a recovery**: new recovery → owner "Cancel recovery" within 2 min → "Recovery cancelled. Your wallet is safe." → finishing it later fails
- [ ] **Inheritance with the 2-minute timer** (spec success criterion): no owner activity 2 min → Start inheritance → announced → wait 2 min → Beneficiary Sara claims → all funds to Sara, wallet closed
- [ ] **Veto**: start inheritance → a guardian vetoes (or owner pings) → stopped, announced
- [ ] Only one recovery at a time (second propose refused)

**The same, from the wallet app itself** (voice or typed)
- [ ] A guardian proposes recovery (tester) → the app interrupts with the **alert**: "…started moving your wallet to a new phone. If this wasn't you, say cancel recovery."
- [ ] Say/type **"cancel recovery"** → fingerprint → "Recovery cancelled. Your wallet is safe."
- [ ] Start inheritance (tester) → the app announces it → say/type **"I'm here"** → fingerprint → inheritance stopped
- [ ] Second browser profile opens the app with **`?device=newphone`**; after guardians approve and 2 min pass, say/type **"finish recovery"** → "This phone now controls your wallet"; the first browser hears "Your wallet moved to your new phone"

## 4. Accessibility (spec: Web module)

**Announcer**
- [ ] One polite live region and one alert region exist when the app loads (`LiveAnnouncer`)
- [ ] Polite for normal updates; **alert only** for errors and security events (recovery started on your wallet)
- [ ] The same message twice in a row is announced twice (clear → ~100 ms → text)
- [ ] **Every contract event is announced** (spec: also a Playwright test) — Deposited, Sent, RecoveryProposed, RecoveryApproved, RecoveryExecuted, RecoveryCancelled, InheritanceStarted, InheritanceVetoed, InheritanceClaimed
- [ ] Nothing changes on screen without being announced (balance change, errors, popups opening)

**Sounds** (short, under 1 s, never instead of words)
- [ ] Listening started · success · error · security warning are **different** sounds
- [ ] Pending and Confirmed have different sounds

**Focus**
- [ ] A popup (Send, Receive, Contacts, Guardians) takes focus when it opens and its title is read; **Escape** closes it; focus returns to the button that opened it
- [ ] Inside the Send popup, pressing **Space** still starts the mic (it must not press a button)
- [ ] Focus never jumps while typing or speaking
- [ ] Tab order is logical; focus outline always visible

**Other**
- [ ] Every button has a clear label ("Send money", not "Next"); icon-only buttons have `aria-label` (check the mic button)
- [ ] Terms explained in plain words ("Wallet address: like a bank account number")
- [ ] No step times out while the user thinks (the passkey prompt allows 45 s: acceptable?)
- [ ] Full keyboard use: do a whole send without the mouse
- [ ] One **large** on-screen button starts voice input
- [ ] Reads well in Arabic (right-to-left layout, Arabic voice)

**Screen readers (spec: every flow)**
- [ ] **NVDA** on Windows (app speech OFF to avoid double speech): balance, send + fingerprint, recovery announcement
- [ ] **TalkBack** on Android (Chrome, same Wi-Fi or a tunnel): balance, send

## 5. Security answers (spec: say these in the pitch, honestly)

- [ ] Can explain: no voice password (voice clones from ~3 s audio) → fingerprint
- [ ] AI never moves money: proposes → read-back → fingerprint
- [ ] No personal data on chain; contacts stay on the phone
- [ ] No seed phrase: guardian recovery instead
- [ ] Recovery delay the owner can cancel; guardians can't move funds
- [ ] Voice commands processed on our own server, never logged
- [ ] "Testnet prototype, not security-audited" (say it)

## 6. Demo rehearsal (spec: 4 minutes, screen dimmed, screen reader on)

- [ ] 1 Setup without a seed phrase: create wallet, add 2 guardians by contact name, every step announced
- [ ] 2 Balance by voice (Arabic or Hindi) → answered and announced
- [ ] 3 Send by voice → read-back → fingerprint → "Pending" → "Confirmed", distinct sounds
- [ ] 4 A judge tries it in their own language mix (have 3 example cards ready: EN / हिंदी / العربية)
- [ ] 5 Lost phone: second device, 2 guardians approve, delay, access returns; mention the owner could cancel
- [ ] 6 Inheritance with the 2-minute timer: beneficiary claims
- [ ] 7 Before/after clip: same steps in MetaMask with a screen reader (silence) vs SayPay
- [ ] Whole demo under 4 minutes, run twice without errors
- [ ] **Backup demo video recorded** (spec success criterion)
- [ ] Plan B if Wi-Fi fails: local chain (`npx hardhat node` + `deploy:local`, then restart `npm run dev`); if speech fails: the typed command box

## 7. "Done means" (spec)

- [ ] Balance check and a send work fully by voice (in our languages)
- [ ] Every send is read back and approved with a fingerprint
- [ ] Guardian recovery works on a second device, and the owner can cancel it
- [ ] Inheritance claim works with the 2-minute demo timer
- [ ] Every contract event is announced, verified with a screen reader
- [ ] Intent accuracy measured on ≥150 held-out commands (we have 268)
- [ ] Backup demo video recorded
