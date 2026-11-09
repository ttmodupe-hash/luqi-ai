import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  makeWebsiteStarter,
  type WebsiteStarterInput,
  type WebsiteStarterResult,
} from "./website-starter";
import "./website-starter.css";

const empty = (): WebsiteStarterInput => ({ name: "", service: "", area: "", phone: "" });
const example: WebsiteStarterInput = {
  name: "Example Home Repairs",
  service: "Small household repairs and maintenance. Ask for a quote before work starts.",
  area: "Pretoria and surrounding areas",
  phone: "",
};

export default function SimpleWebsiteStarter() {
  const [fields, setFields] = useState<WebsiteStarterInput>(empty);
  const [notice, setNotice] = useState("");
  const downloads = useRef(new Map<string, number>());
  useEffect(() => () => {
    for (const [url, timeout] of downloads.current) {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
    }
    downloads.current.clear();
  }, []);

  let site: WebsiteStarterResult | null = null;
  try { site = makeWebsiteStarter(fields); } catch { site = null; }
  const completed = [fields.name, fields.service, fields.area]
    .filter((value) => value.trim().length > 0).length;

  function update(key: keyof WebsiteStarterInput, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setNotice("");
  }

  function download() {
    if (!site) return;
    let url: string | null = null;
    try {
      url = URL.createObjectURL(new Blob([site.html], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = site.filename;
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      const currentUrl = url;
      downloads.current.set(currentUrl, window.setTimeout(() => {
        URL.revokeObjectURL(currentUrl);
        downloads.current.delete(currentUrl);
      }, 30000));
      setNotice("Website file requested. Open the .html file to view it offline. Nothing was published.");
    } catch {
      if (url) URL.revokeObjectURL(url);
      setNotice("This browser could not prepare the file. Your inputs remain here.");
    }
  }

  return (
    <section className="websiteStarter" aria-labelledby="starter-heading">
      <p className="starterEyebrow">START HERE · NO CODING OR ACCOUNT NEEDED</p>
      <h2 id="starter-heading">Build a simple website for your service</h2>
      <p>Enter what your business does, see a real mobile-ready web page, then download it.
        You can show the file to customers or a developer. Luqi does not host or publish it.</p>
      <p className="starterStep" role="status">{completed} of 3 website details entered</p>
      <div className="websiteStarterLayout">
        <form className="websiteStarterForm" onSubmit={(event) => event.preventDefault()}>
          <label>Business or project name
            <input maxLength={80} value={fields.name}
              placeholder="e.g. My Mobile Repairs"
              onChange={(event) => update("name", event.target.value)} />
          </label>
          <label>What service do you offer?
            <textarea maxLength={240} value={fields.service}
              placeholder="Tell a customer what problem you solve"
              onChange={(event) => update("service", event.target.value)} />
          </label>
          <label>Public service area (not your home address)
            <input maxLength={100} value={fields.area}
              placeholder="e.g. Tshwane and nearby townships"
              onChange={(event) => update("area", event.target.value)} />
          </label>
          <label>Public telephone number (optional)
            <input type="tel" maxLength={30} autoComplete="off" value={fields.phone}
              placeholder="Only if you want customers to call"
              onChange={(event) => update("phone", event.target.value)} />
          </label>
          <p className="starterHint">Use public business details only. Never enter an ID number,
            password, residential address or private customer information.</p>
          {completed === 3 && !site && (
            <p role="alert">Check your entries and public phone number.
              Use 7–15 telephone digits or leave the phone blank.</p>
          )}
          <div className="starterButtons">
            <button type="button" onClick={() => { setFields(example); setNotice("Illustrative example loaded, not a verified business."); }}>
              Try an example
            </button>
            <button type="button" onClick={() => { setFields(empty()); setNotice("The local website draft was cleared."); }}>
              Clear draft
            </button>
            <button type="button" disabled={!site} onClick={download}>
              Download my website (.html)
            </button>
          </div>
        </form>
        <div className="websiteStarterPreview">
          <h3>Live page preview</h3>
          {site ? (
            <iframe
              title="Preview of your website"
              srcDoc={site.html}
              sandbox=""
              referrerPolicy="no-referrer"
            />
          ) : (
            <p role="status">Enter your business name, service and area to see your website here.</p>
          )}
          <p className="starterHint">Preview is isolated. There are no third-party scripts,
            trackers, uploads, payment links or external images.</p>
        </div>
      </div>
      {notice && <p role="status" className="starterNotice">{notice}</p>}
      <details className="starterLearning">
        <summary>What you learn by making this page</summary>
        <p>The name tells customers who you are. The service explains what you do.
          The area shows where you work without giving away a private address.
          A public contact number lets customers reach you. You can edit the
          downloaded HTML later or give it to a developer.</p>
      </details>
      <p>Want customers to find your business inside Luqi?
        {" "}<Link to="/business-connect">Prepare a Business Connect profile</Link>.
        Public listings and verification still require review.</p>
    </section>
  );
}
