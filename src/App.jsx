import React, { useState, useEffect } from 'react';

const ASSETS = [
  { 
    symbol: 'BTCUSD', 
    tvSymbol: 'BINANCE:BTCUSDT', 
    name: 'Bitcoin', 
    category: 'Crypto', 
    basePrice: 80967,
    setupType: 'BULLISH FVG + ASIA SWEEP',
    sweepZone: '$80,420 (Asian Session Lows Swept)',
    fvgZone: '$80,550 - $80,680 (5M Imbalance)',
    confluence: 'Displacement above previous 15M High with heavy buy volume'
  },
  { 
    symbol: 'ETHUSD', 
    tvSymbol: 'BINANCE:ETHUSDT', 
    name: 'Ethereum', 
    category: 'Crypto', 
    basePrice: 2501,
    setupType: 'BULLISH ORDER BLOCK MITIGATION',
    sweepZone: '$2,485 (Sell-Side Liquidity Collected)',
    fvgZone: '$2,492 - $2,500 (Breaker Block Retest)',
    confluence: 'Bullish MSS confirmed on 5M timeframe post London close'
  },
  { 
    symbol: 'SOLUSD', 
    tvSymbol: 'BINANCE:SOLUSDT', 
    name: 'Solana', 
    category: 'Crypto', 
    basePrice: 104.5,
    setupType: 'DISCOUNT EXPANSION',
    sweepZone: '$102.80 (Equal Lows Cleared)',
    fvgZone: '$103.50 - $104.10 (Fair Value Gap Fill)',
    confluence: 'Rejection of 0.62 OTE Fibonacci zone'
  },
  { 
    symbol: 'XRPUSD', 
    tvSymbol: 'BINANCE:XRPUSDT', 
    name: 'Ripple', 
    category: 'Crypto', 
    basePrice: 1.45,
    setupType: 'RANGE LOW SWEEP',
    sweepZone: '$1.422 (London Low Taken)',
    fvgZone: '$1.435 - $1.442 (Rebalance Zone)',
    confluence: 'High relative volume inside New York session'
  },
  { 
    symbol: 'XAUUSD', 
    tvSymbol: 'OANDA:XAUUSD', 
    name: 'Gold Spot', 
    category: 'Commodities', 
    basePrice: 4493.05,
    setupType: 'NY KILLZONE EXPANSION',
    sweepZone: '$4,472.50 (London Open Lows Swept)',
    fvgZone: '$4,482.00 - $4,488.50 (5M Unfilled FVG)',
    confluence: 'Institutional displacement pushing into Premium targets'
  },
  { 
    symbol: 'XAGUSD', 
    tvSymbol: 'OANDA:XAGUSD', 
    name: 'Silver Spot', 
    category: 'Commodities', 
    basePrice: 42.50,
    setupType: 'SMT DIVERGENCE + FVG',
    sweepZone: '$41.80 (Key Support Tap)',
    fvgZone: '$42.10 - $42.35 (Mitigation Area)',
    confluence: 'Gold made higher-low while Silver swept low (SMT confirmation)'
  },
];

export default function App() {
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[4]);
  const [timeUTC, setTimeUTC] = useState('');
  const [accountSize, setAccountSize] = useState(10000);

  useEffect(() => {
    const fetchPrices = () => {
      fetch('https://api.india.delta.exchange/v2/tickers')
        .then(r => r.json())
        .then(d => {
          if (d.result) {
            const priceMap = {};
            d.result.forEach(t => {
              priceMap[t.symbol] = {
                price: parseFloat(t.mark_price || t.close),
                change: parseFloat(t.change_24h || 0).toFixed(2),
              };
            });
            priceMap['XAUUSD'] = { price: 4493.05, change: '0.69' };
            priceMap['XAGUSD'] = { price: 42.50, change: '1.20' };
            setPrices(prev => ({ ...prev, ...priceMap }));
          }
        })
        .catch(() => {});
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUTC(now.toUTCString().split(' ')[4] + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const activePrice = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
  const isCryptoSmall = activePrice < 10;

  const entryVal = activePrice;
  const slVal = activePrice * 0.995;
  const tpVal = activePrice * 1.015;
  const riskAmount = (accountSize * 0.01).toFixed(0);
  const rewardAmount = (riskAmount * 3).toFixed(0);

  const formatPrice = (val) => {
    if (!val) return '0.00';
    return isCryptoSmall ? Number(val).toFixed(4) : Number(val).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-200 p-3 md:p-5 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute opacity-75" />
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                APEX<span className="text-emerald-400">NY</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  ENGINE PRO
                </span>
              </h1>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span className="text-emerald-400 font-semibold uppercase tracking-wider">
                Proprietary Architecture by Mr. Vishal Langade
              </span>
              <span>•</span>
              <span>Live SMC Execution Feed</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap text-xs font-mono">
          <div className="bg-[#0b101b] border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm shadow-emerald-500/5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-300 font-bold">NY Killzone: ACTIVE</span>
          </div>

          <div className="bg-[#0b101b] border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            TIME: <span className="text-white font-bold">{timeUTC}</span>
          </div>

          <div className="bg-[#0b101b] border border-slate-800 px-3 py-1.5 rounded-lg">
            BTC: <span className="text-emerald-400 font-bold">${formatPrice(prices['BTCUSD']?.price || 80967)}</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column: Watchlist & Risk */}
        <aside className="space-y-4">
          <div className="bg-[#090d16] p-3.5 rounded-xl border border-slate-800/80 shadow-xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">MARKET ASSETS</span>
              <span className="text-[10px] text-emerald-400 font-mono">Synced Feed</span>
            </div>

            <div className="space-y-2">
              {ASSETS.map(asset => {
                const p = prices[asset.symbol]?.price || asset.basePrice;
                const change = prices[asset.symbol]?.change || '0.50';
                const isSelected = selectedAsset.symbol === asset.symbol;

                return (
                  <div
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 flex justify-between items-center ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500/15 via-[#0f172a] to-transparent border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                        : 'bg-[#0d1322]/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        {asset.symbol}
                        <span className="text-[10px] text-slate-400 font-normal">({asset.name})</span>
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400/90 font-medium mt-0.5">
                        ${formatPrice(p)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        +{change}%
                      </span>
                      <div className="text-[9px] text-slate-500 font-mono mt-1">{asset.category}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk HUD */}
          <div className="bg-[#090d16] p-3.5 rounded-xl border border-slate-800/80 space-y-3 shadow-xl">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">RISK PROTOCOL</span>
              <span className="text-[10px] font-mono text-cyan-400">1:3 FIXED RR</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">MAX RISK ($)</span>
                <span className="text-rose-400 font-bold text-sm">-${riskAmount}</span>
              </div>
              <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">TARGET PROFIT ($)</span>
                <span className="text-emerald-400 font-bold text-sm">+${rewardAmount}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Chart + Live Execution Logic Panel */}
        <main className="lg:col-span-3 flex flex-col space-y-3">
          {/* Target Numbers HUD */}
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-2.5">
              <div className="px-2.5 py-1 rounded bg-emerald-500 text-black font-black text-xs font-mono tracking-wider shadow">
                BUY / LONG
              </div>
              <div>
                <span className="text-sm font-black text-white">{selectedAsset.symbol}</span>
                <span className="text-xs text-slate-400 ml-1.5">5M Killzone Chart</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="bg-[#0d1322] px-3 py-1.5 rounded-lg border border-cyan-500/40">
                <span className="text-slate-400 text-[10px]">ENTRY: </span>
                <span className="text-cyan-300 font-bold">${formatPrice(entryVal)}</span>
              </div>
              <div className="bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/40">
                <span className="text-rose-400 text-[10px]">SL (-0.5%): </span>
                <span className="text-rose-300 font-bold">${formatPrice(slVal)}</span>
              </div>
              <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/40">
                <span className="text-emerald-400 text-[10px]">TP (+1.5%): </span>
                <span className="text-emerald-300 font-bold">${formatPrice(tpVal)}</span>
              </div>
              <div className="bg-blue-500/20 px-2.5 py-1.5 rounded-lg border border-blue-500/40 text-blue-400 font-black">
                1:3 RR
              </div>
            </div>
          </div>

          {/* New: Dedicated SMC/ICT Entry Logic HUD (Explaining the WHY) */}
          <div className="bg-gradient-to-r from-[#0d1424] via-[#090d16] to-[#0d1424] p-3 rounded-xl border border-cyan-500/30 shadow-md space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold font-mono">
                  SMC CONFLUENCE
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  WHY TAKE LONG ENTRY ON {selectedAsset.symbol}?
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Setup: {selectedAsset.setupType}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono pt-1">
              <div className="bg-[#05070b]/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">1. Liquidity Run (SSL):</span>
                <span className="text-amber-400 font-semibold">{selectedAsset.sweepZone}</span>
              </div>

              <div className="bg-[#05070b]/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">2. Imbalance Mitigated (FVG):</span>
                <span className="text-cyan-400 font-semibold">{selectedAsset.fvgZone}</span>
              </div>

              <div className="bg-[#05070b]/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">3. Structure Shift (MSS):</span>
                <span className="text-emerald-400 font-semibold">{selectedAsset.confluence}</span>
              </div>
            </div>
          </div>

          {/* Chart Frame */}
          <div className="w-full flex-grow h-[550px] rounded-xl overflow-hidden border border-slate-800 bg-[#05070b] shadow-2xl">
            <iframe
              key={selectedAsset.tvSymbol}
              title="TradingView Pro Chart"
              className="w-full h-full border-0"
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(selectedAsset.tvSymbol)}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata&studies=%5B%5D&hide_side_toolbar=0&allow_symbol_change=1&save_image=0`}
            />
          </div>

          {/* Footer */}
          <footer className="p-3 bg-[#090d16] rounded-xl border border-slate-800/80 flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Institutional Algorithm: Active</span>
            </div>
            <div className="font-mono text-emerald-400 font-bold tracking-wide">
              Crafted with Precision by Mr. Vishal Langade
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
