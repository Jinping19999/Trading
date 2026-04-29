import { useState, useCallback } from 'react';
import { T, card, muted, mono } from '../theme';
import { Stat, Btn, Inp } from './UI';
import { avQuote, fmtUSD, fmtPct, sleep } from '../utils';

export default function PortfolioTab({ apiKey, portfolio, setPortfolio }) {
  const [tk, setTk] = useState(''), [ep, setEp] = useState(''), [sh, setSh] = useState('');
  const [sp, setSp] = useState(''), [tg, setTg] = useState(''), [nt, setNt] = useState('');
  const [liveP, setLiveP] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [closeT, setCloseT] = useState(null);
  const [closeP, setCloseP] = useState('');

  const refreshPrices = useCallback(async () => {
    const tks = Object.keys(portfolio.positions);
    if (!tks.length) return;
    setRefreshing(true);
    const prices = {};
    for (const t of tks) {
      try { const q = await avQuote(t, apiKey); if (q) prices[t] = q.price; await sleep(1300); } catch {}
    }
    setLiveP(prices); setRefreshing(false);
  }, [portfolio.positions, apiKey]);

  const addPos = () => {
    if (!tk || !ep || !sh || !sp || !tg) return;
    const e = +ep, s = +sh, stop = +sp, target = +tg, cost = e * s;
    if (cost > portfolio.cash) { alert('Not enough cash'); return; }
    setPortfolio(p => ({
      ...p, cash: +(p.cash - cost).toFixed(2),
      positions: {
        ...p.positions, [tk.toUpperCase()]: {
          ticker: tk.toUpperCase(), entry: e, shares: s, stop, target, cost, notes: nt,
          date: new Date().toISOString().slice(0, 10),
        },
      },
    }));
    setTk(''); setEp(''); setSh(''); setSp(''); setTg(''); setNt('');
  };

  const closePos = (t, xp) => {
    const pos = portfolio.positions[t];
    if (!pos) return;
    const proceeds = xp * pos.shares, pnl = proceeds - pos.cost;
    const { [t]: _, ...rest } = portfolio.positions;
    setPortfolio(p => ({
      ...p, cash: +(p.cash + proceeds).toFixed(2), positions: rest,
      closed: [...p.closed, {
        ...pos, exitPrice: xp, pnl: +pnl.toFixed(2),
        retPct: +((xp - pos.entry) / pos.entry * 100).toFixed(2),
        exitDate: new Date().toISOString().slice(0, 10), win: pnl > 0,
      }],
    }));
    setCloseT(null); setCloseP('');
  };

  const invested = Object.entries(portfolio.positions).reduce((a, [t, pos]) => a + (liveP[t] || pos.entry) * pos.shares, 0);
  const unrealPNL = Object.entries(portfolio.positions).reduce((a, [t, pos]) => a + ((liveP[t] || pos.entry) - pos.entry) * pos.shares, 0);
  const totalVal = portfolio.cash + invested;
  const totalRet = (totalVal - portfolio.initialCash) / portfolio.initialCash * 100;
  const wins = portfolio.closed.filter(t => t.win);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Total Value"   val={`$${totalVal.toLocaleString('en', { maximumFractionDigits: 0 })}`} />
        <Stat label="Cash"          val={`$${portfolio.cash.toLocaleString('en', { maximumFractionDigits: 0 })}`} />
        <Stat label="Invested"      val={`$${invested.toLocaleString('en', { maximumFractionDigits: 0 })}`} sub={`${(invested / Math.max(totalVal, 1) * 100).toFixed(1)}% exp`} />
        <Stat label="Unrealised"    val={unrealPNL >= 0 ? `+$${unrealPNL.toFixed(0)}` : `-$${Math.abs(unrealPNL).toFixed(0)}`} col={unrealPNL >= 0 ? T.green : T.red} />
        <Stat label="Total Return"  val={fmtPct(totalRet)} col={totalRet >= 0 ? T.green : T.red} />
        <Stat label="Win Rate"      val={portfolio.closed.length ? `${(wins.length / portfolio.closed.length * 100).toFixed(0)}%` : '—'} sub={`${portfolio.closed.length} closed`} />
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ ...muted, marginBottom: 10 }}>Add Position</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[{ v: tk, s: setTk, ph: 'Ticker', w: 75 }, { v: ep, s: setEp, ph: 'Entry $', w: 85 },
            { v: sh, s: setSh, ph: 'Shares', w: 75 }, { v: sp, s: setSp, ph: 'Stop $', w: 85 },
            { v: tg, s: setTg, ph: 'Target $', w: 85 }, { v: nt, s: setNt, ph: 'Notes', w: 120 },
          ].map(({ v, s, ph, w }) => <Inp key={ph} value={v} onChange={s} placeholder={ph} style={{ width: w }} />)}
          <Btn onClick={addPos} style={{ background: 'rgba(0,212,170,0.1)', borderColor: 'rgba(0,212,170,0.3)', color: T.green }}>+ Add</Btn>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ ...muted }}>Open Positions ({Object.keys(portfolio.positions).length})</div>
        {Object.keys(portfolio.positions).length > 0 && (
          <Btn onClick={refreshPrices} disabled={refreshing} style={{ fontSize: 11, padding: '4px 10px' }}>
            {refreshing ? 'Refreshing...' : '↻ Live Prices'}
          </Btn>
        )}
      </div>

      {Object.keys(portfolio.positions).length === 0
        ? <div style={{ color: T.muted, fontSize: 13, padding: '20px 0', textAlign: 'center', borderBottom: `1px solid ${T.border}` }}>
            No open positions. Add one above or click "Add to Portfolio" from the Signal tab.
          </div>
        : <div style={{ overflowX: 'auto', marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ color: T.muted }}>
                {['Ticker', 'Date', 'Entry', 'Current', 'Stop', 'Target', 'Shares', 'Unreal P&L', '%', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '5px 8px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{Object.entries(portfolio.positions).map(([t, pos]) => {
                const cp = liveP[t] || pos.entry, unreal = (cp - pos.entry) * pos.shares;
                const upct = (cp - pos.entry) / pos.entry * 100;
                return (
                  <tr key={t} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '7px 8px', fontWeight: 700, color: T.text, ...mono }}>{t}</td>
                    <td style={{ padding: '7px 8px', color: T.muted, fontSize: 11 }}>{pos.date}</td>
                    <td style={{ padding: '7px 8px', ...mono }}>${pos.entry.toFixed(2)}</td>
                    <td style={{ padding: '7px 8px', ...mono, color: cp > pos.entry ? T.green : T.red }}>${cp.toFixed(2)}</td>
                    <td style={{ padding: '7px 8px', ...mono, color: T.red }}>${pos.stop.toFixed(2)}</td>
                    <td style={{ padding: '7px 8px', ...mono, color: T.green }}>${pos.target.toFixed(2)}</td>
                    <td style={{ padding: '7px 8px', ...mono }}>{pos.shares}</td>
                    <td style={{ padding: '7px 8px', ...mono, color: unreal >= 0 ? T.green : T.red, fontWeight: 600 }}>{unreal >= 0 ? '+' : ''}{fmtUSD(unreal)}</td>
                    <td style={{ padding: '7px 8px', ...mono, color: upct >= 0 ? T.green : T.red }}>{fmtPct(upct)}</td>
                    <td style={{ padding: '7px 8px' }}>
                      {closeT === t
                        ? <div style={{ display: 'flex', gap: 5 }}>
                            <Inp value={closeP} onChange={setCloseP} placeholder="Exit $" style={{ width: 72, fontSize: 11, padding: '3px 7px' }} />
                            <Btn onClick={() => closePos(t, parseFloat(closeP) || cp)} style={{ padding: '3px 7px', fontSize: 11, color: T.green }}>OK</Btn>
                            <Btn onClick={() => setCloseT(null)} style={{ padding: '3px 7px', fontSize: 11 }}>✕</Btn>
                          </div>
                        : <Btn onClick={() => { setCloseT(t); setCloseP(cp.toFixed(2)); }} style={{ fontSize: 11, padding: '3px 8px', color: T.red }}>Close</Btn>
                      }
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
      }

      {portfolio.closed.length > 0 && (
        <>
          <div style={{ ...muted, marginBottom: 6 }}>Closed Trades ({portfolio.closed.length})</div>
          <div style={{ overflowX: 'auto', maxHeight: 200, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ color: T.muted }}>
                {['Ticker', 'Entry', 'Exit', 'Buy $', 'Sell $', 'P&L', 'Return'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '5px 8px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{[...portfolio.closed].reverse().map((t, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '5px 8px', fontWeight: 700, ...mono }}>{t.ticker}</td>
                  <td style={{ padding: '5px 8px', color: T.muted, fontSize: 11 }}>{t.date}</td>
                  <td style={{ padding: '5px 8px', color: T.muted, fontSize: 11 }}>{t.exitDate}</td>
                  <td style={{ padding: '5px 8px', ...mono }}>${t.entry.toFixed(2)}</td>
                  <td style={{ padding: '5px 8px', ...mono }}>${t.exitPrice.toFixed(2)}</td>
                  <td style={{ padding: '5px 8px', ...mono, color: t.win ? T.green : T.red, fontWeight: 600 }}>{t.win ? '+' : ''}{fmtUSD(t.pnl)}</td>
                  <td style={{ padding: '5px 8px', ...mono, color: t.win ? T.green : T.red }}>{fmtPct(t.retPct)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ marginTop: 14, fontSize: 11, color: T.muted, padding: '8px 12px', background: 'rgba(255,184,77,0.05)', borderRadius: 6, border: `1px solid rgba(255,184,77,0.12)` }}>
        ⚠️ Portfolio state resets on refresh. Use the Python files for persistent storage in Cowork.
      </div>
    </div>
  );
}
