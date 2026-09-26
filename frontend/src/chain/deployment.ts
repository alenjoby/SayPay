/**
 * Where the SayPayVault lives. `npm run deploy:local` / `deploy:sepolia` in contracts/
 * writes public/chain/<network>.json (address, ABI, people; never keys) and
 * .env.development.local (VITE_CHAIN_NETWORK + the demo device keys).
 */
import type { InterfaceAbi } from 'ethers';

export interface DemoPerson {
  name: string;
  role: 'owner' | 'guardian' | 'beneficiary' | '';
  address: string;
}

export interface Deployment {
  network: string;
  chainId: number;
  rpcUrl: string;
  explorer: string | null;
  address: string;
  deployBlock: number;
  owner: string;
  guardians: string[];
  threshold: number;
  beneficiary: string;
  timers: { inactivityPeriod: number; recoveryDelay: number; gracePeriod: number };
  people?: DemoPerson[];
  abi: InterfaceAbi;
}

export const CHAIN_NETWORK: string =
  (import.meta.env.VITE_CHAIN_NETWORK as string | undefined) || 'localhost';

export async function loadDeployment(network: string = CHAIN_NETWORK): Promise<Deployment> {
  const res = await fetch(`/chain/${network}.json`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(
      `No contract deployment for "${network}". In contracts/, run ` +
        (network === 'localhost' ? '`npx hardhat node` and `npm run deploy:local`.' : '`npm run deploy:sepolia`.')
    );
  }
  return (await res.json()) as Deployment;
}

export const isLocalChain = (d: Deployment) => d.chainId === 31337;
