# Web container identity

The web image uses the existing unprivileged `node` user after building its
bundles. The app needs to read its distribution and connect to private MySQL;
it does not need Linux root or ownership of its source/dependencies. No writable
production volume or source ownership change is added. MySQL's image, volume,
process user, deployment and records are unchanged by this web-only setting.

The exact-image smoke job checks the default execution UID is nonzero, then
exercises HTTP health, static frontend, disabled/no-database readiness, auth
denials and legacy side-effect guards. It verifies all three operator binaries
are readable. The normal startup log records only the non-secret runtime UID
for production acceptance; it exposes no environment or credentials.

This is separate from the dedicated MySQL identity in MYSQL_RUNTIME_PRIVILEGES.md.
A private operator command still needs an explicitly supplied authorized DB
identity for any privileged SQL; running the web process as root is not that
authorization. Legacy features requiring unreviewed filesystem writes remain
outside the enabled release. This is one hardening control, not a complete
container/host security certification or historic credential revocation.
