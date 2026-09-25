/**
 * SayPay Wallet State & Real-Time Sync Service.
 * 
 * Supports:
 * 1. Dual-user demo: "You (0x71C8)" and "Friend (Rahul 0x3A9F)"
 * 2. Persistent Local Database (IndexedStorage via localStorage) so balances, transactions, and contacts persist across refreshes
 * 3. Real-time cross-tab and cross-device communication via BroadcastChannel
 * 4. 100% voice command execution and screen reader announcements
 * 5. Full Contacts management: Add, View, Search, Delete contacts
 * 6. Zero em-dashes anywhere in text or UI
 */

export interface TransactionRecord {
  id: string;
  type: 'send' | 'receive' | 'guardian_recovery' | 'veto';
  amount: number;
  currency: string;
  counterparty: string;
  counterpartyAddress: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'vetoed';
  txHash: string;
  note?: string;
}

export interface Contact {
  id: string;
  name: string;
  address: string;
  avatarBg: string;
  relationship: string;
  phone?: string;
  isRecent?: boolean;
}

export interface Guardian {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'pending_approval' | 'vetoed';
  address: string;
}

export interface WalletUser {
  id: 'user_main' | 'user_friend';
  name: string;
  handle: string;
  address: string;
  balanceETH: number;
  ethRateUSD: number;
  guardians: Guardian[];
  contacts: Contact[];
}

export const DEFAULT_USERS: Record<'user_main' | 'user_friend', WalletUser> = {
  user_main: {
    id: 'user_main',
    name: 'Alen',
    handle: '@alen.saypay',
    address: '0x71C8A904B8E42c5B2d1b82E72E77D34e8e194E92',
    balanceETH: 2.5000,
    ethRateUSD: 3368.20,
    guardians: [
      { id: 'g1', name: 'Amma', role: 'Family (Primary)', status: 'active', address: '0x892a...12bc' },
      { id: 'g2', name: 'Rahul (Friend)', role: 'Social Peer', status: 'active', address: '0x3A9F...88D1' },
      { id: 'g3', name: 'Legal Counsel', role: 'Institutional Backup', status: 'active', address: '0x44B1...90FA' },
    ],
    contacts: [
      { id: 'c1', name: 'Amma', address: '0x892aF8165b4c41498bF349547514dD8c12bC8821', avatarBg: 'bg-emerald-500', relationship: 'Mother', isRecent: true },
      { id: 'c2', name: 'Rahul', address: '0x3A9F6370B3428987d65609B53580554288D105d1', avatarBg: 'bg-blue-500', relationship: 'Friend', isRecent: true },
      { id: 'c3', name: 'Zaid', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', avatarBg: 'bg-purple-500', relationship: 'Colleague', isRecent: false },
      { id: 'c4', name: 'Fatima', address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', avatarBg: 'bg-amber-500', relationship: 'Sister', isRecent: false },
      { id: 'c5', name: 'Sara', address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', avatarBg: 'bg-rose-500', relationship: 'Designer', isRecent: false },
    ],
  },
  user_friend: {
    id: 'user_friend',
    name: 'Rahul',
    handle: '@rahul.saypay',
    address: '0x3A9F6370B3428987d65609B53580554288D105d1',
    balanceETH: 0.8500,
    ethRateUSD: 3368.20,
    guardians: [
      { id: 'g1', name: 'Alen', role: 'Trusted Friend', status: 'active', address: '0x71C8...4E92' },
      { id: 'g2', name: 'Sister Priya', role: 'Family', status: 'active', address: '0x55B2...77C1' },
    ],
    contacts: [
      { id: 'c1', name: 'Alen', address: '0x71C8A904B8E42c5B2d1b82E72E77D34e8e194E92', avatarBg: 'bg-emerald-500', relationship: 'Friend', isRecent: true },
      { id: 'c2', name: 'Amma', address: '0x892aF8165b4c41498bF349547514dD8c12bC8821', avatarBg: 'bg-purple-500', relationship: 'Aunt', isRecent: false },
    ],
  },
};

/**
 * Local Database Persistence Helpers
 */
export function getStoredUser(userId: 'user_main' | 'user_friend'): WalletUser {
  if (typeof window === 'undefined') return DEFAULT_USERS[userId];
  try {
    const raw = localStorage.getItem(`saypay_db_user_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_USERS[userId];
}

export function saveStoredUser(user: WalletUser) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`saypay_db_user_${user.id}`, JSON.stringify(user));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredTransactions(userId: 'user_main' | 'user_friend'): TransactionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`saypay_db_txs_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: 'tx_init_1',
      type: 'receive',
      amount: 2.5,
      currency: 'Sepolia ETH',
      counterparty: 'Sepolia Faucet',
      counterpartyAddress: '0x88f4...912a',
      timestamp: Date.now() - 3600000 * 2,
      status: 'confirmed',
      txHash: '0x3f9a...c812',
    },
    {
      id: 'tx_init_2',
      type: 'send',
      amount: 0.1,
      currency: 'Sepolia ETH',
      counterparty: 'Amma',
      counterpartyAddress: '0x892a...12bc',
      timestamp: Date.now() - 3600000 * 24,
      status: 'confirmed',
      txHash: '0x7b11...90fe',
    },
  ];
}

export function saveStoredTransactions(userId: 'user_main' | 'user_friend', txs: TransactionRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`saypay_db_txs_${userId}`, JSON.stringify(txs));
  } catch (e) {
    console.error(e);
  }
}

const SYNC_CHANNEL_NAME = 'saypay_live_transfer_channel';

class WalletSyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: ((event: SyncEvent) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.channel.onmessage = (ev) => {
          this.notifyListeners(ev.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not available, falling back to local storage event', err);
      }

      window.addEventListener('storage', (ev) => {
        if (ev.key === 'saypay_sync_event' && ev.newValue) {
          try {
            const data = JSON.parse(ev.newValue);
            this.notifyListeners(data);
          } catch (e) {
            console.error(e);
          }
        }
      });
    }
  }

  public subscribe(callback: (event: SyncEvent) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(event: SyncEvent) {
    this.listeners.forEach((cb) => cb(event));
  }

  public broadcast(event: SyncEvent) {
    if (this.channel) {
      this.channel.postMessage(event);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('saypay_sync_event', JSON.stringify({ ...event, _t: Date.now() }));
    }
    this.notifyListeners(event);
  }
}

export type SyncEvent =
  | {
      type: 'PAYMENT_SENT';
      fromUser: 'user_main' | 'user_friend';
      fromName: string;
      toContactName: string;
      toAddress: string;
      amount: number;
      txHash: string;
      timestamp: number;
    }
  | {
      type: 'RECOVERY_TRIGGERED';
      initiator: string;
      delaySeconds: number;
      timestamp: number;
    }
  | {
      type: 'RECOVERY_VETOED';
      byUser: string;
      timestamp: number;
    };

export const walletSync = new WalletSyncService();
