// Serves dist/ under the /StaticBlaze/ base path so base-prefixed links resolve locally.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, relative, sep } from 'node:path';

const root = resolve(new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const base = '/StaticBlaze';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.jpg': 'image/jpeg', '.png': 'image/png' };

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.startsWith(base)) path = path.slice(base.length) || '/';
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(join(root, path));
    const rel = relative(root, file);
    if (rel.startsWith('..') || rel.split(sep).includes('..')) { res.writeHead(403); return res.end(); }
    let data;
    try { data = await readFile(file); } catch { data = await readFile(join(root, '404.html')); }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(500); res.end(); }
}).listen(8077, () => console.log(`serving ${root} at http://localhost:8077/StaticBlaze/`));
