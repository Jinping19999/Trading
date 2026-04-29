import { useState, useCallback } from 'react';
import { T, muted, mono } from '../theme';
import { Inp, Btn, Loading } from './UI';
import { avFetch, buildAnalysis, sleep } from '../utils';

export default function ScreenerTab({ apiKey, onSelect }) {
  const [tickers, setTickers] = useState('AAPL,NVDA,MSFT,AMD,META,GOOGL,TSLA,AMZN');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    const list = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 10);
    setLoading(true); setError(''); setResults([]);
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      setProgress(`Scanning ${t} (${i + 1}/${list.length})...`);
      try {
        const data = await avFetch(t, apiKey);
        await sleep(1300);
        const a = buildAnalysis(data);
        if (a) out.push(a);
      } catch (e) {
        if (e.message.includes('Rate')) { setError(e.message); break; }
      }
    }
    out.sort((a, b) => b.passCount - a.passCount);
    setResults(out); setLoading(false); setProgress('');
  }, [tickers, apiKey]);

  return (
    <div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>
        Scan up to 10 tickers against all 5 entry criteria.{' '}
        <span style={{ color: T.amber }}>~1.3s per ticker (free tier rate limit).</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Inp value={tickers} onChange={setTickers} style={{ flex: 1, minWidth: 240 }} placeholder="AAPL,NVDA,MSFT,..." />
        <Btn onClick={run} disabled={loading}
          style={{ background: 'rgba(0,212,170,0.1)', borderColor: 'rgba(0,212,170,0.3)', color: T.green }}>
          {loading ? progress || 'Scanning...' : 'Run Scan ↗'}
        </Btn>
      </div>

      {error && (
        <div style={{ color: T.red, fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(255,61,90,0.08)', borderRadius: 6 }}>
          {error}
        </div>
      )}
      {loading && <Loading text={progress} />}

      {!loading && results.length > 0 && (
        <div>
          <div style={{ ...muted, marginBottom: 10 }}>
            {results.filter(r => r.allPass).length} buy signals · {results.length} scanned
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: T.muted }}>
                  {['Ticker', 'Score', 'Price', 'Break', 'Vol', 'Trend', 'RSI', 'MACD', 'RSI Val', 'Vol×', 'Patterns', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.ticker} style={{ background: r.allPass ? 'rgba(0,212,170,0.04)' : 'transparent', borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: r.allPass ? T.green : T.text, ...mono }}>{r.ticker}</td>
                    <td style={{ padding: '8px', color: T.text, ...mono }}>{r.passCount}/5</td>
                    <td style={{ padding: '8px', ...mono }}>${r.p.toFixed(2)}</td>
                    {['breakout', 'volume', 'trend', 'rsi', 'macd'].map(k => (
                      <td key={k} style={{ padding: '8px', textAlign: 'center', color: r.criteria[k].pass ? T.green : T.red }}>
                        {r.criteria[k].pass ? '✓' : '✗'}
                      </td>
                    ))}
                    <td style={{ padding: '8px', ...mono, color: r.criteria.rsi.pass ? T.green : T.red }}>{r.rsiV.toFixed(1)}</td>
                    <td style={{ padding: '8px', ...mono, color: r.criteria.volume.pass ? T.green : T.red }}>{r.volR.toFixed(2)}×</td>
                    <td style={{ padding: '8px', fontSize: 11, color: T.muted }}>
                      {r.pats.length ? r.pats.map(p => `${p.name}(${p.conf[0]})`).join(' ') : '—'}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Btn onClick={() => onSelect(r.ticker)} style={{ padding: '3px 8px', fontSize: 11 }}>Signal →</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
