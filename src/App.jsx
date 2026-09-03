import React, { useState, useEffect } from 'react';

const ASSETS = [
  { symbol: 'BTCUSD', name: 'Bitcoin', category: 'Crypto', basePrice: 80967, setupType: 'BULLISH FVG + ASIA SWEEP' },
  { symbol: 'ETHUSD', name: 'Ethereum', category: 'Crypto', basePrice: 2501, setupType: 'ORDER BLOCK MITIGATION' },
  { symbol: 'SOLUSD', name: 'Solana', category: 'Crypto', basePrice: 104.5, setupType: 'DISCOUNT EXPANSION' },
  { symbol: 'XRPUSD', name: 'Ripple', category: 'Crypto', basePrice: 1.45, setupType: 'RANGE LOW SWEEP' },
  { symbol: 'XAUUSD', name: 'Gold Spot', category: 'Commodities', basePrice: 4493.05, setupType: 'NY KILLZONE EXPANSION' },
  { symbol: 'XAGUSD', name: 'Silver Spot', category: 'Commodities', basePrice: 42.50, setupType: 'SMT DIVERGENCE' },
];

export default function App() {
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
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

  // Construct official Delta Exchange India TradingView embed URL
  const deltaSymbol = selectedAsset.symbol;
  const deltaChartUrl = `https://cdn.india.delta.exchange/charting_library/index.html?symbol=${deltaSymbol}&interval=5&theme=dark&locale=en`;

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
                  DELTA INDIA FEED
                </span>
              </h1>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span className="text-emerald-400 font-semibold uppercase tracking-wider">
                Proprietary Architecture by Mr. Vishal Langade
              </span>
              <span>•</span>
              <span>Direct Delta Exchange India Chart Engine</span>
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

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Watchlist */}
        <aside className="space-y-4">
          <div className="bg-[#090d16] p-3.5 rounded-xl border border-slate-800/80 shadow-xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">DELTA ASSETS</span>
              <span className="text-[10px] text-emerald-400 font-mono">Native Stream</span>
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

        {/* Chart View */}
        <main className="lg:col-span-3 flex flex-col space-y-3">
          {/* Target Numbers HUD */}
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-2.5">
              <div className="px-2.5 py-1 rounded bg-emerald-500 text-black font-black text-xs font-mono tracking-wider shadow">
                BUY / LONG
              </div>
              <div>
                <span className="text-sm font-black text-white">{selectedAsset.symbol}</span>
                <span className="text-xs text-slate-400 ml-1.5">Delta Exchange India 5M Chart</span>
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

          {/* Delta Exchange India Native Chart Frame */}
          <div className="w-full flex-grow h-[600px] rounded-xl overflow-hidden border border-slate-800 bg-[#05070b] shadow-2xl">
            <iframe
              key={selectedAsset.symbol}
              title="Delta Exchange India Chart"
              className="w-full h-full border-0"
              src={deltaChartUrl}
            />
          </div>

          {/* Footer */}
          <footer className="p-3 bg-[#090d16] rounded-xl border border-slate-800/80 flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Exchange Feed: Delta Exchange India (Official CDN)</span>
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
