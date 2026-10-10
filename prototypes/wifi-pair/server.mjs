// PROTOTYPE — throwaway LAN signalling + static page for the two-device Wi-Fi test. Wipe me.
// Run on the anchor laptop: node prototypes/wifi-pair/server.mjs
import http from 'node:http';
import { readFileSync } from 'node:fs';
import os from 'node:os';

const PORT = 8787;
let box = { anchor: [], walker: [] };

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const m = url.pathname.match(/^\/signal\/(anchor|walker)$/);
    if (url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(readFileSync(new URL('./index.html', import.meta.url)));
    }
    if (url.pathname === '/reset' && req.method === 'POST') {
      box = { anchor: [], walker: [] };
      return res.end('ok');
    }
    if (m && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        box[m[1]].push(body);
        res.end('ok');
      });
      return;
    }
    if (m && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(box[m[1]].splice(0)));
    }
    res.writeHead(404).end();
  })
  .listen(PORT, '0.0.0.0', () => {
    const ips = Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal)
      .map((i) => i.address);
    console.log('PROTOTYPE Wi-Fi pair test. Open one of these on BOTH devices (same Wi-Fi):');
    ips.forEach((ip) => console.log(`  http://${ip}:${PORT}`));
  });
