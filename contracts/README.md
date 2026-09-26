# SayPayVault contract

One contract holds the funds. The owner's device key controls it day to day,
guardians can move control to a new device if the phone is lost, and a
beneficiary inherits if the owner stops using it. Nobody ever sees a seed phrase,
and **guardians can never move funds**: their only power is approving a new
owner key, or vetoing an inheritance while the owner is alive.

No names, phone numbers or personal data go on chain. "Amma" → address lives in
the address book on the device.

## Run it

```bash
cd contracts
npm install
npm test                 # 12 tests, including the 5 the spec asks for
```

The Solidity compiler comes from npm (`solc` package), so after `npm install`
compiling needs no internet (bad venue wifi can't break it).

Local chain for the demo:

```bash
npx hardhat node         # terminal 1: local chain + 20 funded test accounts
npm run deploy:local     # terminal 2: deploys, funds with 2.5 ETH, 2-minute timers
```

This writes `deployments/localhost.json` (address, ABI, deploy block, settings)
for the web app. Test accounts: #0 owner, #1-3 guardians, #4 beneficiary.

### Tester page

```bash
npm run tester           # terminal 3: http://localhost:5174
```

Pick who you are (owner, a guardian, the beneficiary, the new phone, Amma), press
a button, and watch the wallet state, the countdowns and the event log. **Skip 2
minutes** moves the local chain's clock so you don't wait for the timers. Events
go to an aria-live region (and can be spoken aloud), and every refused action
says why ("Only the owner can do that."). Works offline.

Try the demo story: send to Amma → a guardian tries to send (refused) → Guardian
Ahmed proposes recovery to "New phone", Guardian Priya approves → execute (too
early) → skip → execute → the old phone is locked out → skip → start inheritance →
a guardian vetoes → skip → start again → skip → Sara claims.

If you restart `npx hardhat node`, run `npm run deploy:local` again and reload.

### Sepolia (public testnet)

You need a throwaway MetaMask account with Sepolia test ETH (a faucet gives it;
0.3 ETH is plenty). Nothing else: the RPC defaults to a free public endpoint.

```bash
cp .env.example .env          # then paste the MetaMask account's private key:
                              # DEPLOYER_PRIVATE_KEY=...  (with or without 0x)
npm run wallets               # once: creates the demo people's test wallets in .env
npm run deploy:sepolia        # deploys, puts 0.1 ETH in the vault, gives each person gas
npm run verify:sepolia        # optional, needs ETHERSCAN_API_KEY: source code on Etherscan
npm run tester -- sepolia     # tester page on Sepolia: http://localhost:5174
```

`deploy:sepolia` writes `deployments/sepolia.json` (address, ABI, people) and
prints the Etherscan link. On Sepolia each transaction takes ~12 s (the tester
says "Pending", then "Confirmed", with an Etherscan link) and the 2-minute timers
run in real time: there is no "Skip 2 minutes". `.env` holds test keys only and
is git-ignored; never commit it or paste keys anywhere.

## Functions

| Who | Function | What it does |
|---|---|---|
| owner | `send(to, amount)` | transfers ETH, resets the activity timer |
| owner | `ping()` | "I'm still here": resets the timer without sending |
| owner | `cancelRecovery()` | stops a recovery the owner didn't ask for |
| guardian | `proposeRecovery(newOwner)` | starts a recovery to the new device's key (counts as 1 approval) |
| guardian | `approveRecovery(newOwner)` | approves; at the threshold the delay starts |
| anyone | `executeRecovery()` | after the delay, the new device becomes owner |
| anyone | `startInheritance()` | after the inactivity period, starts the grace period |
| guardian | `vetoInheritance()` | "the owner is alive": stops it and resets the timer |
| beneficiary | `claimInheritance()` | after the grace period, receives everything |
| anyone | `status()` | owner, balance, recovery and inheritance state in one call |

Rules the tests check:
- one recovery at a time, one approval per guardian per attempt
- approvals from a cancelled attempt never count towards a new one
- any owner activity (`send`, `ping`) ends a running inheritance
- a guardian can't be proposed as the new owner
- after the claim the vault is closed

Demo timers: all three are 120 s (`VAULT_TIMER_SECONDS`).

## Events → what the app announces

Every state change emits an event. The app listens and announces each one
(aria-live, polite; `RecoveryProposed` / `InheritanceStarted` should be assertive
on the owner's device, because someone else is acting on their wallet).

| Event | English | Arabic | Hindi |
|---|---|---|---|
| `Deposited(from, amount)` | You received {amount} test ETH from {name}. | وصلك {amount} إيثيريوم تجريبي من {name}. | {name} से {amount} टेस्ट ईथर मिला। |
| `Sent(to, amount)` | Sent {amount} test ETH to {name}. Confirmed. | تم تحويل {amount} إيثيريوم تجريبي إلى {name}. | {name} को {amount} टेस्ट ईथर भेज दिया गया। |
| `RecoveryProposed(guardian, newOwner)` | {guardian} started a recovery to a new phone. If this wasn't you, say "cancel recovery". | {guardian} بدأ استرجاع المحفظة على جوال جديد. إذا ما كنت أنت، قل "الغي الاسترجاع". | {guardian} ने नए फ़ोन पर रिकवरी शुरू की। अगर यह आप नहीं हैं, तो "रिकवरी कैंसल करो" बोलिए। |
| `RecoveryApproved(guardian, newOwner, approvals, readyAt)` | {guardian} approved the recovery. {approvals} of {threshold} approvals. | {guardian} وافق على الاسترجاع. {approvals} من {threshold}. | {guardian} ने रिकवरी मंज़ूर की। {threshold} में से {approvals}। |
| `RecoveryExecuted(oldOwner, newOwner)` | Recovery complete. This phone now controls your wallet. | تم الاسترجاع. هذا الجوال الحين يتحكم بمحفظتك. | रिकवरी पूरी हुई। अब यह फ़ोन आपका वॉलेट चलाता है। |
| `RecoveryCancelled(by, newOwner)` | Recovery cancelled. Your wallet is safe. | تم إلغاء الاسترجاع. محفظتك بأمان. | रिकवरी रद्द हो गई। आपका वॉलेट सुरक्षित है। |
| `InheritanceStarted(startedAt, claimableAt)` | Your wallet has been inactive. Inheritance starts in {minutes} minutes unless you or a guardian stop it. | محفظتك غير نشطة. الوراثة تبدأ بعد {minutes} دقائق إذا ما أوقفتها أنت أو أحد الأوصياء. | आपका वॉलेट निष्क्रिय है। {minutes} मिनट में विरासत शुरू होगी, जब तक आप या गार्डियन इसे न रोकें। |
| `InheritanceVetoed(by)` | Inheritance stopped. The owner is active. | توقفت الوراثة. صاحب المحفظة نشط. | विरासत रोक दी गई। मालिक सक्रिय है। |
| `InheritanceClaimed(beneficiary, amount)` | {amount} test ETH passed to the beneficiary. | انتقل {amount} إيثيريوم تجريبي إلى الوريث. | {amount} टेस्ट ईथर वारिस को मिल गया। |
| `Pinged(at)` | (optional) Activity timer reset. | | |

Amounts should be read in words ("zero point one test ETH"); the intent API's
`readback` module already does this for commands.

## Frontend wiring (ethers v6)

```js
import deployment from "../../contracts/deployments/localhost.json";
const vault = new ethers.Contract(deployment.address, deployment.abi, signerOrProvider);
vault.on("Sent", (to, amount) => announce(`Sent ${ethers.formatEther(amount)} test ETH to ${nameOf(to)}`));
await vault.send(addressOf("Amma"), ethers.parseEther("0.1"));   // after passkey approval
```
