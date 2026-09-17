/**
 * Kabrak server monitor — géré par PM2, survit aux reboots (pm2 save).
 *
 * Toutes les 60 s, écrit une ligne dans logs/monitor.log :
 *   - Postgres répond ? (connexion TCP 127.0.0.1:5432 + temps de réponse)
 *   - Backend répond ? (GET /api/health + temps + activeConnections)
 *   - Frontend répond ? (GET :3000)
 *   - RAM libre, CPU %, connexions TIME_WAIT
 *
 * En cas d'échec (Postgres, backend ou frontend muet, ou temps > 3 s) :
 *   ligne "ALERT" + capture immédiate des gros processus (tasklist).
 * Toutes les 10 min : capture des gros processus même sans alerte.
 *
 * Lecture seule : aucune commande stop/kill/restart. Zéro impact sur la prod.
 *
 * Lancer :   pm2 start scripts/monitor.js --name kabrak-monitor && pm2 save
 * Lire   :   type C:\kabraksupermarketERP\logs\monitor.log
 * Alertes:   findstr ALERT C:\kabraksupermarketERP\logs\monitor.log
 */
const fs = require('fs');
const os = require('os');
const net = require('net');
const http = require('http');
const path = require('path');
const { execSync } = require('child_process');

const LOG = process.env.MONITOR_LOG || path.join(__dirname, '..', '..', 'logs', 'monitor.log');
const INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS) || 60_000;
const SLOW_MS = Number(process.env.MONITOR_SLOW_MS) || 3_000;
const DETAIL_EVERY = Number(process.env.MONITOR_DETAIL_EVERY) || 10; // itérations
const MAX_LOG_BYTES = 20 * 1024 * 1024;
const PG_HOST = '127.0.0.1', PG_PORT = 5432;
const BACKEND_URL = 'http://127.0.0.1:3001/api/health';
const FRONTEND_URL = 'http://127.0.0.1:3000/';
const IS_WIN = process.platform === 'win32';

fs.mkdirSync(path.dirname(LOG), { recursive: true });

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function rotateIfNeeded() {
  try {
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > MAX_LOG_BYTES) {
      fs.renameSync(LOG, LOG.replace(/\.log$/, '') + '.1.log');
    }
  } catch {}
}

function write(line) {
  rotateIfNeeded();
  fs.appendFileSync(LOG, line + '\n');
}

function tcpCheck(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = net.connect({ host, port });
    const done = (ok, err) => { sock.destroy(); resolve({ ok, ms: Date.now() - start, err }); };
    sock.setTimeout(timeout, () => done(false, 'timeout'));
    sock.once('connect', () => done(true));
    sock.once('error', (e) => done(false, e.code || e.message));
  });
}

function httpCheck(url, timeout = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => { if (body.length < 4096) body += c; });
      res.on('end', () => resolve({ ok: res.statusCode < 500, status: res.statusCode, ms: Date.now() - start, body }));
    });
    req.setTimeout(timeout, () => { req.destroy(); resolve({ ok: false, status: 0, ms: Date.now() - start, err: 'timeout' }); });
    req.on('error', (e) => resolve({ ok: false, status: 0, ms: Date.now() - start, err: e.code || e.message }));
  });
}

function sh(cmd, timeout = 15000) {
  try { return execSync(cmd, { timeout, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); }
  catch { return ''; }
}

function cpuPercent() {
  if (!IS_WIN) return `${(os.loadavg()[0]).toFixed(1)}load`;
  const m = sh('wmic cpu get loadpercentage /value').match(/LoadPercentage=(\d+)/);
  if (m) return `${m[1]}%`;
  // wmic absent (Windows 11 récents) → PowerShell
  const ps = sh('powershell -NoProfile -Command "(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average"').trim();
  return /^\d+/.test(ps) ? `${Math.round(Number(ps))}%` : '?';
}

function timeWaitCount() {
  const out = sh('netstat -ano', 20000);
  return out ? (out.match(/TIME_WAIT/g) || []).length : -1;
}

function bigProcesses(minKB = 150_000) {
  if (!IS_WIN) return sh('ps aux --sort=-%mem | head -12');
  return sh(`tasklist /fi "memusage gt ${minKB}" /fo table /nh`).trim();
}

let iteration = 0;

async function tick() {
  iteration++;
  const [pg, be, fe] = await Promise.all([
    tcpCheck(PG_HOST, PG_PORT),
    httpCheck(BACKEND_URL),
    httpCheck(FRONTEND_URL),
  ]);

  let beInfo = '';
  if (be.ok && be.body) {
    try {
      const h = JSON.parse(be.body);
      beInfo = ` db=${h.database} conns=${h.activeConnections}/${h.maxConnections}`;
    } catch { beInfo = ' (json?)'; }
  }

  const freeMB = Math.round(os.freemem() / 1048576);
  const totalMB = Math.round(os.totalmem() / 1048576);
  const cpu = cpuPercent();
  const tw = timeWaitCount();

  const problems = [];
  if (!pg.ok) problems.push(`PG_DOWN(${pg.err})`);
  else if (pg.ms > SLOW_MS) problems.push(`PG_SLOW(${pg.ms}ms)`);
  if (!be.ok) problems.push(`BACKEND_DOWN(${be.err || be.status})`);
  else if (be.ms > SLOW_MS) problems.push(`BACKEND_SLOW(${be.ms}ms)`);
  if (be.ok && be.body && /"database":"(?!ok)/.test(be.body)) problems.push('DB_NOT_OK');
  if (!fe.ok) problems.push(`FRONTEND_DOWN(${fe.err || fe.status})`);
  if (freeMB < 500) problems.push(`LOW_RAM(${freeMB}MB)`);
  if (tw > 3000) problems.push(`TIME_WAIT_HIGH(${tw})`);

  const tag = problems.length ? `ALERT ${problems.join(' ')}` : 'ok';
  write(
    `${ts()} | ${tag} | pg=${pg.ok ? 'up' : 'DOWN'} ${pg.ms}ms | backend=${be.ok ? be.status : 'DOWN'} ${be.ms}ms${beInfo}` +
    ` | frontend=${fe.ok ? fe.status : 'DOWN'} ${fe.ms}ms | ram=${freeMB}/${totalMB}MB | cpu=${cpu} | time_wait=${tw}`
  );

  if (problems.length || iteration % DETAIL_EVERY === 0) {
    const procs = bigProcesses();
    if (procs) write(`  -- processus > 150MB --\n${procs.split('\n').map((l) => '  ' + l).join('\n')}`);
  }
}

write(`${ts()} | monitor started (pid ${process.pid}, interval ${INTERVAL_MS / 1000}s, log ${LOG})`);
tick().catch((e) => write(`${ts()} | monitor error: ${e.message}`));
setInterval(() => tick().catch((e) => write(`${ts()} | monitor error: ${e.message}`)), INTERVAL_MS);
