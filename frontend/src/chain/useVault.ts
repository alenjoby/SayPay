/**
 * React hook: the on-chain wallet for a screen. Loads the deployment, sets up
 * this phone's key (demo pairing), keeps the status fresh, and announces every
 * contract event and every transaction step through `onAnnounce`.
 *
 *   const chain = useSayPayVault({ lang, nameOf, onAnnounce: (a) => speakAndFollowUp(a.text, lang) });
 *   await chain.send(address, 0.1, async () => sigResult.success);
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupportedLanguage } from '../utils/i18n';
import { loadDeployment } from './deployment';
import { deviceAddress, demoKeyFor, importDeviceKey } from './deviceKey';
import type { DeviceRole } from './deviceKey';
import { SayPayVault } from './vault';
import type { TxProgress, VaultEvent, VaultStatus } from './vault';
import { describeEvent, describeProgress } from './announce';
import type { Announcement } from './announce';
import { txSounds } from './sounds';

export interface UseVaultOptions {
  lang: SupportedLanguage;
  /** Contact name for an address (the device address book), or null. */
  nameOf: (address: string) => string | null;
  /** Speak / aria-live this. `kind` is the event name or the progress stage. */
  onAnnounce: (a: Announcement, kind: string) => void;
  /** Play the Pending / Confirmed / Failed sounds (the earcons setting). */
  sounds?: boolean;
  /** Which demo phone this is. Default: ?device=newphone in the URL, else owner. */
  device?: DeviceRole;
}

type Approve = () => Promise<boolean>;

export function useSayPayVault(opts: UseVaultOptions) {
  const [vault, setVault] = useState<SayPayVault | null>(null);
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Latest options, read inside long-lived callbacks (avoids stale closures).
  const o = useRef(opts);
  o.current = opts;

  const refresh = useCallback(async (v: SayPayVault | null = vault) => {
    if (!v) return;
    try {
      setStatus(await v.status());
    } catch {
      /* keep the last status on a network hiccup */
    }
  }, [vault]);

  // Load the deployment and pair this phone once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = new SayPayVault(await loadDeployment());
        const role: DeviceRole =
          o.current.device ??
          (new URLSearchParams(window.location.search).get('device') === 'newphone' ? 'newphone' : 'owner');
        if (!deviceAddress(v.scope)) {
          const key = demoKeyFor(role);
          if (key) await importDeviceKey(v.scope, key);
        }
        if (cancelled) return;
        setVault(v);
        setMe(deviceAddress(v.scope));
        await refresh(v);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Announce every contract event (this phone's and other people's), once.
  useEffect(() => {
    if (!vault) return;
    const stop = vault.onEvent(async (ev: VaultEvent) => {
      const { lang, nameOf, onAnnounce } = o.current;
      const now = await vault.chainTime();
      onAnnounce(describeEvent(ev, { lang, nameOf, me: deviceAddress(vault.scope),
                                     threshold: vault.deployment.threshold, now }), ev.name);
      refresh(vault);
    });
    const timer = setInterval(() => refresh(vault), vault.local ? 3000 : 10000);
    return () => { stop(); clearInterval(timer); };
  }, [vault, refresh]);

  const onProgress = useCallback((p: TxProgress) => {
    const { lang, onAnnounce, sounds = true } = o.current;
    if (sounds) {
      if (p.stage === 'pending') txSounds.pending();
      if (p.stage === 'confirmed') txSounds.confirmed();
      if (p.stage === 'failed') txSounds.failed();
    }
    const a = describeProgress(p, lang);
    if (a) onAnnounce(a, p.stage);
  }, []);

  const run = useCallback(async (fn: (v: SayPayVault) => Promise<boolean>) => {
    if (!vault) {
      o.current.onAnnounce({ text: 'The wallet is not connected to the blockchain.', urgent: true }, 'failed');
      return false;
    }
    setBusy(true);
    try {
      return await fn(vault);
    } finally {
      setBusy(false);
      refresh(vault);
    }
  }, [vault, refresh]);

  return {
    vault, status, me, error, busy,
    /** Is this phone the wallet owner right now? (false after a recovery moved it) */
    isOwner: !!(status && me && status.owner.toLowerCase() === me.toLowerCase()),
    refresh: () => refresh(vault),
    send: (to: string, amountEth: number | string, approve: Approve) =>
      run((v) => v.send(to, amountEth, approve, onProgress)),
    ping: (approve: Approve) => run((v) => v.ping(approve, onProgress)),
    cancelRecovery: (approve: Approve) => run((v) => v.cancelRecovery(approve, onProgress)),
    executeRecovery: (approve: Approve) => run((v) => v.executeRecovery(approve, onProgress)),
  };
}
