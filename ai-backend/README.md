# Optional secure AI backend

Bac-pedia is hosted on GitHub Pages, which cannot securely store a Gemini API key.

For public AI access, deploy `cloudflare-worker.js` as a Cloudflare Worker, set the secret `GEMINI_API_KEY`, and configure `ALLOWED_ORIGIN` as `https://boukhariabdallahyasser-prog.github.io`. Set `CONFIG.aiProxyEndpoint` in `index.html` to the deployed Worker URL. **Never commit the secret**.

The Worker implements an origin check, size limit, and minimal response parsing. **It is a starter template, not production abuse protection**: origin headers are not authentication. Before opening public access, add Cloudflare Turnstile verification, per-user/IP rate limits, quotas, monitoring, and a budget cap. Otherwise anyone who reaches the endpoint may spend your API quota.

For personal testing only, the UI accepts a Gemini key in memory for the current page session. The browser sends that key directly to Google, so this mode is unsuitable for distributing a shared key to visitors.
