import { createServer } from "node:http";
import { getDashboardConfig } from "./config.mjs";

const config = getDashboardConfig();

function renderPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SB-00 Dashboard Placeholder</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f6ef;
        --panel: #ffffff;
        --ink: #10221b;
        --muted: #53645c;
        --line: #d7ddd3;
        --accent: #0e8a63;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", sans-serif;
        background: radial-gradient(circle at top left, #eef4df 0, var(--bg) 55%);
        color: var(--ink);
      }
      main {
        max-width: 980px;
        margin: 0 auto;
        padding: 48px 24px 64px;
      }
      .hero {
        display: grid;
        gap: 16px;
        margin-bottom: 28px;
      }
      .grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 14px 40px rgba(16, 34, 27, 0.06);
      }
      .label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .value {
        margin-top: 8px;
        font-size: 22px;
        font-weight: 700;
      }
      a {
        color: var(--accent);
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="label">SB-00 Dashboard</div>
        <h1>Dashboard bootstrap placeholder is running.</h1>
        <p>This page exists to unlock <code>EX-09</code>. It confirms the dashboard workspace, env loading, and route boot path are ready.</p>
        <p>Backend placeholder: <a href="${config.backendUrl}/health">${config.backendUrl}/health</a></p>
      </section>
      <section class="grid">
        <article class="card">
          <div class="label">Device List</div>
          <div class="value">Placeholder</div>
          <p>Real device rows arrive in <code>EX-09</code> after <code>EX-06</code> and <code>EX-07</code>.</p>
        </article>
        <article class="card">
          <div class="label">Map Provider</div>
          <div class="value">${config.mapProvider}</div>
          <p>Map wiring stays optional in bootstrap but env naming is now fixed.</p>
        </article>
        <article class="card">
          <div class="label">Provisioning</div>
          <div class="value">QR + Web/PWA</div>
          <p>Customer flow remains single-path for MVP and pilot.</p>
        </article>
      </section>
    </main>
  </body>
</html>`;
}

const server = createServer((request, response) => {
  if (!request.url) {
    response.writeHead(400);
    response.end("missing_url");
    return;
  }

  if (request.url === "/" || request.url === "/devices") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderPage());
    return;
  }

  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ service: "dashboard", ok: true, port: config.port }, null, 2));
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("not_found");
});

server.listen(config.port, () => {
  console.log(`[dashboard] listening on http://localhost:${config.port}`);
});

