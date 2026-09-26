# SayPay

A crypto wallet for blind people that you use by voice, in English, Hindi or Arabic
(or a mix of them). You say what you want, the app reads it back, and you confirm
with your fingerprint. No seed phrase: if you lose your phone, your guardians help
you get the wallet back.

It has three parts:
- **Voice model** (`ml/`): understands mixed-language commands like "Rahul ko 500 bhejo" or "حول 0.1 لأمي"
- **Web app** (`frontend/`): everything is read out loud and works with screen readers
- **Smart contract** (`contracts/`): the SayPayVault wallet, with guardian recovery and an inheritance switch

## Run it

You need **Python 3.11+** and **Node.js 20+**.

- **Windows:** double-click `start.bat`
- **Mac / Linux:** run `./start.sh`

The first run installs everything and takes a few minutes. After that it starts in a
few seconds and opens http://localhost:5173 in your browser.

Use **Chrome or Edge**, open the wallet, then **hold Space and talk**. You can also
type commands in the box under the voice bar.

To stop: press Enter in the start window (Windows) or Ctrl+C (Mac/Linux). On Windows,
if you closed the window, run `stop.bat`.

## Install it manually

If the start script doesn't work for you, open four terminals in the `SayPay` folder.

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

Open the contract tester (http://localhost:5174) next to the app. It lets you act as a
guardian or the beneficiary.

- **Recovery:** as Guardian Ahmed, press *Propose recovery*. The app warns you right away.
  Say "cancel recovery" to stop it, or let two guardians approve, press *Skip 2 minutes*,
  and finish it from a second browser window opened at
  http://localhost:5173/?device=newphone
- **Inheritance:** press *Skip 2 minutes*, then *Start inheritance*. Say "I'm here" to stop
  it, or skip again and claim it as Beneficiary Sara.

## If something goes wrong

- **"Port is already in use":** SayPay is already running. Run `stop.bat` (Windows) or close
  the other window.
- **Voice doesn't work:** use Chrome or Edge and allow the microphone. Or type the command.
- **The app says it isn't connected to the blockchain:** make sure `npx hardhat node` is
  running, then run `npm run deploy:local` again and reload the page.
- Logs from the start script are in the `logs` folder.

## License

MIT
