# LUQI Business Desk encrypted local backups — feature acceptance

25 October 2026, RSA. This user-visible backup feature uses the previously
merged, test-verified local AES-256-GCM project sealing helper. It encrypts the
exact validated editable quote project on the user's device, then downloads
an encrypted JSON wrapper with a new random UUID. The wrapper contains only
the envelope format, project kind, UUID, KDF parameters, random salt/nonce
and ciphertext. Client and business names are not transmitted or included
unencrypted in the wrapper. It has no account, paid inference, cloud upload,
login, storage, merchant checkout or subscription requirement.

The project passphrase is separate from the LUQI password. The UI requests
two matching entries when encrypting and does not intentionally persist the
passphrase in localStorage/sessionStorage, account records, source or backend
logs. Restore requires choosing the encrypted file and entering the correct
phrase, then a separate explicit confirmation before replacing active
quotation fields. Errors leave existing input untouched. Original unencrypted
editable files remain supported for users who prefer them.

Limits and safety: AES-256-GCM + PBKDF2-SHA256/310000 is a useful local
privacy measure, not an audited complete end-to-end multi-device security
system. Weak/reused passphrases remain a risk; a lost passphrase cannot be
recovered by LUQI. Downloads are user-managed files and may be readable
by someone with device/download-folder access. The browser may independently
manage autofill; user passphrase fields request autocomplete off. Do not
claim regulatory compliance, professional data custody, total data erasure,
or that a backup is safe without securely storing and testing a copy.

### Gates

- Tests include real Web Crypto authenticated encryption/decryption,
  wrong-passphrase and tampering refusal, confirmation-before-restore,
  absence of network/customer storage, and mobile 320px download/reopen.
- Both src/ and app/src/ are mirrored, using the same vault helper.
- Shipping a local backup does NOT activate the gated cloud vault
  (LUQI_PROJECT_VAULT_ENABLED remains OFF), apply migrations, provide
  subscription entitlements, or verify provider charges.
- Separate secure vault, merchant, whole-account deletion and recovery
  gates remain in #202 and the project-vault operator runbook.
