# LUQI standalone frontend and desktop shell

This directory builds the alternate React 18 frontend. The Railway deployment
uses the repository-root frontend and Node API. No provider or billing activation
is performed by these build commands.

```bash
npm ci --legacy-peer-deps --include=dev
npm run dev          # frontend development on port 3000
npm run build        # static files in dist/public
npm run preview      # local Vite preview, not a production API server
```

Run the root project for authenticated API-backed features. The standalone build
has no `api/boot.ts`; it does not start an independent backend. Relative API
requests require an appropriate same-origin server. Do not put provider keys in
frontend environment variables or enable CORS broadly to work around this.

For the experimental desktop shell, build the frontend first, then:

```bash
cd electron
npm ci --legacy-peer-deps --include=dev
npm run build -- --linux --dir --publish=never
```

The packaging step copies `dist/public` into the desktop `ui` directory and
includes it in the application archive. CI checks a packaged Linux workspace
launch. Windows/macOS installers, signing, updates and authenticated backend
connectivity still require release acceptance; a rendered workspace is not proof
of those features. Native mobile build acceptance is also outstanding.
