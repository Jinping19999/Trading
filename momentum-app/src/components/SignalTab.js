import { useState, useCallback, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { T, card, muted, mono } from '../theme';
import { Tag, Stat, Btn, Inp, Loading, ChartTooltip } from './UI';
import { avFetch, buildAnalysis } from '../utils';

export default function SignalTab({ apiKey, initTicker, onAddPortfolio }) {
  const [ticker, setTicker] = useState(initTicker || 'NVDA');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [portVal, setPortVal] = useState('20000');
  const [riskPct, setRiskPct] = useState('1');

  const go = useCallback(async (t) => {
    const sym = (t || ticker).toUpperCase().trim();
    if (!sym) return;
    setLoading(true); setError(''); setAnalysis(null);
    try {
      const d = await avFetch(sym, apiKey);
      setAnalysis(buildAnalysis(d));
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [ticker, apiKey]);

  useEffect(() => { if (initTicker) { setTicker(initTicker); go(initTicker); } }, [initTicker]);

  const a = analysis;
  const pv = parseFloat(portVal) || 20000;
  const rp = parseFloat(riskPct) / 100;
  const shares = a ? Math.max(1, Math.floor(pv * rp / a.riskPerShare)) : 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Inp value={ticker} onChange={setTicker} placeholder="NVDA"
          style={{ width: 90, textTransform: 'uppercase', fontWeight: 700, ...mono }}
          onKeyDown={e => e.key === 'Enter' && go()} />
        <Inp value={portVal} onChange={setPortVal} placeholder="Portfolio $" style={{ width: 120 }} />
        <select value={riskPct} onChange={e => setRiskPct(e.target.value)}
          style={{ background: T.card, border: `1px solid ${T.border2}`, color: T.text, padding: '8px 10px', borderRadius: 6, fontSize: 13 }}>
          <option value="1">Risk 1%</option>
          <option value="2">Risk 2%</option>
        </select>
        <Btn onClick={() => go()}
          style={{ background: 'rgba(0,212,170,0.1)', borderColor: 'rgba(0,212,170,0.3)', color: T.green }}>
          Analyze ↗
        </Btn>
      </div>

      {error && <div style={{ color: T.red, padding: '10px 14px', background: 'rgba(255,61,90,0.08)', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      {loading && <Loading text="Fetching live data..." />}

      {a && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, ...mono }}>{a.ticker}</span>
              <span style={{ fontSize: 20, ...mono }}>${a.p.toFixed(2)}</span>
            </div>
            <div style={{
              padding: '5px 14px', borderRadius: 4, fontWeight: 700, fontSize: 13,
              background: a.allPass ? 'rgba(0,212,170,0.15)' : a.passCount >= 3 ? 'rgba(255,184,77,0.15)' : 'rgba(255,61,90,0.12)',
              color: a.allPass ? T.green : a.passCount >= 3 ? T.amber : T.red,
            }}>
              {a.allPass ? '▲ BUY SIGNAL' : a.passCount >= 3 ? `◈ WATCH ${a.passCount}/5` : '▼ NO SIGNAL'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, marginBottom: 14 }}>
            {Object.values(a.criteria).map(c => <Tag key={c.label} pass={c.pass} label={c.label} val={c.val} />)}
            <div style={{
              ...card,
              borderColor: a.allPass ? 'rgba(0,212,170,0.3)' : 'rgba(255,61,90,0.25)',
              background: a.allPass ? 'rgba(0,212,170,0.08)' : 'rgba(255,61,90,0.06)',
              padding: '8px 10px',
            }}>
              <div style={{ ...muted, color: a.allPass ? T.green : T.red, marginBottom: 4 }}>{a.allPass ? '✓' : '✗'} Overall</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: a.allPass ? T.green : T.red, ...mono }}>{a.passCount}/5</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 8, marginBottom: 14 }}>
            <Stat label="Entry"     val={`$${a.p.toFixed(2)}`}     sub="current close" />
            <Stat label="Stop Loss" val={`$${a.stop.toFixed(2)}`}  col={T.red}   sub={`-${a.stopPct.toFixed(1)}%`} />
            <Stat label="Target 2R" val={`$${a.t2r.toFixed(2)}`}   col={T.green} sub={`+${((a.t2r / a.p - 1) * 100).toFixed(1)}%`} />
            <Stat label="Target 3R" val={`$${a.t3r.toFixed(2)}`}   col={T.green} sub={`+${((a.t3r / a.p - 1) * 100).toFixed(1)}%`} />
            <Stat label="ATR(14)"   val={`$${a.atrV.toFixed(2)}`}  sub="daily range" />
            <Stat label="EMA21"     val={`$${a.e21v.toFixed(2)}`} />
          </div>

          <div style={{ ...card, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10 }}>
            {[
              { l: 'Shares',        v: shares },
              { l: 'Position $',    v: `$${(shares * a.p).toLocaleString('en', { maximumFractionDigits: 0 })}` },
              { l: '$ at Risk',     v: `$${(pv * rp).toFixed(0)}`, c: T.red },
              { l: 'Portfolio %',   v: `${((shares * a.p) / pv * 100).toFixed(1)}%` },
              { l: 'BE at (+10%)',  v: `$${a.beLevel.toFixed(2)}` },
              { l: 'Trail (+15%)',  v: `$${a.trailLevel.toFixed(2)}` },
            ].map(s => (
              <div key={s.l}>
                <div style={{ ...muted, marginBottom: 3 }}>{s.l}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: s.c || T.text, ...mono }}>{s.v}</div>
              </div>
            ))}
          </div>

          {a.pats.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {a.pats.map(p => (
                <span key={p.name} style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 4,
                  background: p.conf === 'High' ? 'rgba(68,136,255,0.15)' : 'rgba(77,99,128,0.12)',
                  color: p.conf === 'High' ? T.blue : T.muted,
                  border: `1px solid ${p.conf === 'High' ? 'rgba(68,136,255,0.3)' : T.border}`,
                }}>{p.name} · {p.conf}</span>
              ))}
            </div>
          )}

          {a.allPass && (
            <Btn onClick={() => onAddPortfolio({ ticker: a.ticker, entry: a.p, shares, stop: a.stop, target: a.t2r })}
              style={{ marginBottom: 14, background: 'rgba(0,212,170,0.1)', borderColor: 'rgba(0,212,170,0.3)', color: T.green }}>
              + Add to Portfolio
            </Btn>
          )}

          <div style={{ ...muted, marginBottom: 6 }}>60-Day Price Chart</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11, color: T.muted }}>
            {[{ c: '#4488ff', l: 'Close' }, { c: T.amber, l: 'EMA21' }, { c: T.red, l: 'EMA50' }].map(x => (
              <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 2, background: x.c, display: 'inline-block' }} />{x.l}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={a.chart} margin={{ top: 4, right: 6, bottom: 4, left: 0 }}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(a.chart.length / 7)} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={v => `$${v.toFixed(0)}`} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="close" stroke="#4488ff" dot={false} strokeWidth={2} name="Close" />
              <Line type="monotone" dataKey="ema21" stroke={T.amber} dot={false} strokeWidth={1.5} strokeDasharray="4 3" name="EMA21" />
              <Line type="monotone" dataKey="ema50" stroke={T.red} dot={false} strokeWidth={1.5} strokeDasharray="4 3" name="EMA50" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
