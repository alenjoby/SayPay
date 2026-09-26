# src/chain: the wallet on the blockchain

Talks to the `SayPayVault` contract (`contracts/`). Nothing here is wired into the
wallet screens yet; try it on the dev page first.

## Try it

```bash
cd contracts && npx hardhat node          # terminal 1 (or deploy to Sepolia instead)
cd contracts && npm run deploy:local      # terminal 2: also writes frontend/public/chain/localhost.json
                                          #   and frontend/.env.development.local (demo device keys)
cd frontend && npm run dev                # terminal 3 (start it AFTER the deploy: it reads the env file)
```

Open http://localhost:5173/chain-test.html → "Set up this phone" → Send. You hear
Pending → Confirmed → "Sent 0.1 test ETH to Amma", each with its own sound. Open a
second browser profile as "New phone" to try the recovery; guardians act from the
contract tester (`npm run tester` in contracts/).

Sepolia: `npm run deploy:sepolia` writes `public/chain/sepolia.json` and switches
`VITE_CHAIN_NETWORK` to `sepolia`; restart `npm run dev`.

## Files

| File | What it does |
|---|---|
| `deployment.ts` | loads `public/chain/<network>.json` (address, ABI, people; no keys) |
| `deviceKey.ts` | the phone's key: encrypted (AES-GCM, non-extractable key in IndexedDB), decrypted only after the fingerprint, per transaction; no seed phrase |
| `vault.ts` | status, send, ping, recovery, inheritance; progress `approving → pending → confirmed / failed`; live events (own + other people's), each once |
| `announce.ts` | every event and step → a sentence in en / ar / hi; addresses become contact names or "an unknown wallet"; recovery/inheritance are `urgent` |
| `sounds.ts` | Pending / Confirmed / Failed sounds, distinct from the other earcons |
| `useVault.ts` | React hook bundling all of the above for a screen |

## Wiring into FunctionalWalletPage (after the voice work is merged)

```tsx
import { useSayPayVault } from '../chain';

const chain = useSayPayVault({
  lang,
  nameOf: (a) => userState.contacts.find((c) => c.address.toLowerCase() === a.toLowerCase())?.name ?? null,
  onAnnounce: (a) => { setAriaAnnouncement(a.text); speakAndFollowUp(a.text, lang, false); },
  sounds: accessibilitySettings.earconsEnabled,
});
```

1. **Balance**: show `chain.status?.balanceEth` instead of the stored `userState.balanceETH`.
2. **Send**: in `finalizeSend` (after the 5-second undo window), replace the local
   balance/confetti/fake-hash code with
   `await chain.send(address, amount, async () => !!sigResult?.success);`
   The fingerprint was already given in the Send popup, so the key unlocks on it.
   Pending / Confirmed / "Sent … to Amma" are announced by the hook.
3. **Voice**: "I'm here" → `chain.ping(approve)`; "cancel recovery" → `chain.cancelRecovery(approve)`.
4. **New phone**: open the app with `?device=newphone`; a "Finish recovery" action →
   `chain.executeRecovery(approve)`. `chain.isOwner` tells whether this phone owns the wallet.
5. **History** can come from the chain later (the `Sent` / `Deposited` events).

Contacts keep their addresses on the device; names never go on chain.
