import { useState, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { ArrowUpRight, CheckCircle2, Download, Share2, Smartphone } from "lucide-react";
import {
  installPromptAvailable, installationObserved, isLuqiStandalone,
  requestLuqiInstall, subscribeLuqiInstall,
} from "../lib/pwa-install";
import "../workspace.css";

/** One shareable installation route for Android, iPhone, and desktop browsers. */
export default function InstallAppPage() {
  const installReady = useSyncExternalStore(subscribeLuqiInstall, installPromptAvailable, () => false);
  const installEventObserved = useSyncExternalStore(subscribeLuqiInstall, installationObserved, () => false);
  const installed = isLuqiStandalone() || installEventObserved;
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function installOnClick() {
    if (busy || !installReady) return;
    setBusy(true);
    setFeedback("");
    try {
      const result = await requestLuqiInstall();
      if (result === "accepted") {
        setFeedback("Installation requested. Check your device for the Luqi icon; the browser will confirm when installation finishes.");
      } else if (result === "dismissed") {
        setFeedback("Installation not completed. You can still use your browser menu to add Luqi to your home screen.");
      } else {
        setFeedback("The browser install option is not available here. Follow the phone instructions below.");
      }
    } catch {
      setFeedback("The browser could not open its install prompt. Follow the phone instructions below.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="luqi-info luqi-install-page" aria-labelledby="install-title">
      <div className="luqi-install-hero">
        <div>
          <p className="luqi-eyebrow">YOUR LUQI HOME-SCREEN APP</p>
          <h1 id="install-title">Take Luqi with you.</h1>
          <p>Add Luqi from your phone browser and open it from your home screen. There is no separate APK file to download.</p>
          <div className="luqi-install-actions">
            {installed ? (
              <p className="luqi-install-installed" role="status">
                <CheckCircle2 size={20} aria-hidden="true" /> Luqi is running as an installed app or your browser has reported installation.
              </p>
            ) : installReady ? (
              <button className="luqi-primary" type="button" disabled={busy} onClick={() => { void installOnClick(); }}>
                <Download size={18} aria-hidden="true" /> {busy ? "Opening browser installer…" : "Install Luqi now"}
              </button>
            ) : (
              <p className="luqi-install-hint" role="status">Use your phone browser's install or Add to Home Screen option. Steps are below.</p>
            )}
            <Link className="luqi-install-open" to="/chat">Open Luqi Chat <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          {feedback && <p className="luqi-install-feedback" role="status">{feedback}</p>}
        </div>
        <div className="luqi-install-icon-preview" aria-label="Luqi home-screen icon">
          <img src="/icon-192.png" width="128" height="128" alt="Luqi app icon" />
          <span>Luqi</span>
        </div>
      </div>

      <div className="luqi-install-steps">
        <section aria-labelledby="install-android-title">
          <span className="luqi-install-step-icon"><Smartphone size={21} aria-hidden="true" /></span>
          <h2 id="install-android-title">On Android</h2>
          <ol>
            <li>Open <strong>https://app.luqi-ai.com/#/install</strong> in an up-to-date phone browser. In Chrome, use the three-dot menu.</li>
            <li>Tap <strong>Install Luqi now</strong> if offered. Otherwise look in your browser menu for <strong>Install and create shortcut</strong>, <strong>Install app</strong> or <strong>Add to Home screen</strong>. Menu names vary by browser.</li>
            <li>Follow the browser's <strong>Install</strong> or <strong>Add</strong> confirmation, then open the new Luqi icon.</li>
          </ol>
        </section>
        <section aria-labelledby="install-iphone-title">
          <span className="luqi-install-step-icon"><Share2 size={21} aria-hidden="true" /></span>
          <h2 id="install-iphone-title">On iPhone or iPad</h2>
          <ol>
            <li>Open this page in <strong>Safari</strong>.</li>
            <li>Tap the <strong>Share</strong> icon, then choose <strong>Add to Home Screen</strong>. If offered, keep <strong>Open as Web App</strong> enabled.</li>
            <li>Tap <strong>Add</strong>, then open Luqi using the new home-screen icon.</li>
          </ol>
        </section>
      </div>

      <section className="luqi-install-clarity" aria-labelledby="install-android-brands-title">
        <h2 id="install-android-brands-title">Huawei, Xiaomi, Oppo and other Android phones</h2>
        <p>Installation depends on your browser and Android version, including on Huawei, Xiaomi, Redmi, Poco, Oppo, Realme, OnePlus, Vivo and Samsung phones. A brand name alone does not confirm compatibility.</p>
        <p>Use your phone's supported, up-to-date browser. Some browsers create an installed web app; others create a home-screen shortcut that opens Luqi in the browser. This can also happen on phones without Google Mobile Services. Both open the same Luqi website; a shortcut may not have every installed-app feature.</p>
        <p>If you opened this link inside WhatsApp, Facebook or another app, use its menu to open it in your normal browser, or type <strong>app.luqi-ai.com</strong> there yourself. An in-app browser may not offer installation.</p>
        <p>If neither Install nor Add to Home screen is offered, bookmark Luqi and continue in the browser. Do not install an APK or change security settings to make an install button appear.</p>
      </section>

      <section className="luqi-install-clarity" aria-labelledby="install-security-title">
        <h2 id="install-security-title">Install safely on your phone</h2>
        <p>Luqi does not distribute a downloadable Android APK through this page. A supported browser may create its own managed Android package for a web app. That is different from downloading an APK and granting permission to install unknown apps.</p>
        <p><strong>If Play Protect or your phone's security system warns that an app is unsafe or built for an older Android version, stop that installation.</strong> Do not choose “Install anyway”, switch off Play Protect or other protections, or enable installation from unknown sources.</p>
        <ul>
          <li><strong>Website or connection warning:</strong> if the browser warns about a deceptive site, certificate or insecure connection, do not continue past it. Report the address and warning so we can investigate the website.</li>
          <li><strong>Luqi page error:</strong> an install button that fails or a page that does not load may need an app fix. Report the exact step and warning.</li>
          <li><strong>Browser or phone restriction:</strong> a missing install menu, unsupported browser or device policy can limit installation. It does not by itself mean Luqi is unsafe. Keep security controls enabled; use the website only if the browser opens it without a security warning.</li>
        </ul>
        <p>Report your phone model, Android and browser versions, the download or website address, and a screenshot with passwords, one-time codes and personal details removed. A warning's cause needs checking; Luqi cannot verify third-party APK copies.</p>
      </section>

      <section className="luqi-install-clarity" aria-labelledby="install-updates-title">
        <h2 id="install-updates-title">Keep Luqi up to date</h2>
        <p>While you are online, opening or refreshing Luqi loads the current website release. There is no replacement APK to download or reinstall.</p>
        <p>An open Luqi app checks periodically for a newer release while visible and online, and checks again when you return. When <strong>A newer Luqi version is available</strong> appears, save or copy unfinished messages and forms, then choose <strong>Refresh Luqi</strong>. You may need to sign in again. Luqi will not interrupt your work with an automatic refresh.</p>
        <p>An offline cached page may be an older version. Reconnect before checking for updates or using online features. Keep your browser and Android updated using your device's normal trusted update channels.</p>
      </section>

      <section className="luqi-install-clarity" aria-labelledby="install-clarity-title">
        <h2 id="install-clarity-title">What gets installed?</h2>
        <p>This is the official Luqi website added as a <strong>progressive web app (PWA)</strong> or browser shortcut, depending on your device. It is not an App Store iOS download. Adding it does not require sideloading, payment or a browser extension.</p>
        <p>Luqi's limited, consent-based AI text chat needs internet access and a Luqi account. Sessions and unsaved chats are held in this tab/app; installing or reopening the app may require signing in again. Offline access is limited to previously cached public pages and assets, not AI replies or private account data.</p>
        <p>Use the official address <strong>app.luqi-ai.com</strong>. Check it before signing in and avoid unofficial APKs and copies of the app.</p>
        <Link to="/privacy">Review privacy information</Link>
      </section>
    </main>
  );
}
