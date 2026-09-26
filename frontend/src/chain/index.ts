/**
 * SayPay on-chain wallet: see frontend/src/chain/README.md for how to hook it into the screens.
 */
export { loadDeployment, isLocalChain, CHAIN_NETWORK } from './deployment';
export type { Deployment, DemoPerson } from './deployment';
export {
  deviceAddress,
  createDeviceKey,
  importDeviceKey,
  demoKeyFor,
  forgetDeviceKey,
  withDeviceKey,
  ApprovalRejected,
} from './deviceKey';
export type { DeviceRole } from './deviceKey';
export { SayPayVault } from './vault';
export type { VaultStatus, TxProgress, FailReason, VaultEvent } from './vault';
export { describeEvent, describeProgress } from './announce';
export type { Announcement, AnnounceContext } from './announce';
export { txSounds } from './sounds';
export { useSayPayVault } from './useVault';
export type { UseVaultOptions } from './useVault';
