const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const TWO_MIN = 120; // demo timers
const ONE_ETH = ethers.parseEther("1");

async function deployVault() {
  const [owner, g1, g2, g3, heir, newDevice, amma, stranger] = await ethers.getSigners();
  const Vault = await ethers.getContractFactory("SayPayVault");
  const vault = await Vault.deploy(
    owner.address,
    [g1.address, g2.address, g3.address],
    2, // 2 of 3
    heir.address,
    TWO_MIN,
    TWO_MIN,
    TWO_MIN,
    { value: ethers.parseEther("2.5") },
  );
  return { vault, owner, g1, g2, g3, heir, newDevice, amma, stranger };
}

describe("SayPayVault", function () {
  // ---- The five tests the spec asks for --------------------------------

  it("recovers to a new device once the guardian threshold and delay pass", async function () {
    const { vault, owner, g1, g2, newDevice } = await loadFixture(deployVault);

    await expect(vault.connect(g1).proposeRecovery(newDevice.address))
      .to.emit(vault, "RecoveryProposed").withArgs(g1.address, newDevice.address);
    // One approval (the proposer's) is below the threshold: no delay yet.
    expect(await vault.recoveryReadyAt()).to.equal(0);
    await expect(vault.executeRecovery()).to.be.revertedWithCustomError(vault, "RecoveryNotReady");

    await expect(vault.connect(g2).approveRecovery(newDevice.address))
      .to.emit(vault, "RecoveryApproved");
    expect(await vault.approvals()).to.equal(2);

    // Threshold reached, but the delay has not passed.
    await expect(vault.executeRecovery()).to.be.revertedWithCustomError(vault, "RecoveryNotReady");
    await time.increase(TWO_MIN);

    await expect(vault.executeRecovery())
      .to.emit(vault, "RecoveryExecuted").withArgs(owner.address, newDevice.address);
    expect(await vault.owner()).to.equal(newDevice.address);

    // The new device can send; the old key can't.
    await expect(vault.connect(newDevice).send(g1.address, 1n)).to.emit(vault, "Sent");
    await expect(vault.connect(owner).send(g1.address, 1n))
      .to.be.revertedWithCustomError(vault, "NotOwner");
  });

  it("lets the real owner cancel a recovery during the delay", async function () {
    const { vault, owner, g1, g2, newDevice } = await loadFixture(deployVault);
    await vault.connect(g1).proposeRecovery(newDevice.address);
    await vault.connect(g2).approveRecovery(newDevice.address);

    await time.increase(TWO_MIN / 2);
    await expect(vault.connect(owner).cancelRecovery())
      .to.emit(vault, "RecoveryCancelled").withArgs(owner.address, newDevice.address);

    await time.increase(TWO_MIN);
    await expect(vault.executeRecovery()).to.be.revertedWithCustomError(vault, "NoRecovery");
    expect(await vault.owner()).to.equal(owner.address);
  });

  it("stops the inheritance when a guardian vetoes it", async function () {
    const { vault, g3, heir } = await loadFixture(deployVault);
    await time.increase(TWO_MIN);
    await expect(vault.startInheritance()).to.emit(vault, "InheritanceStarted");

    await expect(vault.connect(g3).vetoInheritance())
      .to.emit(vault, "InheritanceVetoed").withArgs(g3.address);
    // The veto also reset the inactivity timer: it can't simply be restarted.
    await expect(vault.startInheritance()).to.be.revertedWithCustomError(vault, "OwnerStillActive");

    await time.increase(TWO_MIN);
    await expect(vault.connect(heir).claimInheritance())
      .to.be.revertedWithCustomError(vault, "NoInheritance");
  });

  it("pays everything to the beneficiary after inactivity and the grace period", async function () {
    const { vault, owner, heir } = await loadFixture(deployVault);

    await expect(vault.startInheritance()).to.be.revertedWithCustomError(vault, "OwnerStillActive");
    await time.increase(TWO_MIN);
    await vault.startInheritance();
    await expect(vault.connect(heir).claimInheritance())
      .to.be.revertedWithCustomError(vault, "GraceNotOver");

    await time.increase(TWO_MIN);
    const amount = ethers.parseEther("2.5");
    const tx = vault.connect(heir).claimInheritance();
    await expect(tx).to.emit(vault, "InheritanceClaimed").withArgs(heir.address, amount);
    await expect(tx).to.changeEtherBalances([vault, heir], [-amount, amount]);

    expect(await vault.closed()).to.equal(true);
    await expect(vault.connect(owner).send(heir.address, 1n))
      .to.be.revertedWithCustomError(vault, "VaultClosed");
  });

  it("never lets guardians move funds", async function () {
    const { vault, g1, g2, g3, amma } = await loadFixture(deployVault);
    for (const g of [g1, g2, g3]) {
      await expect(vault.connect(g).send(g.address, ONE_ETH))
        .to.be.revertedWithCustomError(vault, "NotOwner");
      await expect(vault.connect(g).send(amma.address, ONE_ETH))
        .to.be.revertedWithCustomError(vault, "NotOwner");
      await expect(vault.connect(g).claimInheritance())
        .to.be.revertedWithCustomError(vault, "NotBeneficiary");
    }
    // Guardians can't make themselves owner either.
    await expect(vault.connect(g1).proposeRecovery(g2.address))
      .to.be.revertedWithCustomError(vault, "BadAddress");
    expect(await ethers.provider.getBalance(vault)).to.equal(ethers.parseEther("2.5"));
  });

  // ---- Everyday use and edge cases -------------------------------------------

  it("sends money and announces it", async function () {
    const { vault, owner, amma } = await loadFixture(deployVault);
    const amount = ethers.parseEther("0.1");
    const tx = vault.connect(owner).send(amma.address, amount);
    await expect(tx).to.emit(vault, "Sent").withArgs(amma.address, amount);
    await expect(tx).to.changeEtherBalances([vault, amma], [-amount, amount]);
    await expect(vault.connect(owner).send(amma.address, ethers.parseEther("100")))
      .to.be.revertedWithCustomError(vault, "InsufficientBalance");
  });

  it("emits Deposited when money arrives", async function () {
    const { vault, amma } = await loadFixture(deployVault);
    await expect(amma.sendTransaction({ to: await vault.getAddress(), value: ONE_ETH }))
      .to.emit(vault, "Deposited").withArgs(amma.address, ONE_ETH);
  });

  it("owner activity (send or ping) ends a running inheritance", async function () {
    const { vault, owner, heir } = await loadFixture(deployVault);
    await time.increase(TWO_MIN);
    await vault.startInheritance();
    await expect(vault.connect(owner).ping()).to.emit(vault, "InheritanceVetoed");
    await time.increase(TWO_MIN);
    await expect(vault.connect(heir).claimInheritance())
      .to.be.revertedWithCustomError(vault, "NoInheritance");
  });

  it("allows only one recovery at a time, and one approval per guardian", async function () {
    const { vault, g1, g2, newDevice, stranger } = await loadFixture(deployVault);
    await vault.connect(g1).proposeRecovery(newDevice.address);
    await expect(vault.connect(g2).proposeRecovery(stranger.address))
      .to.be.revertedWithCustomError(vault, "RecoveryActive");
    await expect(vault.connect(g1).approveRecovery(newDevice.address))
      .to.be.revertedWithCustomError(vault, "AlreadyApproved");
    await expect(vault.connect(g2).approveRecovery(stranger.address))
      .to.be.revertedWithCustomError(vault, "WrongNewOwner");
    await expect(vault.connect(stranger).approveRecovery(newDevice.address))
      .to.be.revertedWithCustomError(vault, "NotGuardian");
  });

  it("does not carry old approvals into a new recovery", async function () {
    const { vault, owner, g1, g2, newDevice } = await loadFixture(deployVault);
    await vault.connect(g1).proposeRecovery(newDevice.address);
    await vault.connect(owner).cancelRecovery();
    // g1 may approve again in the new attempt; the count starts from zero.
    await vault.connect(g2).proposeRecovery(newDevice.address);
    expect(await vault.approvals()).to.equal(1);
    await vault.connect(g1).approveRecovery(newDevice.address);
    expect(await vault.approvals()).to.equal(2);
  });

  it("rejects bad settings", async function () {
    const [owner, g1, g2, heir] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("SayPayVault");
    await expect(Vault.deploy(owner.address, [g1.address], 1, heir.address, 1, 1, 1))
      .to.be.revertedWithCustomError(Vault, "BadConfig"); // one guardian
    await expect(Vault.deploy(owner.address, [g1.address, g2.address], 3, heir.address, 1, 1, 1))
      .to.be.revertedWithCustomError(Vault, "BadConfig"); // threshold > guardians
    await expect(Vault.deploy(owner.address, [g1.address, g1.address], 2, heir.address, 1, 1, 1))
      .to.be.revertedWithCustomError(Vault, "BadAddress"); // duplicate guardian
    await expect(Vault.deploy(owner.address, [owner.address, g1.address], 2, heir.address, 1, 1, 1))
      .to.be.revertedWithCustomError(Vault, "BadAddress"); // owner as guardian
  });

  it("reports its state in one call for the app", async function () {
    const { vault, owner, g1, newDevice } = await loadFixture(deployVault);
    await vault.connect(g1).proposeRecovery(newDevice.address);
    const s = await vault.status();
    expect(s.owner_).to.equal(owner.address);
    expect(s.balance).to.equal(ethers.parseEther("2.5"));
    expect(s.pendingOwner_).to.equal(newDevice.address);
    expect(s.approvals_).to.equal(1);
    expect(await vault.guardians()).to.have.length(3);
  });
});
