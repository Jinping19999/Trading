export const T = {
  bg:     '#07080f',
  card:   '#0c1018',
  border: '#161f2e',
  border2:'#1e2d40',
  text:   '#c8d4e8',
  muted:  '#4d6380',
  dim:    '#2a3a50',
  green:  '#00d4aa',
  red:    '#ff3d5a',
  amber:  '#ffb84d',
  blue:   '#4488ff',
  mono:   "'SF Mono','Cascadia Code','Consolas',monospace",
};

export const card = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: '12px 14px',
};

export const muted = {
  color: T.muted,
  fontSize: 11,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

export const mono = { fontFamily: T.mono };
