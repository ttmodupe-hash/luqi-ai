# Production province-map delivery

The public server deliberately rejects sa-* filenames as possible service-account material. Vite had generated sa-province-map-C0FdmDx8.js for the licensed South Africa geometry. The Civic Atlas and Opportunities imported that module successfully in Vite preview, but production correctly applied its stricter file guard and returned 404.

Both builds now explicitly name this data-only chunk za-province-geometry. Source geometry, licensing, privacy policy and the static-file guard are unchanged. No credential-shaped file is newly allowed.

The new verify-production-assets.mjs check enumerates emitted HTML, JavaScript, CSS and WASM and fetches their exact public paths through the production HTTP server. It requires status 200, the right MIME type, the expected byte count and SHA-256. It rejects redirects, cookies, unapproved origins, missing files, SPA fallbacks, changed bytes and oversized responses. Four bounded reads run at a time with no retries. The mandatory web CI production-server smoke step runs both the verifier contract tests and this real check.

Local validation: full production build, 62 static-file boundary tests, three asset-verifier tests, and all 154 emitted public files served through the real Hono production server. Browser previews alone do not prove production asset delivery.
