/**
 * SayPayVault from the phone: read the wallet state, send money, and the
 * recovery / inheritance calls, each reporting its progress so the app can
 * announce "Pending" and "Confirmed". Also watches contract events live.
 */
import { Contract, JsonRpcProvider, Wallet, formatEther, getAddress, isAddress, parseEther } from 'ethers';
import type { Log } from 'ethers';
import { Deployment, isLocalChain } from './deployment';
import { withDeviceKey, ApprovalRejected } from './deviceKey';

export interface VaultStatus {
  owner: string;
  balanceEth: string;
  closed: boolean;
  pendingOwner: string | null;
  approvals: number;
  recoveryReadyAt: number | null; // unix seconds
  inheritanceStartedAt: number | null;
  inheritanceClaimableAt: number | null;
  inactiveAt: number;
}

export type TxProgress =
  | { stage: 'approving' }
  | { stage: 'pending'; hash: string; url: string | null }
  | { stage: 'confirmed'; hash: string; block: number; url: string | null; events: VaultEvent[] }
  | { stage: 'failed'; reason: FailReason; message: string };

/** Why a transaction didn't happen, as a code the app can speak in any language. */
export type FailReason =
  | 'rejected' // fingerprint cancelled
  | 'not_owner'
  | 'not_guardian'
  | 'not_beneficiary'
  | 'closed'
  | 'bad_address'
  | 'insufficient_balance'
  | 'recovery_active'
  | 'no_recovery'
  | 'wrong_new_owner'
  | 'already_approved'
  | 'recovery_not_ready'
  | 'owner_active'
  | 'inheritance_active'
  | 'no_inheritance'
  | 'grace_not_over'
  | 'no_gas'
  | 'network'
  | 'unknown';

const ERROR_CODES: Record<string, FailReason> = {
  NotOwner: 'not_owner',
  NotGuardian: 'not_guardian',
  NotBeneficiary: 'not_beneficiary',
  VaultClosed: 'closed',
  BadAddress: 'bad_address',
  BadConfig: 'unknown',
  InsufficientBalance: 'insufficient_balance',
  TransferFailed: 'unknown',
  RecoveryActive: 'recovery_active',
  NoRecovery: 'no_recovery',
  WrongNewOwner: 'wrong_new_owner',
  AlreadyApproved: 'already_approved',
  RecoveryNotReady: 'recovery_not_ready',
  OwnerStillActive: 'owner_active',
  InheritanceActive: 'inheritance_active',
  NoInheritance: 'no_inheritance',
  GraceNotOver: 'grace_not_over',
};

export interface VaultEvent {
  name: string;
  args: Record<string, unknown>;
  txHash: string;
  block: number;
  logIndex: number;
}

type Approve = () => Promise<boolean>;

export class SayPayVault {
  readonly provider: JsonRpcProvider;
  readonly contract: Contract;
  readonly local: boolean;

  constructor(readonly deployment: Deployment) {
    this.local = isLocalChain(deployment);
    this.provider = new JsonRpcProvider(deployment.rpcUrl, deployment.chainId, {
      staticNetwork: true,
      pollingInterval: this.local ? 1000 : 4000,
    });
    this.contract = new Contract(deployment.address, deployment.abi, this.provider);
  }

  /** Scope for the device key: one key per vault. */
  get scope(): string {
    return `${this.deployment.chainId}:${this.deployment.address}`;
  }

  txUrl(hash: string): string | null {
    return this.deployment.explorer ? `${this.deployment.explorer}/tx/${hash}` : null;
  }

  async status(): Promise<VaultStatus> {
    const s = await this.contract.status();
    const t = (v: bigint) => (v > 0n ? Number(v) : null);
    const zero = (a: string) => /^0x0{40}$/i.test(a);
    return {
      owner: s.owner_,
      balanceEth: formatEther(s.balance),
      closed: s.closed_,
      pendingOwner: zero(s.pendingOwner_) ? null : s.pendingOwner_,
      approvals: Number(s.approvals_),
      recoveryReadyAt: t(s.recoveryReadyAt_),
      inheritanceStartedAt: t(s.inheritanceStartedAt_),
      inheritanceClaimableAt: t(s.inheritanceClaimableAt),
      inactiveAt: Number(s.inactiveAt),
    };
  }

  /** Current chain time (local chains can be time-travelled ahead of the wall clock). */
  async chainTime(): Promise<number> {
    const b = await this.provider.getBlock('latest');
    return Math.max(Number(b?.timestamp ?? 0), Math.floor(Date.now() / 1000));
  }

  // ---- Owner (this phone) -------------------------------------------------

  send(to: string, amountEth: number | string, approve: Approve, onProgress: (p: TxProgress) => void) {
    // Address-book entries may have any letter case (the demo contacts' checksums
    // are wrong); lower-casing skips the checksum check and getAddress normalises it.
    const lower = (to || '').trim().toLowerCase();
    if (!isAddress(lower)) {
      onProgress({ stage: 'failed', reason: 'bad_address', message: 'Not a wallet address.' });
      return Promise.resolve(false);
    }
    return this.transact('send', [getAddress(lower), parseEther(String(amountEth))], approve, onProgress);
  }

  ping(approve: Approve, onProgress: (p: TxProgress) => void) {
    return this.transact('ping', [], approve, onProgress);
  }

  cancelRecovery(approve: Approve, onProgress: (p: TxProgress) => void) {
    return this.transact('cancelRecovery', [], approve, onProgress);
  }

  // ---- Anyone (e.g. the new phone after the delay) ---------------------------

  executeRecovery(approve: Approve, onProgress: (p: TxProgress) => void) {
    return this.transact('executeRecovery', [], approve, onProgress);
  }

  startInheritance(approve: Approve, onProgress: (p: TxProgress) => void) {
    return this.transact('startInheritance', [], approve, onProgress);
  }

  claimInheritance(approve: Approve, onProgress: (p: TxProgress) => void) {
    return this.transact('claimInheritance', [], approve, onProgress);
  }

  /**
   * Sign with the device key (after the fingerprint) and report progress.
   * Resolves true when confirmed.
   */
  async transact(
    fn: string,
    args: unknown[],
    approve: Approve,
    onProgress: (p: TxProgress) => void
  ): Promise<boolean> {
    onProgress({ stage: 'approving' });
    try {
      const tx = await withDeviceKey(this.scope, approve, async (pk) => {
        const signer = new Wallet(pk, this.provider);
        return (this.contract.connect(signer) as Contract)[fn](...args);
      });
      onProgress({ stage: 'pending', hash: tx.hash, url: this.txUrl(tx.hash) });
      const rc = await tx.wait();
      const events = this.parseLogs(rc.logs);
      onProgress({ stage: 'confirmed', hash: tx.hash, block: rc.blockNumber, url: this.txUrl(tx.hash), events });
      events.forEach((ev) => this.emit(ev)); // announce now, not at the next poll
      return true;
    } catch (e) {
      onProgress({ stage: 'failed', ...this.explain(e) });
      return false;
    }
  }

  explain(e: unknown): { reason: FailReason; message: string } {
    if (e instanceof ApprovalRejected) return { reason: 'rejected', message: e.message };
    const err = e as { revert?: { name?: string }; data?: string; info?: { error?: { data?: string } };
                       code?: string; shortMessage?: string; message?: string };
    let name = err.revert?.name;
    if (!name) {
      try {
        name = this.contract.interface.parseError(err.data || err.info?.error?.data || '')?.name;
      } catch {
        /* not a contract error */
      }
    }
    if (name) return { reason: ERROR_CODES[name] ?? 'unknown', message: name };
    if (err.code === 'INSUFFICIENT_FUNDS') return { reason: 'no_gas', message: 'Not enough ETH for gas.' };
    if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT' || err.code === 'SERVER_ERROR') {
      return { reason: 'network', message: err.shortMessage || 'Network problem.' };
    }
    return { reason: 'unknown', message: err.shortMessage || err.message || String(e) };
  }

  parseLogs(logs: readonly Log[]): VaultEvent[] {
    const out: VaultEvent[] = [];
    for (const lg of logs) {
      if (lg.address.toLowerCase() !== this.deployment.address.toLowerCase()) continue;
      try {
        const ev = this.contract.interface.parseLog(lg);
        if (!ev) continue;
        const args: Record<string, unknown> = {};
        ev.fragment.inputs.forEach((inp, i) => (args[inp.name] = ev.args[i]));
        out.push({ name: ev.name, args, txHash: lg.transactionHash, block: lg.blockNumber, logIndex: lg.index });
      } catch {
        /* not ours */
      }
    }
    return out;
  }

  // ---- Live events ---------------------------------------------------------

  private listeners = new Set<(ev: VaultEvent) => void>();
  private seen = new Set<string>();
  private stopPolling: (() => void) | null = null;

  private emit(ev: VaultEvent) {
    const id = `${ev.txHash}:${ev.logIndex}`;
    if (this.seen.has(id)) return; // already announced (from the receipt or an earlier poll)
    this.seen.add(id);
    this.listeners.forEach((cb) => cb(ev));
  }

  /**
   * Call `cb` once for every new contract event: this phone's own transactions
   * (as soon as they confirm) and other people's (a guardian approving on their
   * own phone), each exactly once. Returns an unsubscribe function.
   */
  onEvent(cb: (ev: VaultEvent) => void): () => void {
    this.listeners.add(cb);
    if (!this.stopPolling) this.stopPolling = this.poll(this.local ? 1000 : 4000);
    return () => {
      this.listeners.delete(cb);
      if (this.listeners.size === 0 && this.stopPolling) {
        this.stopPolling();
        this.stopPolling = null;
      }
    };
  }

  private poll(intervalMs: number): () => void {
    let from: number | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      try {
        const head = await this.provider.getBlockNumber();
        if (from === null) from = head + 1; // only events from now on
        if (head >= from) {
          const logs = await this.provider.getLogs({ address: this.deployment.address, fromBlock: from, toBlock: head });
          this.parseLogs(logs).forEach((ev) => this.emit(ev));
          from = head + 1;
        }
      } catch {
        /* network hiccup: try again next tick */
      }
      if (!stopped) timer = setTimeout(tick, intervalMs);
    };
    timer = setTimeout(tick, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }
}
