import { useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { T, muted, mono } from '../theme';
import { Stat, Btn, Inp, Loading } from './UI';
import { avFetch, backtestData } from '../utils';

export default function BacktestTab({ apiKey }) {
  const [ticker, setTicker] = useState('NVDA');
  const [startEq, setStartEq] = useState('20000');
  const [riskPct, setRiskPct] = useState('1');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    const sym = ticker.toUpperCase().trim();
    if (!sym) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await avFetch(sym, apiKey, true);
      const r = backtestData(data, parseFloat(startEq) || 20000, parseFloat(riskPct) / 100);
      if (!r) throw new Error('Not enough data (need 100+ bars)');
      setResult({ ...r, ticker: sym });
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [ticker, startEq, riskPct, apiKey]);

  const s = result?.stats;

  return (
    <div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>
        Fetches full price history and runs a vectorized backtest.{' '}
        <span style={{ color: T.amber }}>1 API call — may take ~5s.</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Inp value={ticker} onChange={setTicker} placeholder="NVDA"
          style={{ width: 90, textTransform: 'uppercase', fontWeight: 700, ...mono }} />
        <Inp value={startEq} onChange={setStartEq} placeholder="Portfolio $" style={{ width: 120 }} />
        <select value={riskPct} onChange={e => setRiskPct(e.target.value)}
          style={{ background: T.card, border: `1px solid ${T.border2}`, color: T.text, padding: '8px 10px', borderRadius: 6, fontSize: 13 }}>
          <option value="1">Risk 1%</option>
          <option value="2">Risk 2%</option>
        </select>
        <Btn onClick={run} disabled={loading}
          style={{ background: 'rgba(68,136,255,0.1)', borderColor: 'rgba(68,136,255,0.3)', color: T.blue }}>
          {loading ? 'Running...' : 'Run Backtest ↗'}
        </Btn>
      </div>

      {error && <div style={{ color: T.red, padding: '10px 14px', background: 'rgba(255,61,90,0.08)', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      {loading && <Loading text="Fetching full history & simulating trades..." />}

      {s && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 8, marginBottom: 14 }}>
            <Stat label="Trades"       val={s.n} />
            <Stat label="Win Rate"     val={`${s.winRate}%`} col={s.winRate >= 50 ? T.green : T.red} sub={`${s.wins}W / ${s.n - s.wins}L`} />
            <Stat label="Avg Win"      val={`+${s.avgGain}%`} col={T.green} />
            <Stat label="Avg Loss"     val={`${s.avgLoss}%`} col={T.red} />
            <Stat label="Max DD"       val={`${s.maxDD}%`} col={T.red} />
            <Stat label="Sharpe"       val={s.sharpe} col={s.sharpe >= 1 ? T.green : s.sharpe >= 0 ? T.amber : T.red} />
            <Stat label="Prof Factor"  val={s.pf === 999 ? '∞' : s.pf} col={s.pf >= 1.5 ? T.green : T.amber} />
            <Stat label="Total Return" val={`${s.totalRet >= 0 ? '+' : ''}${s.totalRet}%`} col={s.totalRet >= 0 ? T.green : T.red} />
          </div>

          <div style={{ ...muted, marginBottom: 6 }}>
            Equity Curve — ${(parseFloat(startEq) || 20000).toLocaleString()} → ${s.endEq.toLocaleString()}
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={result.curve} margin={{ top: 4, right: 6, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="eqG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={s.totalRet >= 0 ? T.green : T.red} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={s.totalRet >= 0 ? T.green : T.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(result.curve.length / 6)} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`$${v.toLocaleString('en', { minimumFractionDigits: 2 })}`, result.ticker]}
                contentStyle={{ background: T.card, border: `1px solid ${T.border2}`, fontSize: 12 }} />
              <Area type="monotone" dataKey="equity" stroke={s.totalRet >= 0 ? T.green : T.red}
                fill="url(#eqG)" strokeWidth={2} dot={false} name="Equity" />
            </AreaChart>
          </ResponsiveContainer>

          <div style={{ ...muted, marginBottom: 6, marginTop: 14 }}>Trade Log ({result.trades.length} trades)</div>
          <div style={{ overflowX: 'auto', maxHeight: 260, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: T.bg }}>
                <tr style={{ color: T.muted }}>
                  {['Entry Date', 'Exit Date', 'Buy $', 'Sell $', 'Return', 'Hold', 'Exit Reason'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '5px 8px', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.trades.map((t, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '5px 8px', color: T.muted, ...mono, fontSize: 11 }}>{t.entry}</td>
                    <td style={{ padding: '5px 8px', color: T.muted, ...mono, fontSize: 11 }}>{t.exit}</td>
                    <td style={{ padding: '5px 8px', ...mono }}>${t.ep}</td>
                    <td style={{ padding: '5px 8px', ...mono }}>${t.xp}</td>
                    <td style={{ padding: '5px 8px', ...mono, color: t.win ? T.green : T.red, fontWeight: 600 }}>{t.ret >= 0 ? '+' : ''}{t.ret}%</td>
                    <td style={{ padding: '5px 8px', color: T.muted }}>{t.hold}d</td>
                    <td style={{ padding: '5px 8px', color: T.muted, fontSize: 11 }}>{t.win ? '✅' : '❌'} {t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {result && !s && (
        <div style={{ color: T.amber, padding: '12px', fontSize: 13 }}>
          No trades generated. The strategy found no qualifying setups in this dataset.
        </div>
      )}
    </div>
  );
}
