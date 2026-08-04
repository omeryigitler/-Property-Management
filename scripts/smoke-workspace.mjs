import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const port = 4317;
const baseUrl = `http://127.0.0.1:${port}`;
const output = [];

const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.on('data', (chunk) => output.push(chunk.toString()));
server.stderr.on('data', (chunk) => output.push(chunk.toString()));

function stopServer() {
  if (!server.killed) server.kill('SIGTERM');
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Workspace server exited early.\n${output.join('')}`);
    }

    try {
      const response = await fetch(`${baseUrl}/__health`, { cache: 'no-store' });
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Workspace server did not become ready.\n${output.join('')}`);
}

async function assertResponse(pathname, description) {
  const response = await fetch(`${baseUrl}${pathname}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${description} returned HTTP ${response.status}: ${pathname}`);
  }
  return response;
}

try {
  await waitForServer();

  const health = await assertResponse('/__health', 'Health endpoint');
  const healthPayload = await health.json();
  if (healthPayload.ok !== true) {
    throw new Error('Health endpoint did not report ok=true.');
  }

  const indexResponse = await assertResponse('/', 'Application entry page');
  const indexHtml = await indexResponse.text();
  if (!indexHtml.includes('<div id="root"></div>')) {
    throw new Error('Application entry page is missing the React root element.');
  }

  const builtIndex = await readFile('dist/index.html', 'utf8');
  const assetPaths = Array.from(
    builtIndex.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g),
    (match) => match[1]
  );

  if (assetPaths.length === 0) {
    throw new Error('No compiled assets were referenced by dist/index.html.');
  }

  for (const assetPath of assetPaths) {
    await assertResponse(assetPath, 'Compiled asset');
  }

  const fallbackResponse = await assertResponse('/reports/deep-link', 'SPA fallback');
  const fallbackHtml = await fallbackResponse.text();
  if (!fallbackHtml.includes('<div id="root"></div>')) {
    throw new Error('SPA fallback did not return the application entry page.');
  }

  console.log(`Workspace smoke test passed (${assetPaths.length} compiled assets verified).`);
} finally {
  stopServer();
}
