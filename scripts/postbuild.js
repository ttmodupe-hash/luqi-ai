const fs = require("fs");
const path = require("path");

const distPath = path.join(__dirname, "..", "dist", "public");

// _redirects for Netlify/Vercel
fs.writeFileSync(path.join(distPath, "_redirects"), "/*    /index.html   200\n");

// 404.html for other static hosts
const html404 = [
  "<!DOCTYPE html>",
  "<html lang=\"en\">",
  "<head>",
  "  <meta charset=\"UTF-8\" />",
  "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />",
  "  <title>LUQI AI</title>",
  "  <script>",
  "    sessionStorage.setItem(\"spa_redirect\", window.location.pathname + window.location.search);",
  "    window.location.replace(\"/\");",
  "  </script>",
  "</head>",
  "<body><p>Redirecting...</p></body>",
  "</html>"
].join("\n");
fs.writeFileSync(path.join(distPath, "404.html"), html404);

// Add SPA redirect handler to index.html
const indexPath = path.join(distPath, "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf-8");

const spaScript = [
  "    <script>",
  "      (function() {",
  "        var redirect = sessionStorage.getItem(\"spa_redirect\");",
  "        if (redirect) {",
  "          sessionStorage.removeItem(\"spa_redirect\");",
  "          window.history.replaceState(null, null, redirect);",
  "        }",
  "      })();",
  "    </script>"
].join("\n");

if (!indexHtml.includes("spa_redirect")) {
  indexHtml = indexHtml.replace("</body>", spaScript + "\n  </body>");
  fs.writeFileSync(indexPath, indexHtml);
}

console.log("Post-build: SPA routing files added");
