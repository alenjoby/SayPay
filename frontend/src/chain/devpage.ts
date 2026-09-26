/** Script for chain-test.html (dev only): exercises src/chain/ against the real contract. */
import {
  loadDeployment, SayPayVault, deviceAddress, importDeviceKey, demoKeyFor, describeEvent,
  describeProgress, txSounds,
} from './index';
import type { Announcement, DeviceRole, TxProgress, VaultStatus } from './index';
import type { SupportedLanguage } from '../utils/i18n';
import { signTransactionWithPasskey } from '../utils/passkeyAuth';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let vault: SayPayVault;
let status: VaultStatus | null = null;
let names = new Map<string, string>();
let busy = false;

const lang = () => $<HTMLSelectElement>('lang').value as SupportedLanguage;
const me = () => deviceAddress(vault.scope);
const THIS_PHONE = { en: 'this phone', ar: 'هذا الجوال', hi: 'यह फ़ोन' };
const nameOf = (a: string) =>
  me() && a.toLowerCase() === me()!.toLowerCase() ? THIS_PHONE[lang()] : names.get(a.toLowerCase()) ?? null;

function say(a: Announcement, kind: string, cls = '') {
  const li = document.createElement('li');
  li.innerHTML = `<span class="t"></span><span class="k"></span><span class="m"></span>`;
  (li.querySelector('.t') as HTMLElement).textContent = new Date().toLocaleTimeString();
  const k = li.querySelector('.k') as HTMLElement;
  k.textContent = kind;
  if (cls) k.className = `k ${cls}`;
  (li.querySelector('.m') as HTMLElement).textContent = a.text;
  $('log').prepend(li);
  // Clear, then set after a tick, so screen readers announce repeats too.
  const region = $(a.urgent ? 'live-urgent' : 'live-polite');
  region.textContent = '';
  setTimeout(() => { region.textContent = a.text; }, 100);
  if ($<HTMLInputElement>('speak').checked && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(a.text);
    u.lang = { en: 'en-US', ar: 'ar-SA', hi: 'hi-IN' }[lang()];
    speechSynthesis.speak(u);
  }
}

async function refresh() {
  status = await vault.status();
  const now = await vault.chainTime();
  const inMin = (ts: number) => `${Math.max(0, Math.round((ts - now) / 60))} min`;
  const mine = me();
  $('s-me').textContent = mine ? `${names.get(mine.toLowerCase()) ?? 'set up'} (${mine.slice(0, 10)}…)` : 'not set up';
  $('s-owner').textContent = names.get(status.owner.toLowerCase()) ?? status.owner;
  $('s-bal').textContent = `${status.balanceEth} test ETH${status.closed ? ' (closed)' : ''}`;
  $('s-rec').textContent = status.pendingOwner
    ? `to ${names.get(status.pendingOwner.toLowerCase()) ?? 'unknown'}: ${status.approvals} of ${vault.deployment.threshold}` +
      (status.recoveryReadyAt ? (status.recoveryReadyAt <= now ? ', ready' : `, ready in ${inMin(status.recoveryReadyAt)}`) : '')
    : 'none';
  $('s-inh').textContent = status.closed ? 'claimed'
    : status.inheritanceClaimableAt ? `grace period, claimable in ${inMin(status.inheritanceClaimableAt)}`
    : status.inactiveAt <= now ? 'owner inactive: can start' : `owner active (inactive in ${inMin(status.inactiveAt)})`;
}

const approve = (label: string) => async () => {
  const r = await signTransactionWithPasskey(`saypay:${label}:${Date.now()}`, label, Number($<HTMLInputElement>('amt').value) || 0);
  return r.success;
};

function onProgress(p: TxProgress) {
  const a = describeProgress(p, lang());
  if (p.stage === 'pending') txSounds.pending();
  if (p.stage === 'confirmed') txSounds.confirmed();
  if (p.stage === 'failed') txSounds.failed();
  if (a) say(a, p.stage === 'failed' ? `Failed (${p.reason})` : p.stage[0].toUpperCase() + p.stage.slice(1),
             p.stage === 'failed' ? 'bad' : p.stage === 'confirmed' ? 'ok' : '');
}

async function act(name: string) {
  if (busy) return;
  if (!me()) { say({ text: 'Set up this phone first.', urgent: true }, 'Setup', 'bad'); return; }
  busy = true;
  document.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
  try {
    if (name === 'send') {
      await vault.send($<HTMLSelectElement>('to').value, $<HTMLInputElement>('amt').value || '0', approve('send'), onProgress);
    } else {
      await vault.transact(name, [], approve(name), onProgress);
    }
  } finally {
    await refresh().catch(() => {});
    busy = false;
    document.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = false));
  }
}

async function init() {
  try {
    const dep = await loadDeployment();
    vault = new SayPayVault(dep);
    names = new Map((dep.people ?? []).map((p) => [p.address.toLowerCase(), p.name]));
    $('s-net').textContent = `${dep.network} (chain ${dep.chainId})`;
    $('to').innerHTML = (dep.people ?? [])
      .filter((p) => !/phone/i.test(p.name))
      .map((p) => `<option value="${p.address}">${p.name}</option>`).join('');
    if (vault.local) $('skip').hidden = false;
    await refresh();
  } catch (e) {
    $('banner').style.display = 'block';
    $('banner').textContent = String((e as Error).message || e);
    return;
  }
  // Every contract event, from this phone or anyone else, is announced once.
  vault.onEvent(async (ev) => {
    const now = await vault.chainTime();
    const a = describeEvent(ev, { lang: lang(), nameOf, me: me(), threshold: vault.deployment.threshold, now });
    say(a, ev.name, a.urgent ? 'warn' : 'ok');
    refresh().catch(() => {});
  });
  $('pair').addEventListener('click', async () => {
    const role = $<HTMLSelectElement>('role').value as DeviceRole;
    const key = demoKeyFor(role);
    if (!key) { say({ text: `No demo key for ${role}: deploy again from contracts/.`, urgent: true }, 'Setup', 'bad'); return; }
    await importDeviceKey(vault.scope, key);
    say({ text: `This phone is set up as ${names.get(me()!.toLowerCase()) ?? role}.`, urgent: false }, 'Setup', 'ok');
    await refresh();
  });
  $('skip').addEventListener('click', async () => {
    await vault.provider.send('evm_increaseTime', [120]);
    await vault.provider.send('evm_mine', []);
    say({ text: 'Skipped 2 minutes.', urgent: false }, 'Time');
    await refresh();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) =>
    b.addEventListener('click', () => act(b.dataset.act!)));
  setInterval(() => refresh().catch(() => {}), vault.local ? 2000 : 8000);
}

init();
