# MomentumSYS — Deploy Guide

## Deploy to Vercel (Free, ~2 minutes)

### Option A — Vercel CLI (fastest)
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. In this folder, run:
vercel

# 3. Follow prompts:
#    - Link to existing project? No
#    - Project name: momentum-sys (or anything)
#    - Directory: ./  (default)
#    - Override settings? No
#
# Done! Vercel gives you a live URL like: https://momentum-sys.vercel.app
```

### Option B — GitHub + Vercel UI (easiest if you have GitHub)
```bash
# 1. Create a GitHub repo and push this folder:
git init
git add .
git commit -m "initial"
gh repo create momentum-sys --public --push  # or use GitHub Desktop

# 2. Go to https://vercel.com/new
# 3. Import your GitHub repo
# 4. Click Deploy — done!
```

## Deploy to Netlify (Alternative)
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=build
```

## Run Locally
```bash
npm install
npm start
# Opens at http://localhost:3000
```

## Usage
On first load you'll be asked for your Alpha Vantage API key.
Get one free at: https://www.alphavantage.co/support/#api-key
The key is stored in your browser's localStorage — never sent anywhere except Alpha Vantage.

## File Structure
```
src/
├── App.js              # Main app + API key gate + tab routing
├── utils.js            # All math (EMA, RSI, MACD, ATR) + AV fetch + backtest engine
├── theme.js            # Colors and design tokens
└── components/
    ├── UI.js           # Shared: Tag, Stat, Btn, Inp, Loading, ChartTooltip
    ├── ScreenerTab.js  # Module 1
    ├── SignalTab.js    # Module 2
    ├── BacktestTab.js  # Module 3
    └── PortfolioTab.js # Module 4
```
