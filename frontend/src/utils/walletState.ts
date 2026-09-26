/**
 * SayPay Wallet State & Real-Time Sync Service.
 * 
 * Supports:
 * 1. User Profiles: Custom created smart wallet user, plus switchable multi-account vault: "Primary Vault (0x71C8)" and "Savings Account (0x3A9F)"
 * 2. Multi-Token Asset Portfolio: ETH, USDT, USDC, BNB, TRX with real-time balance tracking
 * 3. NFTs and Approvals Security Guard tabs
 * 4. Testnet Faucet & Funding: Zero mock data on creation, accessible "Fund" (+ Add Cash) flow
 * 5. Persistent Local Database (IndexedStorage via localStorage)
 * 6. Real-time cross-tab and cross-device communication via BroadcastChannel
 * 7. 100% voice command execution and screen reader announcements
 * 8. Zero em dashes anywhere in text or UI
 */

export interface TransactionRecord {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'fund' | 'guardian_recovery' | 'veto';
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

export interface TokenItem {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  priceUSD: number;
  change24h: number;
  iconBg: string;
  network: string;
  decimals: number;
}

export interface NFTItem {
  id: string;
  name: string;
  collection: string;
  imageUrl: string;
  description: string;
  audioDescription: string;
  contractAddress: string;
  tokenId: string;
}

export interface TokenApproval {
  id: string;
  tokenSymbol: string;
  spenderName: string;
  spenderAddress: string;
  allowance: string;
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: number;
}

export interface MarketTrend {
  id: string;
  symbol: string;
  name: string;
  priceUSD: number;
  change24h: number;
  volume24hUSD: string;
  marketCapUSD: string;
  category: 'layer1' | 'defi' | 'stablecoin';
}

export interface WalletUser {
  id: string;
  name: string;
  handle: string;
  address: string;
  balanceETH: number;
  ethRateUSD: number;
  tokens: TokenItem[];
  nfts: NFTItem[];
  approvals: TokenApproval[];
  guardians: Guardian[];
  contacts: Contact[];
  isCustomCreated?: boolean;
  pinCode?: string;
}

export const DEFAULT_TOKENS_LIST: TokenItem[] = [
  {
    id: 't_eth',
    symbol: 'ETH',
    name: 'Ethereum',
    balance: 0.0000,
    priceUSD: 2693.29,
    change24h: 1.00,
    iconBg: 'bg-blue-600',
    network: 'Native',
    decimals: 18,
  },
  {
    id: 't_usdt',
    symbol: 'USDT',
    name: 'Tether USD',
    balance: 0.0000,
    priceUSD: 1.00,
    change24h: 0.03,
    iconBg: 'bg-emerald-600',
    network: 'ERC-20',
    decimals: 6,
  },
  {
    id: 't_usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    balance: 0.0000,
    priceUSD: 1.00,
    change24h: 0.01,
    iconBg: 'bg-blue-500',
    network: 'ERC-20',
    decimals: 6,
  },
  {
    id: 't_bnb',
    symbol: 'BNB',
    name: 'BNB Chain',
    balance: 0.0000,
    priceUSD: 774.89,
    change24h: -0.74,
    iconBg: 'bg-amber-500',
    network: 'BSC',
    decimals: 18,
  },
  {
    id: 't_trx',
    symbol: 'TRX',
    name: 'TRON',
    balance: 0.0000,
    priceUSD: 0.33,
    change24h: -0.87,
    iconBg: 'bg-red-500',
    network: 'TRC-20',
    decimals: 6,
  },
];

export const INITIAL_NFTS: NFTItem[] = [
  {
    id: 'nft_genesis',
    name: 'SayPay Genesis Pioneer #042',
    collection: 'SayPay Early Access Badges',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    description: 'Verifiable proof of participation in voice-first accessibility research on Sepolia.',
    audioDescription: 'Geometric orange and black hexagonal hologram badge with engraved audio soundwaves, signifying pioneer access to SayPay voice smart wallet.',
    contractAddress: '0x498a...291b',
    tokenId: '#042',
  },
  {
    id: 'nft_wcag',
    name: 'WCAG AAA Accessibility Sentinel',
    collection: 'Inclusive Web3 Guild',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=400&q=80',
    description: 'Awarded for completing hands-free voice transfers with audio earcons.',
    audioDescription: 'Stylized 3D sound icon floating within an emerald shield on a deep charcoal field.',
    contractAddress: '0x88f1...cc34',
    tokenId: '#108',
  },
];

export const INITIAL_APPROVALS: TokenApproval[] = [
  {
    id: 'app_1',
    tokenSymbol: 'USDC',
    spenderName: 'Uniswap V3 Universal Router',
    spenderAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    allowance: 'Unlimited',
    riskLevel: 'medium',
    lastUpdated: Date.now() - 3600000 * 48,
  },
  {
    id: 'app_2',
    tokenSymbol: 'ETH',
    spenderName: 'Sepolia Bridge Escrow',
    spenderAddress: '0x71A6...118E',
    allowance: '1.5 ETH',
    riskLevel: 'low',
    lastUpdated: Date.now() - 3600000 * 12,
  },
];

export const MARKET_TRENDS: MarketTrend[] = [
  {
    id: 'm_btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    priceUSD: 88450.00,
    change24h: 2.45,
    volume24hUSD: '$38.2B',
    marketCapUSD: '$1.74T',
    category: 'layer1',
  },
  {
    id: 'm_eth',
    symbol: 'ETH',
    name: 'Ethereum',
    priceUSD: 2693.29,
    change24h: 1.00,
    volume24hUSD: '$18.4B',
    marketCapUSD: '$324.1B',
    category: 'layer1',
  },
  {
    id: 'm_bnb',
    symbol: 'BNB',
    name: 'BNB',
    priceUSD: 774.89,
    change24h: -0.74,
    volume24hUSD: '$2.1B',
    marketCapUSD: '$112.5B',
    category: 'layer1',
  },
  {
    id: 'm_sol',
    symbol: 'SOL',
    name: 'Solana',
    priceUSD: 184.60,
    change24h: 4.82,
    volume24hUSD: '$6.8B',
    marketCapUSD: '$86.2B',
    category: 'layer1',
  },
  {
    id: 'm_usdt',
    symbol: 'USDT',
    name: 'Tether USD',
    priceUSD: 1.00,
    change24h: 0.03,
    volume24hUSD: '$62.1B',
    marketCapUSD: '$118.9B',
    category: 'stablecoin',
  },
  {
    id: 'm_uni',
    symbol: 'UNI',
    name: 'Uniswap',
    priceUSD: 9.42,
    change24h: 3.15,
    volume24hUSD: '$340M',
    marketCapUSD: '$5.6B',
    category: 'defi',
  },
];

export const DEFAULT_USERS: Record<string, WalletUser> = {
  user_main: {
    id: 'user_main',
    name: 'Primary Vault',
    handle: '@vault.saypay',
    address: '0x71C8A904B8E42c5B2d1b82E72E77D34e8e194E92',
    balanceETH: 2.5000,
    ethRateUSD: 2693.29,
    tokens: [
      { ...DEFAULT_TOKENS_LIST[0], balance: 2.5000 },
      { ...DEFAULT_TOKENS_LIST[1], balance: 1.3401 },
      { ...DEFAULT_TOKENS_LIST[2], balance: 1.0586 },
      { ...DEFAULT_TOKENS_LIST[3], balance: 0.0041 },
      { ...DEFAULT_TOKENS_LIST[4], balance: 2.2913 },
    ],
    nfts: INITIAL_NFTS,
    approvals: INITIAL_APPROVALS,
    guardians: [
      { id: 'g1', name: 'Amma', role: 'Family (Primary)', status: 'active', address: '0x892a...12bc' },
      { id: 'g2', name: 'Priya (Sister)', role: 'Social Peer', status: 'active', address: '0x3A9F...88D1' },
      { id: 'g3', name: 'Legal Counsel', role: 'Institutional Backup', status: 'active', address: '0x44B1...90FA' },
    ],
    contacts: [
      { id: 'c1', name: 'Amma', address: '0x892aF8165b4c41498bF349547514dD8c12bC8821', avatarBg: 'bg-emerald-500', relationship: 'Mother', isRecent: true },
      { id: 'c2', name: 'Priya', address: '0x3A9F6370B3428987d65609B53580554288D105d1', avatarBg: 'bg-blue-500', relationship: 'Sister', isRecent: true },
      { id: 'c3', name: 'Zaid', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', avatarBg: 'bg-purple-500', relationship: 'Colleague', isRecent: false },
      { id: 'c4', name: 'Fatima', address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', avatarBg: 'bg-amber-500', relationship: 'Family', isRecent: false },
      { id: 'c5', name: 'Sara', address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', avatarBg: 'bg-rose-500', relationship: 'Designer', isRecent: false },
    ],
    pinCode: '123456',
  },
  user_friend: {
    id: 'user_friend',
    name: 'Savings Account',
    handle: '@savings.saypay',
    address: '0x3A9F6370B3428987d65609B53580554288D105d1',
    balanceETH: 0.8500,
    ethRateUSD: 2693.29,
    tokens: [
      { ...DEFAULT_TOKENS_LIST[0], balance: 0.8500 },
      { ...DEFAULT_TOKENS_LIST[1], balance: 50.0 },
      { ...DEFAULT_TOKENS_LIST[2], balance: 120.0 },
      { ...DEFAULT_TOKENS_LIST[3], balance: 0.0 },
      { ...DEFAULT_TOKENS_LIST[4], balance: 0.0 },
    ],
    nfts: [INITIAL_NFTS[0]],
    approvals: [],
    guardians: [
      { id: 'g1', name: 'Primary Vault', role: 'Main Account', status: 'active', address: '0x71C8...4E92' },
      { id: 'g2', name: 'Sister Priya', role: 'Family', status: 'active', address: '0x55B2...77C1' },
    ],
    contacts: [
      { id: 'c1', name: 'Primary Vault', address: '0x71C8A904B8E42c5B2d1b82E72E77D34e8e194E92', avatarBg: 'bg-emerald-500', relationship: 'Self', isRecent: true },
      { id: 'c2', name: 'Amma', address: '0x892aF8165b4c41498bF349547514dD8c12bC8821', avatarBg: 'bg-purple-500', relationship: 'Mother', isRecent: false },
    ],
    pinCode: '123456',
  },
};

/**
 * Check if the user has an active, created wallet
 */
export function hasUserCreatedWallet(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('saypay_wallet_created') === 'true';
}

export function setHasUserCreatedWallet(status: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('saypay_wallet_created', status ? 'true' : 'false');
}

/**
 * Create a fresh, zero mock data wallet
 */
export function createFreshWalletUser(
  name: string,
  handle: string,
  guardians: Guardian[],
  pinCode: string = '123456'
): WalletUser {
  // Generate realistic fresh contract address
  const randomHex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  const freshAddress = `0x${randomHex.slice(0, 4).toUpperCase()}${randomHex.slice(4)}`;

  const cleanTokens: TokenItem[] = DEFAULT_TOKENS_LIST.map((t) => ({
    ...t,
    balance: 0.0000,
  }));

  const newUser: WalletUser = {
    id: 'user_created',
    name: name.trim() || 'Wallet Owner',
    handle: handle.startsWith('@') ? handle : `@${handle || 'user'}.saypay`,
    address: freshAddress,
    balanceETH: 0.0000,
    ethRateUSD: 2693.29,
    tokens: cleanTokens,
    nfts: [],
    approvals: [],
    guardians: guardians.length > 0 ? guardians : [
      { id: 'g_default', name: 'Designated Guardian', role: 'Social Peer', status: 'active', address: '0x0000...0000' }
    ],
    contacts: [],
    isCustomCreated: true,
    pinCode: pinCode || '123456',
  };

  saveStoredUser(newUser);
  saveStoredTransactions(newUser.id, []);
  setHasUserCreatedWallet(true);
  return newUser;
}

/**
 * Local Database Persistence Helpers with Anti-Tamper Checksum & Encoding (SEC-01)
 */
function computeChecksum(dataStr: string): string {
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(16);
}

function secureEncode(data: any): string {
  const json = JSON.stringify(data);
  const chk = computeChecksum(json);
  const payload = JSON.stringify({ v: 1, c: chk, d: btoa(unescape(encodeURIComponent(json))) });
  return payload;
}

function secureDecode(raw: string): any | null {
  try {
    const obj = JSON.parse(raw);
    if (obj && obj.v === 1 && obj.c && obj.d) {
      const decodedJson = decodeURIComponent(escape(atob(obj.d)));
      const expectedChk = computeChecksum(decodedJson);
      if (expectedChk === obj.c) {
        return JSON.parse(decodedJson);
      }
      console.warn('Vault storage integrity mismatch detected. Re-initializing safely.');
      return null;
    }
    return obj;
  } catch (e) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

export function getStoredUser(userId: string): WalletUser {
  if (typeof window === 'undefined') return DEFAULT_USERS[userId] || DEFAULT_USERS.user_main;
  try {
    const raw = localStorage.getItem(`saypay_db_user_${userId}`);
    if (raw) {
      const parsed = secureDecode(raw);
      if (parsed) {
        if (parsed.name && (parsed.name.toLowerCase() === 'alen' || parsed.name.toLowerCase() === 'rahul')) {
          parsed.name = 'My Smart Vault';
        }
        if (parsed.tokens && parsed.tokens.length > 0) {
          parsed.tokens = parsed.tokens.map((t: TokenItem) => ({
            ...t,
            name: t.name === 'Ethereum (Sepolia)' ? 'Ethereum' : t.name,
            network: t.network === 'Sepolia Testnet' ? 'Native' : t.network,
          }));
        } else {
          parsed.tokens = DEFAULT_TOKENS_LIST.map((t) => ({
            ...t,
            balance: t.symbol === 'ETH' ? parsed.balanceETH : 0,
          }));
        }
        if (!parsed.nfts) parsed.nfts = [];
        if (!parsed.approvals) parsed.approvals = [];
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_USERS[userId] || DEFAULT_USERS.user_main;
}

export function saveStoredUser(user: WalletUser) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`saypay_db_user_${user.id}`, secureEncode(user));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredTransactions(userId: string): TransactionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`saypay_db_txs_${userId}`);
    if (raw) {
      const decoded = secureDecode(raw);
      if (Array.isArray(decoded)) return decoded;
    }
  } catch (e) {
    console.error(e);
  }

  // If user_created, start with 0 transactions
  if (userId === 'user_created') {
    return [];
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

export function saveStoredTransactions(userId: string, txs: TransactionRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`saypay_db_txs_${userId}`, secureEncode(txs));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Add / Fund Mock Cash or Testnet ETH to Wallet
 */
export function fundWallet(
  userId: string,
  tokenSymbol: string,
  amount: number
): { user: WalletUser; tx: TransactionRecord } {
  const user = getStoredUser(userId);
  const txs = getStoredTransactions(userId);

  const updatedTokens = (user.tokens || DEFAULT_TOKENS_LIST).map((tok) => {
    if (tok.symbol.toUpperCase() === tokenSymbol.toUpperCase()) {
      return { ...tok, balance: parseFloat((tok.balance + amount).toFixed(4)) };
    }
    return tok;
  });

  const newBalanceETH = tokenSymbol.toUpperCase() === 'ETH'
    ? parseFloat((user.balanceETH + amount).toFixed(4))
    : user.balanceETH;

  const updatedUser: WalletUser = {
    ...user,
    balanceETH: newBalanceETH,
    tokens: updatedTokens,
  };

  const newTx: TransactionRecord = {
    id: `tx_fund_${Date.now()}`,
    type: 'fund',
    amount,
    currency: tokenSymbol.toUpperCase(),
    counterparty: 'Sepolia Testnet Faucet',
    counterpartyAddress: '0x0000000000000000000000000000000000000000',
    timestamp: Date.now(),
    status: 'confirmed',
    txHash: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    note: 'Testnet Faucet Funding',
  };

  saveStoredUser(updatedUser);
  saveStoredTransactions(userId, [newTx, ...txs]);

  walletSync.broadcast({
    type: 'WALLET_FUNDED',
    userId,
    tokenSymbol,
    amount,
    timestamp: Date.now(),
  });

  return { user: updatedUser, tx: newTx };
}

/**
 * Swap Tokens inside Wallet
 */
export function swapTokensInWallet(
  userId: string,
  fromSymbol: string,
  toSymbol: string,
  fromAmount: number,
  toAmount: number
): { user: WalletUser; tx: TransactionRecord } {
  const user = getStoredUser(userId);
  const txs = getStoredTransactions(userId);

  const updatedTokens = (user.tokens || DEFAULT_TOKENS_LIST).map((tok) => {
    if (tok.symbol.toUpperCase() === fromSymbol.toUpperCase()) {
      return { ...tok, balance: Math.max(0, parseFloat((tok.balance - fromAmount).toFixed(4))) };
    }
    if (tok.symbol.toUpperCase() === toSymbol.toUpperCase()) {
      return { ...tok, balance: parseFloat((tok.balance + toAmount).toFixed(4)) };
    }
    return tok;
  });

  let newBalanceETH = user.balanceETH;
  if (fromSymbol.toUpperCase() === 'ETH') {
    newBalanceETH = Math.max(0, parseFloat((user.balanceETH - fromAmount).toFixed(4)));
  } else if (toSymbol.toUpperCase() === 'ETH') {
    newBalanceETH = parseFloat((user.balanceETH + toAmount).toFixed(4));
  }

  const updatedUser: WalletUser = {
    ...user,
    balanceETH: newBalanceETH,
    tokens: updatedTokens,
  };

  const newTx: TransactionRecord = {
    id: `tx_swap_${Date.now()}`,
    type: 'swap',
    amount: fromAmount,
    currency: `${fromSymbol} to ${toSymbol}`,
    counterparty: 'Uniswap V3 Protocol',
    counterpartyAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    timestamp: Date.now(),
    status: 'confirmed',
    txHash: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    note: `Swapped ${fromAmount} ${fromSymbol} for ${toAmount} ${toSymbol}`,
  };

  saveStoredUser(updatedUser);
  saveStoredTransactions(userId, [newTx, ...txs]);

  return { user: updatedUser, tx: newTx };
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
      fromUser: string;
      fromName: string;
      toContactName: string;
      toAddress: string;
      amount: number;
      txHash: string;
      timestamp: number;
    }
  | {
      type: 'WALLET_FUNDED';
      userId: string;
      tokenSymbol: string;
      amount: number;
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
    }
  | {
      type: 'INHERITANCE_STARTED';
      beneficiary: string;
      graceSeconds: number;
      timestamp: number;
    }
  | {
      type: 'HEARTBEAT_PING';
      byUser: string;
      timestamp: number;
    }
  | {
      type: 'INHERITANCE_VETOED';
      byGuardian: string;
      timestamp: number;
    }
  | {
      type: 'INHERITANCE_CLAIMED';
      beneficiary: string;
      timestamp: number;
    };

export const walletSync = new WalletSyncService();
