/**
 * Browser-local, downloadable one-page service site. No hosting, uploads,
 * network requests or scripts. Site facts are supplied by the user.
 */
export interface WebsiteStarterInput {
  name: string;
  service: string;
  area: string;
  phone: string;
}
export interface WebsiteStarterResult { filename: string; html: string }

function cleanText(raw: string, maximum: number): string {
  if (typeof raw !== "string" || raw.length > maximum * 2)
    throw new Error("INVALID_SITE_FIELD");
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text || text.length > maximum) throw new Error("INVALID_SITE_FIELD");
  return text;
}
function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}
function publicPhone(raw: string): { display: string; dial: string } | null {
  if (!raw.trim()) return null;
  if (raw.length > 30) throw new Error("INVALID_PUBLIC_PHONE");
  const display = raw.trim().replace(/\s+/g, " ");
  const dial = display.replace(/[ ()-]/g, "");
  if (!/^\+?[0-9]{7,15}$/.test(dial)) throw new Error("INVALID_PUBLIC_PHONE");
  return { display: escapeHtml(display), dial };
}
export function makeWebsiteStarter(input: WebsiteStarterInput): WebsiteStarterResult {
  const name = escapeHtml(cleanText(input.name, 80));
  const service = escapeHtml(cleanText(input.service, 240));
  const area = escapeHtml(cleanText(input.area, 100));
  const phone = publicPhone(input.phone);
  const contact = phone
    ? '<a class="button" href="tel:' + phone.dial + '">Call ' + phone.display + '</a>'
    : '<p>Ask the business owner for public contact details.</p>';
  const html = [
    '<!doctype html><html lang="en"><head>',
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">',
    '<meta name="color-scheme" content="light"><title>',name,' — Local services</title>',
    '<style>',
    '*{box-sizing:border-box}body{margin:0;background:#f5f7f3;color:#153528;font:16px/1.65 system-ui,-apple-system,sans-serif}',
    'header,main,footer{max-width:900px;margin:auto;padding:24px}',
    'header{padding-block:23px;border-bottom:1px solid #d4e1d5;font-weight:750}',
    '.hero{background:#14392e;color:#f9f6e9;padding:clamp(22px,7vw,60px);border-radius:22px;margin:24px 0}',
    '.eyebrow{font-size:.85rem;font-weight:750;color:#fbd780;letter-spacing:.03em}',
    'h1{font-size:clamp(2rem,7vw,3.7rem);line-height:1.12;margin:18px 0}',
    'h2{font-size:1.45rem}p{max-width:65ch}.hero p{font-size:1.12rem;color:#e0ebe2}',
    '.panel{background:#fff;border:1px solid #ceded0;border-radius:16px;margin:20px 0;padding:clamp(20px,4vw,35px)}',
    '.button{display:inline-block;background:#f5c15b;color:#1b2e21;font-weight:750;border-radius:10px;padding:12px 20px;text-decoration:none;min-height:48px}',
    '.button:focus-visible,a:focus-visible{outline:3px solid #d98506;outline-offset:3px}',
    'small,footer{color:#465f51}footer{font-size:.82rem}',
    '</style></head><body>',
    '<header>',name,'</header>',
    '<main id="main"><section class="hero" aria-labelledby="site-title">',
    '<p class="eyebrow">Serving ',area,'</p><h1 id="site-title">',name,'</h1>',
    '<p>',service,'</p><a class="button" href="#contact">Get in touch</a></section>',
    '<section class="panel" aria-labelledby="services-title"><h2 id="services-title">What we offer</h2>',
    '<p>',service,'</p><p><strong>Service area:</strong> ',area,'</p></section>',
    '<section class="panel" id="contact" aria-labelledby="contact-title">',
    '<h2 id="contact-title">Contact us</h2>',contact,'</section></main>',
    '<footer>Basic website created with Luqi. Business details are provided by its owner; check accuracy before sharing or publishing.</footer>',
    '</body></html>',
  ].join("");
  return { filename: "luqi-simple-service-website.html", html };
}
