import { T, card, muted, mono } from '../theme';

export function Tag({ pass, label, val }) {
  return (
    <div style={{
      ...card,
      borderColor: pass ? 'rgba(0,212,170,0.25)' : 'rgba(255,61,90,0.25)',
      background: pass ? 'rgba(0,212,170,0.07)' : 'rgba(255,61,90,0.07)',
      padding: '8px 10px',
    }}>
      <div style={{ ...muted, color: pass ? T.green : T.red, marginBottom: 4 }}>{pass ? '✓' : '✗'} {label}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: T.text, ...mono }}>{val}</div>
    </div>
  );
}

export function Stat({ label, val, col, sub }) {
  return (
    <div style={{ ...card }}>
      <div style={{ ...muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: col || T.text, ...mono }}>{val}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Btn({ onClick, disabled, children, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: 'transparent', border: `1px solid ${T.border2}`,
      color: T.text, padding: '8px 16px', borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13,
      fontWeight: 500, opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', ...style,
    }}>{children}</button>
  );
}

export function Inp({ value, onChange, placeholder, style }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        background: T.card, border: `1px solid ${T.border2}`, color: T.text,
        padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none', ...style,
      }} />
  );
}

export function Loading({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '2.5rem', color: T.muted, fontSize: 13 }}>
      <div style={{ fontSize: 22, marginBottom: 8, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</div>
      <div>{text}</div>
    </div>
  );
}

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border2}`, padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
      <div style={{ color: T.muted, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, ...mono }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? `$${p.value.toFixed(2)}` : p.value?.toFixed(2)}
        </div>
      ))}
    </div>
  );
}
