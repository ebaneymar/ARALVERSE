# ARALVERSE device activation

Version 1.5.81 starts one seven-day trial on the first launch on each device.
The trial is stored outside the portable game folder. Replacing the application
or importing classroom data does not start a new trial. The activation entry is
immediately below **Check for Updates** in Settings.

The owner issues permanent, device-specific activation keys with a separate
private manager. The public repository and the shipped application contain only
an Ed25519 public verification key. The private signing key, protected owner
manager, and manager password must never be committed here or bundled with the
customer application.

After the trial, game launches require activation. Updates and the saved-data
folder remain available. Existing classroom records are not removed or migrated
by the activation service. A running game is paused when a trial ends.

## Future releases

Preserve `src/license-public-key.json`, the `ARALVERSE_LICENSE_V1` signature
format, the device identity policy, and the version-independent licensing paths.
Do not regenerate the signing identity or reset licensing records as part of an
update. The private owner manager generates permanent keys that remain valid
through these releases.

The Windows service prefers the SMBIOS system UUID, with a pinned MachineGuid
fallback when firmware identity is unavailable. Trial records are mirrored in
local and shared application data, with a registry anchor. Signature checks bind
activation keys to the device; authenticated state detects routine record edits,
and a persisted high-water timestamp detects clock rollback.

This is offline licensing, not tamper-proof DRM. Deliberately modifying the
application, removing all licensing anchors, or running an old unrestricted
version cannot be prevented by an offline update. An online licensing authority
would be needed for authoritative trial enforcement, revocation, and transfer
management. No licensing server or telemetry is introduced in this release.

## Verification

The release workflow checks trial boundaries, updates/restarts, key signatures,
device mismatch, clock rollback, corrupted state, recovery, concurrent windows,
storage failures, native Windows identity and IPC, the activation UI, and the
existing layout editor before publishing a matched ZIP and manifest.
