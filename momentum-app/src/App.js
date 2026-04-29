import { useState } from 'react';
import { T, mono, muted } from './theme';
import { Btn, Inp } from './components/UI';
import ScreenerTab  from './components/ScreenerTab';
import SignalTab    from './components/SignalTab';
import BacktestTab  from './components/BacktestTab';
import PortfolioTab from './components/PortfolioTab';

const TABS = [
  { id: 'screener',  label: '01 · Screener'  },
  { id: 'signal',    label: '02 · Signal'    },
  { id: 'backtest',  label: '03 · Backtest'  },
  { id: 'portfolio', label: '04 · Portfolio' },
];

const STORED_KEY = 'momentum_av_key';

export default function App() {
  const [tab,       setTab]       = useState('signal');
  const [sigTicker, setSigTicker] = useState('NVDA');
  const [portfolio, setPortfolio] = useState({ cash: 20000, initialCash: 20000, positions: {}, closed: [] });
  const [apiKey,    setApiKey]    = useState(() => localStorage.getItem(STORED_KEY) || '');
  const [keyInput,  setKeyInput]  = useState('');
  const [keySet,    setKeySet]    = useState(() => !!localStorage.getItem(STORED_KEY));

  const saveKey = () => {
    if (!keyInput.trim()) return;
    localStorage.setItem(STORED_KEY, keyInput.trim());
    setApiKey(keyInput.trim());
    setKeySet(true);
  };

  const handleSelect    = t => { setSigTicker(t); setTab('signal'); };
  const handleAddPortfolio = pos => {
    setPortfolio(p => {
      if (pos.entry * pos.shares > p.cash) { alert('Insufficient cash'); return p; }
      return {
        ...p,
        cash: +(p.cash - pos.entry * pos.shares).toFixed(2),
        positions: {
          ...p.positions,
          [pos.ticker]: {
            ticker: pos.ticker, entry: pos.entry, shares: pos.shares,
            stop: pos.stop, target: pos.target, cost: pos.entry * pos.shares,
            notes: 'Signal', date: new Date().toISOString().slice(0, 10),
          },
        },
      };
    });
    setTab('portfolio');
  };

  // ── API Key gate ──────────────────────────────────────────────────────────
  if (!keySet) {
    return (
      <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 8, height: 8, background: T.green, borderRadius: '50%', boxShadow: `0 0 8px ${T.green}` }} />
            <span style={{ fontWeight: 700, letterSpacing: '0.08em', fontFamily: T.mono, fontSize: 14 }}>
              <span style={{ color: T.green }}>MOMENTUM</span><span style={{ color: T.muted }}>SYS</span>
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#c8d4e8', marginBottom: 8 }}>Enter your API key</div>
          <div style={{ color: T.muted, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            This app uses the{' '}
            <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noreferrer"
              style={{ color: T.blue }}>Alpha Vantage API</a>{' '}
            for live stock data. Your free key allows 25 requests/day.
            The key is stored only in your browser's localStorage.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Inp value={keyInput} onChange={setKeyInput} placeholder="Paste your AV key here"
              style={{ flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && saveKey()} />
            <Btn onClick={saveKey} style={{ background: 'rgba(0,212,170,0.1)', borderColor: 'rgba(0,212,170,0.3)', color: T.green }}>
              Save →
            </Btn>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: T.muted }}>
            Get a free key at{' '}
            <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noreferrer"
              style={{ color: T.blue }}>alphavantage.co/support</a>
          </div>
        </div>
      </div>
    );
  }

  // ── Main App ──────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, color: T.text, minHeight: '100vh', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 14 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: ${T.dim}; }
        select option { background: ${T.card}; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 2px; }
        a { color: ${T.blue}; }
      `}</style>

      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, background: T.green, borderRadius: '50%', boxShadow: `0 0 6px ${T.green}` }} />
          <span style={{ fontWeight: 700, letterSpacing: '0.06em', fontFamily: T.mono, fontSize: 13 }}>
            <span style={{ color: T.green }}>MOMENTUM</span>
            <span style={{ color: T.muted }}>SYS</span>
            <span style={{ color: T.dim, marginLeft: 8, fontWeight: 400 }}>v1.0</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono }}>AV · {apiKey.slice(0, 8)}***</span>
          <button onClick={() => { localStorage.removeItem(STORED_KEY); setKeySet(false); setApiKey(''); setKeyInput(''); }}
            style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 11 }}>
            Change Key
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, paddingLeft: 20, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'transparent', border: 'none',
            borderBottom: `2px solid ${tab === t.id ? T.green : 'transparent'}`,
            color: tab === t.id ? T.green : T.muted,
            padding: '10px 14px', cursor: 'pointer',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            fontFamily: T.mono, marginBottom: -1, whiteSpace: 'nowrap',
            transition: 'color 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '18px 20px', maxWidth: 880, margin: '0 auto' }}>
        {tab === 'screener'  && <ScreenerTab  apiKey={apiKey} onSelect={handleSelect} />}
        {tab === 'signal'    && <SignalTab    apiKey={apiKey} initTicker={sigTicker} onAddPortfolio={handleAddPortfolio} />}
        {tab === 'backtest'  && <BacktestTab  apiKey={apiKey} />}
        {tab === 'portfolio' && <PortfolioTab apiKey={apiKey} portfolio={portfolio} setPortfolio={setPortfolio} />}
      </div>
    </div>
  );
}
