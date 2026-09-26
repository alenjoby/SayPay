# SayPay

A crypto wallet for blind people that you use by voice, in English, Hindi or Arabic
(or a mix of them). You say what you want, the app reads it back, and you confirm
with your fingerprint. No seed phrase: if you lose your phone, your guardians help
you get the wallet back.

It has three parts:
- **Voice model** (`ml/`): understands mixed-language commands like "Rahul ko 500 bhejo" or "حول 0.1 لأمي"
- **Web app** (`frontend/`): everything is read out loud and works with screen readers
- **Smart contract** (`contracts/`): the SayPayVault wallet, with guardian recovery and an inheritance switch

## The problems we picked (BitNBuild '26)

**AI/ML: Code-Switching and Spelling by Ear.** People in the Gulf mix Arabic, Hindi
and English in one sentence, and speech-to-text spells names however it hears them.
We trained our own intent model (no chatbot API) on mixed-language and
"wrong-script" commands like "Rahul ko 500 bhejo" or "send 0.05 ETH to أمي". It
matches contact names by sound ("Sarah" finds Sara), reads amounts back in words, and
asks when it isn't sure instead of guessing. On 120 hand-written test commands it gets
96.7% (97.5% with the mmBERT ensemble), against 69% for an English-only model, with no
confident wrong sends.

**Blockchain: Self-Custody Assumes You Are Alive.** The SayPayVault contract has no
seed phrase to lose. If you lose your phone, your guardians can move the wallet to a
new one, but you get warned and can cancel it, and guardians can never take the money.
If you stop showing up, an inheritance switch lets your family claim it after a
waiting period, and saying "I'm here" stops it. Tested, and deployable to Sepolia.

**Web: Interfaces That Change Silently.** Nothing on screen changes without being
said out loud: every popup is a real dialog that a screen reader announces, security
events (like someone starting a recovery) interrupt you, each state has its own sound,
and you can type a command when speech doesn't work.

## Run it

You need **Python 3.11+** and **Node.js 20+**. Use **Chrome or Edge**.

We recommend running it manually (below): you see each part start, and if something
fails you see the error right away. The one-click script is just a shortcut that
does the same steps for you.

### Manually (recommended)

Open four terminals in the `SayPay` folder.

**1. Voice model**
```
cd ml
python -m venv .venv
.venv\Scripts\activate          (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000
```

**2. Blockchain** (keep it running)
```
cd contracts
npm install
npx hardhat node
```

**3. Deploy the contract, then start the app**
```
cd contracts
npm run deploy:local
cd ../frontend
npm install
npm run dev
```
Open http://localhost:5173.

**4. Contract tester** (optional, for the guardian and inheritance demo)
```
cd contracts
npm run tester
```
Open http://localhost:5174.

`pip install` and `npm install` are only needed the first time. To stop, press Ctrl+C
in each terminal.

### One click

- **Windows:** double-click `start.bat`
- **Mac / Linux:** run `./start.sh`

It runs the same four steps in the background and opens http://localhost:5173. The
first run installs everything and takes a few minutes; after that it starts in a few
seconds. If a step fails, it shows the error, and the full logs are in the `logs` folder.

To stop: press Enter in the start window (Windows) or Ctrl+C (Mac/Linux).

**`stop.bat`** (Windows): stops everything SayPay started (the model, the blockchain,
the app and the tester, on ports 8000, 8545, 5173 and 5174). Double-click it if you
closed the start window with X, or if you get "port already in use".

### Using it

Open the wallet, **tap Space, talk, then tap Space again** to send it (or hold Space
while you talk; the mic button works the same way). You can also type commands in the box
under the voice bar.

## Try saying

| Language | Say |
|---|---|
| English | "What's my balance" |
| English | "Send 0.05 ETH to Amma" |
| English | "Send 0.05 to Sarah" (finds Sara, even with the wrong spelling) |
| Hindi | "मेरा बैलेंस बताओ" |
| Hindi | "प्रिया को 0.05 ईथर भेजो" |
| Hinglish | "Priya ko 0.05 eth bhejo" |
| Arabic | "كم رصيدي" |
| Arabic | "حول 0.1 إيثيريوم لأمي" |
| Mixed | "send 0.05 ETH to أمي" |

After a send, say **"fingerprint"** to confirm. You then have 5 seconds to say **"undo"**.

More commands:
- "Show my transactions" / "Did my last payment go through"
- "I lost my phone" (opens guardians)
- "Cancel recovery" (stops a recovery you didn't start)
- "I'm here" (tells the wallet you're still around, which stops the inheritance timer)
- "Change to Arabic" / "Hindi mein baat karo" / "Change to English"
- "Cancel"

The app asks instead of guessing when something is missing: "Send money to Priya"
gets "How much should I send to Priya?".

Contacts in the demo wallet: Amma, Priya, Zaid, Fatima, Sara.

## Guardian recovery and inheritance demo

Quickest way, without leaving the app: in a terminal in `contracts/`, run
`npm run demo recovery` (a guardian starts moving your wallet: the app warns you, say
"cancel recovery"), `npm run demo inheritance` (say "I'm here") or `npm run demo deposit`
(Amma sends you 0.1 ETH). Or use the contract tester:

Open the contract tester (http://localhost:5174) next to the app. It lets you act as a
guardian or the beneficiary.

- **Recovery:** as Guardian Ahmed, press *Propose recovery*. The app warns you right away.
  Say "cancel recovery" to stop it, or let two guardians approve, press *Skip 2 minutes*,
  and finish it from a second browser window opened at
  http://localhost:5173/?device=newphone
- **Inheritance:** press *Skip 2 minutes*, then *Start inheritance*. Say "I'm here" to stop
  it, or skip again and claim it as Beneficiary Sara.

## If something goes wrong

- **"Port is already in use":** SayPay is already running. Double-click `stop.bat` (Windows)
  or close the other terminals.
- **Voice doesn't work:** use Chrome or Edge and allow the microphone. Or type the command.
- **The app says it isn't connected to the blockchain:** make sure `npx hardhat node` is
  running, then run `npm run deploy:local` again and reload the page.
- Logs from the start script are in the `logs` folder.

## License

MIT
