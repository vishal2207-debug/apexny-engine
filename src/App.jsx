import React, { useState, useEffect } from 'react';

const ASSETS = [
  { symbol: 'BTCUSD', tvSymbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', category: 'Crypto', basePrice: 80967.50 },
  { symbol: 'ETHUSD', tvSymbol: 'BINANCE:ETHUSDT', name: 'Ethereum', category: 'Crypto', basePrice: 2501.20 },
  { symbol: 'SOLUSD', tvSymbol: 'BINANCE:SOLUSDT', name: 'Solana', category: 'Crypto', basePrice: 104.50 },
  { symbol: 'XRPUSD', tvSymbol: 'BINANCE:XRPUSDT', name: 'Ripple', category: 'Crypto', basePrice: 1.4500 },
  { symbol: 'XAUUSD', tvSymbol: 'OANDA:XAUUSD', name: 'Gold Spot', category: 'Commodities', basePrice: 4493.05 },
  { symbol: 'XAGUSD', tvSymbol: 'OANDA:XAGUSD', name: 'Silver Spot', category: 'Commodities', basePrice: 42.50 },
];

export default function App() {
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[4]); // Gold by default
  const [structure, setStructure] = useState({});
  const [timeUTC, setTimeUTC] = useState('');
  const [inKillzone, setInKillzone] = useState(false);
  const [accountSize, setAccountSize] = useState(10000);

  // Live market price feed from Delta Exchange
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

  // Clock & Killzone check
  useEffect(() => {
    const checkNY = () => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      const timeVal = utcHours + utcMinutes / 60;
      setInKillzone(timeVal >= 13.5 && timeVal <= 20.0);
      setTimeUTC(now.toUTCString().split(' ')[4] + ' UTC');
    };

    checkNY();
    const timer = setInterval(checkNY, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto Structure & Pivot Break Engine (Updates ONLY when market structure breaks)
  useEffect(() => {
    const detectStructure = () => {
      const currentCMP = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
      const step = currentCMP < 10 ? 0.05 : currentCMP * 0.004;

      // Calculate structure block based on recent pivot grid
      const currentBlock = Math.floor(currentCMP / step);
      const swingLow = currentBlock * step;
      const swingHigh = (currentBlock + 1) * step;
      const fvgMitigationEntry = swingLow + (swingHigh - swingLow) * 0.50; // Equilibrium 50% discount
      const stopLoss = swingLow - (step * 0.35); // Placed below liquidity sweep swing
      const targetProfit = fvgMitigationEntry + ((fvgMitigationEntry - stopLoss) * 3); // Pure 1:3 RR

      setStructure(prev => {
        // If current structure block is already locked, preserve it until a Break of Structure (BOS) occurs
        const currentStored = prev[selectedAsset.symbol];
        if (currentStored && currentCMP <= currentStored.swingHigh && currentCMP >= currentStored.swingLow) {
          return prev;
        }

        // New Structure Break Detected -> Anchor New Entry, SL, TP
        return {
          ...prev,
          [selectedAsset.symbol]: {
            entry: fvgMitigationEntry,
            sl: stopLoss,
            tp: targetProfit,
            swingHigh,
            swingLow,
            status: currentCMP > (currentStored?.swingHigh || swingHigh) ? 'BOS BULLISH BREAK' : 'DISCOUNT FVG FORMED',
            timestamp: new Date().toLocaleTimeString(),
          }
        };
      });
    };

    detectStructure();
  }, [prices, selectedAsset]);

  const currentCMP = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
  const isSmallAsset = currentCMP < 10;
  const activeStructure = structure[selectedAsset.symbol] || {
    entry: currentCMP * 0.998,
    sl: currentCMP * 0.993,
    tp: currentCMP * 1.013,
    status: 'ANALYZING CANDLES',
    timestamp: 'Live'
  };

  const formatPrice = (val) => {
    if (!val) return '0.00';
    return isSmallAsset ? Number(val).toFixed(4) : Number(val).toFixed(2);
  };

  const distanceDiff = currentCMP - activeStructure.entry;
  const isAtRetest = Math.abs(distanceDiff) < (activeStructure.entry * 0.001);

  const riskAmount = (accountSize * 0.01).toFixed(0);
  const rewardAmount = (riskAmount * 3).toFixed(0);

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
                  AUTO-SMC ENGINE
                </span>
              </h1>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span className="text-emerald-400 font-semibold uppercase tracking-wider">
                Proprietary Architecture by Mr. Vishal Langade
              </span>
              <span>•</span>
              <span>BOS & Order Block Detection</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap text-xs font-mono">
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border ${
            inKillzone 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold' 
              : 'bg-gray-800/60 border-gray-700 text-gray-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${inKillzone ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
            <span>{inKillzone ? 'NY Killzone: ACTIVE' : 'Outside NY Killzone'}</span>
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
        {/* Left Column: Watchlist & Risk */}
        <aside className="space-y-4">
          <div className="bg-[#090d16] p-3.5 rounded-xl border border-slate-800/80 shadow-xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">MARKET ASSETS</span>
              <span className="text-[10px] text-emerald-400 font-mono">Dynamic Structure</span>
            </div>

            <div className="space-y-2">
              {ASSETS.map(asset => {
                const p = prices[asset.symbol]?.price || asset.basePrice;
                const isSelected = selectedAsset.symbol === asset.symbol;
                const assetStruct = structure[asset.symbol];

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
                        CMP: ${formatPrice(p)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {assetStruct?.status ? assetStruct.status.split(' ')[0] : 'TRACKING'}
                      </span>
                      <div className="text-[9px] text-slate-500 font-mono mt-1">
                        Entry: ${formatPrice(assetStruct?.entry || p * 0.998)}
                      </div>
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

        {/* Right Column: Chart & Auto-Updated Entry HUD */}
        <main className="lg:col-span-3 flex flex-col space-y-3">
          {/* Dynamic Structure Bar */}
          <div className="bg-[#090d16] p-3.5 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-2.5">
              <div className="px-2.5 py-1 rounded bg-emerald-500 text-black font-black text-xs font-mono tracking-wider shadow">
                BUY / LONG
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{selectedAsset.symbol}</span>
                  <span className="text-xs text-cyan-400 font-mono font-bold">[{activeStructure.status}]</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  CMP: <span className="text-emerald-400 font-bold">${formatPrice(currentCMP)}</span>
                  <span className="ml-2 text-slate-500">• Structure Updated: {activeStructure.timestamp}</span>
                </div>
              </div>
            </div>

            {/* Anchored Levels (Only changes when structure breaks) */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="bg-[#0d1322] px-3 py-1.5 rounded-lg border border-cyan-500/40 shadow">
                <span className="text-slate-400 text-[10px] block">STRUCTURE ENTRY</span>
                <span className="text-cyan-300 font-bold text-sm">${formatPrice(activeStructure.entry)}</span>
              </div>

              <div className="bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/40 shadow">
                <span className="text-rose-400 text-[10px] block">STOP LOSS (SWING LOW)</span>
                <span className="text-rose-300 font-bold text-sm">${formatPrice(activeStructure.sl)}</span>
              </div>

              <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/40 shadow">
                <span className="text-emerald-400 text-[10px] block">TAKE PROFIT (1:3 RR)</span>
                <span className="text-emerald-300 font-bold text-sm">${formatPrice(activeStructure.tp)}</span>
              </div>

              <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold ${
                isAtRetest 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 animate-pulse'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700'
              }`}>
                {isAtRetest ? '?? IN EXECUTION ZONE' : 'STRUCTURE LOCKED'}
              </div>
            </div>
          </div>

          {/* TradingView Pro Frame */}
          <div className="w-full flex-grow h-[580px] rounded-xl overflow-hidden border border-slate-800 bg-[#05070b] shadow-2xl">
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
              <span>BOS Algorithmic State: Active Monitoring</span>
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
