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
          <p>Install Luqi from your phone browser. It opens from your home screen like an app, with no app-store account or APK file needed.</p>
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
            <li>Open this page in <strong>Chrome</strong> on your phone.</li>
            <li>Tap <strong>Install Luqi now</strong> if it appears, or open Chrome's three-dot menu and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
            <li>Confirm <strong>Install</strong> or <strong>Add</strong>, then open Luqi from your home screen.</li>
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

      <section className="luqi-install-clarity" aria-labelledby="install-security-title">
        <h2 id="install-security-title">Install safely on your phone</h2>
        <p>Luqi installs from your browser as a web app. You do not need an Android APK, a separate installer or permission to install unknown apps.</p>
        <p><strong>If Google Play Protect says an app is unsafe or built for an older Android version, stop.</strong> Do not choose “Install anyway”, switch off Play Protect or change device security settings. An APK showing this warning is not the Luqi browser installation described on this page.</p>
        <p>Instead, open <strong>https://app.luqi-ai.com</strong> in your browser and use its Install app or Add to Home screen option. If installation is unavailable on your phone, keep using Luqi securely in the browser.</p>
        <p>If an app labelled Luqi shows a security warning, report the download address and a screenshot without passwords, one-time codes or personal details. Luqi cannot verify third-party APK copies.</p>
      </section>

      <section className="luqi-install-clarity" aria-labelledby="install-clarity-title">
        <h2 id="install-clarity-title">What gets installed?</h2>
        <p>This is the official Luqi website installed as a <strong>progressive web app (PWA)</strong>, not a signed Android APK or an App Store iOS download. There is no sideloading, payment, browser extension or extra permission request.</p>
        <p>Luqi's limited, consent-based AI text chat needs internet access and a Luqi account. Sessions and unsaved chats are held in this tab/app; installing or reopening the app may require signing in again. Offline access is limited to previously cached public pages and assets, not AI replies or private account data.</p>
        <p>For safety, use only <strong>app.luqi-ai.com</strong> or the link you received from Luqi. Avoid unofficial APKs and copies of the app.</p>
        <Link to="/privacy">Review privacy information</Link>
      </section>
    </main>
  );
}
