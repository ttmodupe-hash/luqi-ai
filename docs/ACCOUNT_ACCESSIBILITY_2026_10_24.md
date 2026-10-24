# Account-entry usability and privacy — 24 October 2026

Adds an explicitly activated Show/Hide control to sign-in, registration,
confirmation and known-password-change fields in both frontend source trees.
The control is a native non-submit button with a field-specific accessible
name and aria-controls relationship. The original input is retained when its
type changes, along with its label, autocomplete, validation and paste support.
No credential is copied to browser storage, text content, URL, log or telemetry.
Email/password fields disable mobile autocapitalization and autocorrection.

Passwords start masked. Revealed fields re-mask on Escape, focus leaving the
field/button group, window blur, document becoming hidden, value clearing or
an explicit disabled/busy transition. Visibility never constitutes authorization
and does not send a login, signup, password-change, recovery or AI request.
Authentication-mode changes and closed password settings retain existing
credential-clearing behaviour. Buttons have minimum 44px touch targets.

The sign-in form also provides keyboard-accessible local recovery guidance.
It states that automated reset mail is unavailable and directs existing pilot
users to their private invitation or verified administrator conversation. It
warns against posting account details in public GitHub issues and links to the
existing help page. No personal owner-recovery address is published. This is
help text, NOT a new recovery service or proof that anyone's account was reset.

## Verification and limits

The new workflow exercises the field plus existing account and password-change
contracts using synthetic fixtures, strict scoped TypeScript checks, and exact
frontend-copy comparison. The main browser suite discovers five additional
scenarios in each desktop/mobile configuration: keyboard controls, confirmation
and mode reset, honest recovery guidance, 320px layout/touch targets, and
password-change controls. Actual passing results must be recorded in #202.
Code presence alone is not proof that CI, deployment or manual acceptance passed.

Server authentication, rate limits, password policy, account data, mail delivery,
DNS, provider budgets and customer billing are unchanged. This does not resolve
the owner's existing 401, verify or bind a recovery mailbox, complete a real
assisted reset, prove screen-reader/physical-device acceptance or certify WCAG
conformance. Historic credential review, production-derived isolated restore,
provider-cost reconciliation and commercial-launch gates remain open.

Design references checked 24 October 2026:
- W3C Accessible Authentication (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html
- W3C H100, properly marked-up email/password inputs: https://www.w3.org/WAI/WCAG21/Techniques/html/H100
- OWASP Forgot Password Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
