// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SayPayVault
/// @notice A wallet for blind users with no seed phrase. The owner's device key
/// controls it day to day. Guardians can restore access to a new device (after a
/// delay the owner can cancel), and a beneficiary inherits if the owner stops
/// using it. Guardians can never move funds: their only power is approving a new
/// owner key, or vetoing an inheritance while the owner is alive.
/// @dev Every state change emits an event; the web app announces each one.
/// No names, phone numbers or personal data are stored on chain.
contract SayPayVault {
    // --- Settings (fixed at creation) -------------------------------------

    address[] private _guardians;
    mapping(address => bool) public isGuardian;
    uint256 public immutable threshold;
    address public immutable beneficiary;
    uint256 public immutable inactivityPeriod;
    uint256 public immutable recoveryDelay;
    uint256 public immutable gracePeriod;

    // --- State --------------------------------------------------------------

    address public owner;
    uint256 public lastActivity;
    bool public closed; // true after the beneficiary has claimed

    // One recovery at a time. `recoveryNonce` changes whenever a recovery ends,
    // so approvals from an old attempt never count towards a new one.
    address public pendingOwner;
    uint256 public approvals;
    uint256 public recoveryReadyAt; // 0 until the threshold is reached
    uint256 public recoveryNonce;
    mapping(uint256 => mapping(address => bool)) public approvedBy;

    uint256 public inheritanceStartedAt; // 0 when no inheritance is running

    // --- Events --------------------------------------------------------------

    event Deposited(address indexed from, uint256 amount);
    event Sent(address indexed to, uint256 amount);
    event Pinged(uint256 at);
    event RecoveryProposed(address indexed guardian, address indexed newOwner);
    event RecoveryApproved(address indexed guardian, address indexed newOwner, uint256 approvals,
                           uint256 readyAt);
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner);
    event RecoveryCancelled(address indexed by, address indexed newOwner);
    event InheritanceStarted(uint256 startedAt, uint256 claimableAt);
    event InheritanceVetoed(address indexed by);
    event InheritanceClaimed(address indexed beneficiary, uint256 amount);

    // --- Errors ----------------------------------------------------------------

    error NotOwner();
    error NotGuardian();
    error NotBeneficiary();
    error VaultClosed();
    error BadConfig();
    error BadAddress();
    error InsufficientBalance();
    error TransferFailed();
    error RecoveryActive();
    error NoRecovery();
    error WrongNewOwner();
    error AlreadyApproved();
    error RecoveryNotReady();
    error OwnerStillActive();
    error InheritanceActive();
    error NoInheritance();
    error GraceNotOver();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyGuardian() {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        _;
    }

    modifier open() {
        if (closed) revert VaultClosed();
        _;
    }

    /// @param owner_ the device key created on the user's phone
    /// @param guardians_ 2 or 3 guardian addresses (from the user's contacts)
    /// @param threshold_ approvals needed to recover, e.g. 2 (of 3)
    /// @param beneficiary_ who inherits if the owner is gone
    /// @param inactivityPeriod_ owner silence before inheritance can start
    /// @param recoveryDelay_ wait after approvals, during which the owner can cancel
    /// @param gracePeriod_ time guardians have to veto an inheritance
    /// @dev For the demo all three timers are 120 seconds.
    constructor(
        address owner_,
        address[] memory guardians_,
        uint256 threshold_,
        address beneficiary_,
        uint256 inactivityPeriod_,
        uint256 recoveryDelay_,
        uint256 gracePeriod_
    ) payable {
        if (owner_ == address(0) || beneficiary_ == address(0)) revert BadAddress();
        if (guardians_.length < 2 || guardians_.length > 3) revert BadConfig();
        if (threshold_ < 2 || threshold_ > guardians_.length) revert BadConfig();
        if (inactivityPeriod_ == 0 || recoveryDelay_ == 0 || gracePeriod_ == 0) revert BadConfig();
        for (uint256 i = 0; i < guardians_.length; i++) {
            address g = guardians_[i];
            if (g == address(0) || g == owner_ || isGuardian[g]) revert BadAddress();
            isGuardian[g] = true;
            _guardians.push(g);
        }
        owner = owner_;
        threshold = threshold_;
        beneficiary = beneficiary_;
        inactivityPeriod = inactivityPeriod_;
        recoveryDelay = recoveryDelay_;
        gracePeriod = gracePeriod_;
        lastActivity = block.timestamp;
        if (msg.value > 0) emit Deposited(msg.sender, msg.value);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    // --- Owner ----------------------------------------------------------------

    /// @notice Send ETH. Resets the activity timer (the owner is alive).
    function send(address payable to, uint256 amount) external onlyOwner open {
        if (to == address(0) || to == address(this)) revert BadAddress();
        if (amount > address(this).balance) revert InsufficientBalance();
        _touch();
        emit Sent(to, amount);
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice "I'm still here": resets the activity timer without sending.
    function ping() external onlyOwner open {
        _touch();
        emit Pinged(block.timestamp);
    }

    /// @notice Stop a recovery the owner didn't ask for.
    function cancelRecovery() external onlyOwner {
        if (pendingOwner == address(0)) revert NoRecovery();
        address was = pendingOwner;
        _clearRecovery();
        _touch();
        emit RecoveryCancelled(msg.sender, was);
    }

    // --- Social recovery (lost phone) -------------------------------------------

    /// @notice A guardian proposes the new device's key. Counts as their approval.
    function proposeRecovery(address newOwner) external onlyGuardian open {
        if (pendingOwner != address(0)) revert RecoveryActive();
        if (newOwner == address(0) || newOwner == owner || isGuardian[newOwner]) revert BadAddress();
        pendingOwner = newOwner;
        emit RecoveryProposed(msg.sender, newOwner);
        _approve(newOwner);
    }

    /// @notice Another guardian approves. At the threshold, the delay starts.
    function approveRecovery(address newOwner) external onlyGuardian open {
        if (pendingOwner == address(0)) revert NoRecovery();
        if (newOwner != pendingOwner) revert WrongNewOwner();
        _approve(newOwner);
    }

    /// @notice After the delay, anyone can finish the recovery.
    function executeRecovery() external open {
        if (pendingOwner == address(0)) revert NoRecovery();
        if (recoveryReadyAt == 0 || block.timestamp < recoveryReadyAt) revert RecoveryNotReady();
        address oldOwner = owner;
        owner = pendingOwner;
        _clearRecovery();
        _touch(); // the new device counts as the owner being active
        emit RecoveryExecuted(oldOwner, owner);
    }

    // --- Inheritance switch (owner gone) ----------------------------------------

    /// @notice After the inactivity period, anyone can start the grace period.
    function startInheritance() external open {
        if (inheritanceStartedAt != 0) revert InheritanceActive();
        if (block.timestamp < lastActivity + inactivityPeriod) revert OwnerStillActive();
        inheritanceStartedAt = block.timestamp;
        emit InheritanceStarted(block.timestamp, block.timestamp + gracePeriod);
    }

    /// @notice A guardian who knows the owner is alive stops the inheritance.
    function vetoInheritance() external onlyGuardian open {
        if (inheritanceStartedAt == 0) revert NoInheritance();
        inheritanceStartedAt = 0;
        lastActivity = block.timestamp;
        emit InheritanceVetoed(msg.sender);
    }

    /// @notice After the grace period, the beneficiary receives all the funds.
    function claimInheritance() external open {
        if (msg.sender != beneficiary) revert NotBeneficiary();
        if (inheritanceStartedAt == 0) revert NoInheritance();
        if (block.timestamp < inheritanceStartedAt + gracePeriod) revert GraceNotOver();
        closed = true;
        uint256 amount = address(this).balance;
        emit InheritanceClaimed(beneficiary, amount);
        (bool ok, ) = payable(beneficiary).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // --- Views for the app -------------------------------------------------------

    function guardians() external view returns (address[] memory) {
        return _guardians;
    }

    /// @notice Everything the app needs to announce the wallet's state in one call.
    function status()
        external
        view
        returns (
            address owner_,
            uint256 balance,
            bool closed_,
            address pendingOwner_,
            uint256 approvals_,
            uint256 recoveryReadyAt_,
            uint256 inheritanceStartedAt_,
            uint256 inheritanceClaimableAt,
            uint256 inactiveAt
        )
    {
        return (
            owner,
            address(this).balance,
            closed,
            pendingOwner,
            approvals,
            recoveryReadyAt,
            inheritanceStartedAt,
            inheritanceStartedAt == 0 ? 0 : inheritanceStartedAt + gracePeriod,
            lastActivity + inactivityPeriod
        );
    }

    // --- Internal ------------------------------------------------------------------

    /// Owner activity: resets the inactivity timer and ends a running inheritance.
    function _touch() private {
        lastActivity = block.timestamp;
        if (inheritanceStartedAt != 0) {
            inheritanceStartedAt = 0;
            emit InheritanceVetoed(msg.sender);
        }
    }

    function _approve(address newOwner) private {
        if (approvedBy[recoveryNonce][msg.sender]) revert AlreadyApproved();
        approvedBy[recoveryNonce][msg.sender] = true;
        approvals += 1;
        if (approvals == threshold) recoveryReadyAt = block.timestamp + recoveryDelay;
        emit RecoveryApproved(msg.sender, newOwner, approvals, recoveryReadyAt);
    }

    function _clearRecovery() private {
        pendingOwner = address(0);
        approvals = 0;
        recoveryReadyAt = 0;
        recoveryNonce += 1;
    }
}
