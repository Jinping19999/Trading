// ── Math Helpers ─────────────────────────────────────────────────────────────

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const fmtUSD = n => `$${Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtPct = n => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export function calcEMA(arr, p) {
  if (arr.length < p) return arr.map(() => null);
  const k = 2 / (p + 1), r = new Array(arr.length).fill(null);
  r[p - 1] = arr.slice(0, p).reduce((a, b) => a + b) / p;
  for (let i = p; i < arr.length; i++) r[i] = arr[i] * k + r[i - 1] * (1 - k);
  return r;
}

export function calcRSI(c, p = 14) {
  const r = new Array(c.length).fill(null);
  if (c.length < p + 1) return r;
  let ag = 0, al = 0;
  for (let i = 1; i <= p; i++) { const d = c[i] - c[i - 1]; d > 0 ? ag += d : al -= d; }
  ag /= p; al /= p;
  r[p] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = p + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    ag = (ag * (p - 1) + Math.max(d, 0)) / p;
    al = (al * (p - 1) + Math.max(-d, 0)) / p;
    r[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return r;
}

export function calcMACD(c, f = 12, s = 26, sg = 9) {
  const e12 = calcEMA(c, f), e26 = calcEMA(c, s);
  const ml = c.map((_, i) => e12[i] != null && e26[i] != null ? e12[i] - e26[i] : null);
  const sl = calcEMA(ml.map(v => v ?? 0), sg);
  return { macd: ml, signal: sl, hist: ml.map((v, i) => v != null ? v - sl[i] : null) };
}

export function calcATR(H, L, C, p = 14) {
  const tr = [];
  for (let i = 1; i < C.length; i++)
    tr.push(Math.max(H[i] - L[i], Math.abs(H[i] - C[i - 1]), Math.abs(L[i] - C[i - 1])));
  const r = new Array(C.length).fill(null);
  if (tr.length < p) return r;
  let a = tr.slice(0, p).reduce((x, y) => x + y) / p; r[p] = a;
  for (let i = p; i < tr.length; i++) { a = (a * (p - 1) + tr[i]) / p; r[i + 1] = a; }
  return r;
}

// ── Alpha Vantage API ─────────────────────────────────────────────────────────

const AV_BASE = 'https://www.alphavantage.co/query';

export async function avFetch(ticker, apiKey, full = false) {
  const url = `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker.toUpperCase())}&outputsize=${full ? 'full' : 'compact'}&apikey=${apiKey}`;
  const res = await fetch(url);
  const d = await res.json();
  if (d.Information || d.Note) throw new Error('Rate limited — wait 60s and try again');
  if (!d['Time Series (Daily)']) throw new Error(`No data found for ${ticker}`);
  const ts = d['Time Series (Daily)'], dates = Object.keys(ts).sort();
  return {
    ticker: ticker.toUpperCase(), dates,
    opens:  dates.map(d => +ts[d]['1. open']),
    highs:  dates.map(d => +ts[d]['2. high']),
    lows:   dates.map(d => +ts[d]['3. low']),
    closes: dates.map(d => +ts[d]['4. close']),
    vols:   dates.map(d => +ts[d]['5. volume']),
  };
}

export async function avQuote(ticker, apiKey) {
  const res = await fetch(`${AV_BASE}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`);
  const d = await res.json();
  const q = d['Global Quote'];
  if (!q || !q['05. price']) return null;
  return { price: +q['05. price'], changePct: parseFloat(q['10. change percent']) };
}

// ── Build Analysis ─────────────────────────────────────────────────────────────

export function buildAnalysis(data) {
  const { closes: C, highs: H, lows: L, vols: V, dates: D } = data;
  const n = C.length;
  if (n < 60) return null;
  const e21 = calcEMA(C, 21), e50 = calcEMA(C, 50), rsiA = calcRSI(C, 14);
  const { macd: ml, signal: sl, hist: hl } = calcMACD(C);
  const atrA = calcATR(H, L, C, 14);
  const p = C[n - 1], e21v = e21[n - 1], e50v = e50[n - 1], rsiV = rsiA[n - 1] ?? 0;
  const hv = hl[n - 1] ?? 0, mv = ml[n - 1] ?? 0, sv = sl[n - 1] ?? 0;
  const mp = ml[n - 2] ?? 0, sp = sl[n - 2] ?? 0;
  const vol20 = V.slice(n - 21, n - 1).reduce((a, b) => a + b) / 20;
  const volR = V[n - 1] / vol20;
  const res = Math.max(...C.slice(Math.max(0, n - 22), n - 2));
  const atrV = atrA[n - 1] ?? p * 0.02;
  const stop = Math.max(p * 0.93, p - 2 * atrV), risk = p - stop;

  const criteria = {
    breakout: { pass: p > res * 1.005, label: 'Breakout',  val: `$${p.toFixed(2)} vs $${res.toFixed(2)}` },
    volume:   { pass: volR >= 1.5,      label: 'Volume',    val: `${volR.toFixed(2)}× avg` },
    trend:    { pass: p > e21v && e21v > e50v, label: 'EMA Trend', val: `P > EMA21 > EMA50` },
    rsi:      { pass: rsiV >= 55 && rsiV <= 78, label: 'RSI(14)', val: rsiV.toFixed(1) },
    macd:     { pass: hv > 0 || (mv > sv && mp <= sp), label: 'MACD', val: hv > 0 ? `Hist +${hv.toFixed(3)}` : (mv > sv && mp <= sp) ? 'Cross ✓' : 'Negative' },
  };
  const passCount = Object.values(criteria).filter(c => c.pass).length;

  const chart = C.slice(-60).map((c, i) => ({
    date: D[n - 60 + i]?.slice(5),
    close: +c.toFixed(2),
    ema21: e21[n - 60 + i] ? +e21[n - 60 + i].toFixed(2) : null,
    ema50: e50[n - 60 + i] ? +e50[n - 60 + i].toFixed(2) : null,
  }));

  const pats = [];
  const last8 = C.slice(-8), prev15 = C.slice(-23, -8);
  const poleG = (prev15[prev15.length - 1] - prev15[0]) / prev15[0];
  const flagR = (Math.max(...last8) - Math.min(...last8)) / Math.min(...last8);
  if (poleG > 0.08 && flagR < 0.06) pats.push({ name: 'Bull Flag', conf: poleG > 0.12 && flagR < 0.04 ? 'High' : 'Medium' });
  const b20 = (Math.max(...C.slice(-20)) - Math.min(...C.slice(-20))) / Math.min(...C.slice(-20));
  if (b20 < 0.07) pats.push({ name: 'Tight Base', conf: b20 < 0.04 ? 'High' : 'Medium' });

  return {
    ticker: data.ticker, p, e21v, e50v, rsiV, volR, atrV, res, stop, risk,
    t2r: p + 2 * risk, t3r: p + 3 * risk, beLevel: p * 1.10, trailLevel: p * 1.15,
    criteria, passCount, allPass: passCount === 5, stopPct: (risk / p * 100),
    riskPerShare: risk, chart, pats, vol20, volToday: V[n - 1],
  };
}

// ── Backtest Engine ───────────────────────────────────────────────────────────

export function backtestData(data, startEq = 20000, riskPct = 0.01) {
  const { closes: C, highs: H, lows: L, vols: V, dates: D } = data;
  const n = C.length;
  if (n < 100) return null;
  const e21 = calcEMA(C, 21), e50 = calcEMA(C, 50), rsiA = calcRSI(C, 14);
  const { macd: ml, signal: sl, hist: hl } = calcMACD(C);
  const atrA = calcATR(H, L, C, 14);
  let eq = startEq, blocked = -1;
  const trades = [], curve = [{ date: D[60], equity: eq }];

  for (let i = 61; i < n - 1; i++) {
    if (i <= blocked) continue;
    const p = C[i], e21v = e21[i] ?? p, e50v = e50[i] ?? 0, rsiV = rsiA[i] ?? 0;
    const hv = hl[i] ?? 0, mv = ml[i] ?? 0, sv = sl[i] ?? 0;
    const mp = ml[i - 1] ?? 0, sp2 = sl[i - 1] ?? 0;
    const vol20 = V.slice(Math.max(0, i - 20), i).reduce((a, b) => a + b) / 20;
    const res = Math.max(...C.slice(Math.max(0, i - 21), i - 1));
    const atrV = atrA[i] ?? p * 0.02;
    const sig = p > res * 1.005 && V[i] / vol20 >= 1.5 && p > e21v && e21v > e50v &&
      rsiV >= 55 && rsiV <= 78 && (hv > 0 || (mv > sv && mp <= sp2));
    if (!sig) continue;

    const stopP = Math.max(p * 0.93, p - 2 * atrV), riskS = p - stopP, t2r = p + 2 * riskS;
    let curStop = stopP, belowEMA = 0, exitP = null, exitR = null, exitI = i;

    for (let j = i + 1; j < Math.min(i + 21, n); j++) {
      const cl = C[j], hi = H[j], lo = L[j], e = e21[j] ?? cl;
      if (cl >= p * 1.10) curStop = Math.max(curStop, p);
      if (cl >= p * 1.15) curStop = Math.max(curStop, e);
      if (lo <= curStop) { exitP = curStop; exitR = 'Stop Loss'; exitI = j; break; }
      if (hi >= t2r)     { exitP = t2r;    exitR = 'Target 2R'; exitI = j; break; }
      if (cl < e) belowEMA++; else belowEMA = 0;
      if (belowEMA >= 2) { exitP = cl; exitR = 'EMA21 Cross'; exitI = j; break; }
    }
    if (!exitP) { exitI = Math.min(i + 20, n - 1); exitP = C[exitI]; exitR = 'Max Hold'; }

    const ret = (exitP - p) / p * 100, sh = Math.max(1, Math.floor(eq * riskPct / riskS));
    const pnl = sh * (exitP - p);
    eq += pnl; blocked = exitI;
    trades.push({
      entry: D[i], exit: D[exitI], ep: +p.toFixed(2), xp: +exitP.toFixed(2),
      ret: +ret.toFixed(2), pnl: +pnl.toFixed(2), hold: exitI - i, reason: exitR, win: ret > 0,
    });
    curve.push({ date: D[exitI], equity: +eq.toFixed(2) });
  }

  if (!trades.length) return { trades: [], curve, stats: null };
  const wins = trades.filter(t => t.win), losses = trades.filter(t => !t.win);
  let pk = startEq, maxDD = 0;
  for (const t of trades) { const v = t.pnl + pk; if (v > pk) pk = v; const dd = (v - pk) / pk * 100; if (dd < maxDD) maxDD = dd; }
  const rets = trades.map(t => t.ret / 100), avg = rets.reduce((a, b) => a + b) / rets.length;
  const std = Math.sqrt(rets.map(r => (r - avg) ** 2).reduce((a, b) => a + b) / rets.length) || 0.001;
  const avgHold = trades.reduce((a, t) => a + t.hold, 0) / trades.length;
  return {
    trades, curve, stats: {
      n: trades.length, wins: wins.length,
      winRate: +(wins.length / trades.length * 100).toFixed(1),
      avgGain: wins.length ? +(wins.reduce((a, t) => a + t.ret, 0) / wins.length).toFixed(2) : 0,
      avgLoss: losses.length ? +(losses.reduce((a, t) => a + t.ret, 0) / losses.length).toFixed(2) : 0,
      maxDD: +maxDD.toFixed(2),
      sharpe: +(avg / std * Math.sqrt(252 / Math.max(1, avgHold))).toFixed(2),
      totalRet: +((eq - startEq) / startEq * 100).toFixed(2),
      endEq: +eq.toFixed(2), startEq,
      pf: wins.length && losses.length
        ? +(wins.reduce((a, t) => a + t.pnl, 0) / Math.abs(losses.reduce((a, t) => a + t.pnl, 0))).toFixed(2)
        : 999,
    },
  };
}
