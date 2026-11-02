/** Local observations only. No device fingerprint, storage, account data or network. */
export interface InstallObservation {
  origin: string; secure: boolean; online: boolean | null; serviceWorker: boolean;
  standalone: boolean; promptAvailable: boolean; bootAsset: string | null;
}
export interface InstallDiagnostic {
  officialHost: boolean; secure: boolean; online: boolean | null;
  serviceWorker: boolean; standalone: boolean; promptAvailable: boolean;
  bootAsset: string | null; nextStep: string;
}
export function describeInstall(observed: InstallObservation): InstallDiagnostic {
  const officialHost = ['https://app.luqi-ai.com', 'https://luqi-ai.com'].includes(observed.origin);
  const secure = observed.secure === true;
  const standalone = observed.standalone === true;
  const promptAvailable = observed.promptAvailable === true;
  const online = typeof observed.online === 'boolean' ? observed.online : null;
  const bootAsset = typeof observed.bootAsset === 'string' && observed.bootAsset.length < 160 &&
    /^\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(observed.bootAsset) ? observed.bootAsset : null;
  const nextStep = !officialHost || !secure
    ? 'Open the official HTTPS Luqi address in your normal browser. Do not bypass a connection or security warning.'
    : online === false
    ? 'Your browser reports no network connection. Reconnect before checking for updates; cached pages may be older.'
    : standalone
    ? 'This window reports standalone display mode. This is not proof of a completed handset security test.'
    : promptAvailable
    ? 'Your browser is offering installation. Use Install Luqi now only after checking the address and any security warning.'
    : 'No browser install prompt is available here. Use the Android or iPhone instructions below, or continue in the browser.';
  return { officialHost, secure, online, serviceWorker: observed.serviceWorker === true,
    standalone, promptAvailable, bootAsset, nextStep };
}
/** Only allowlisted observations enter the report. Never include full URLs,
 * query/hash, user agent, identifiers, account details or user-supplied text. */
export function installDiagnosticText(observed: InstallObservation): string {
  const d = describeInstall(observed);
  return [
    'Luqi browser installation check — local snapshot',
    'NOT a security certification, physical-device acceptance or proof of successful installation.',
    'Official HTTPS host: ' + (d.officialHost ? 'yes' : 'not confirmed'),
    'Secure browser context: ' + (d.secure ? 'reported' : 'not reported'),
    'Network connection hint: ' + (d.online === null ? 'unknown' : d.online ? 'online (not a server health check)' : 'offline'),
    'Service worker API: ' + (d.serviceWorker ? 'available (not proof of cached assets)' : 'not available'),
    'Display mode: ' + (d.standalone ? 'standalone' : 'browser tab'),
    'Native install prompt: ' + (d.promptAvailable ? 'available' : 'not currently available'),
    'Loaded public boot asset: ' + (d.bootAsset || 'not identified'),
    d.nextStep,
    'Keep Play Protect and device protections enabled. Do not sideload an APK or select Install anyway.',
    'No account, documents, private browser data or installed-app inventory was read. Nothing was sent.',
  ].join('\n');
}
