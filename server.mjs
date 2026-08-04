import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 3000);

const app = express();

app.disable('x-powered-by');

app.get('/__health', (_request, response) => {
  response.status(200).json({ ok: true, port });
});

app.use(
  express.static(distDir, {
    etag: false,
    lastModified: false,
    setHeaders(response) {
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    },
  })
);

app.get('*', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[Property Management] Static workspace server listening on http://0.0.0.0:${port}`);
});
