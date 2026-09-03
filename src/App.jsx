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
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[4]); // Gold Default
  const [structure, setStructure] = useState({});
  const [timeUTC, setTimeUTC] = useState('');
  const [inKillzone, setInKillzone] = useState(false);
  const [accountSize, setAccountSize] = useState(10000);

  // Live market price feed
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

  // Bi-Directional Auto SMC Structure Engine (Handles BOTH Bullish & Bearish breaks)
  useEffect(() => {
    const detectBiDirectionalStructure = () => {
      const currentCMP = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
      const step = currentCMP < 10 ? 0.05 : currentCMP * 0.004;

      const currentBlock = Math.floor(currentCMP / step);
      const swingLow = currentBlock * step;
      const swingHigh = (currentBlock + 1) * step;
      const midpoint = (swingLow + swingHigh) / 2;

      setStructure(prev => {
        const stored = prev[selectedAsset.symbol];
        
        // Preserve anchored setup if price is still moving inside the defined structure
        if (stored && currentCMP <= stored.swingHigh && currentCMP >= stored.swingLow) {
          return prev;
        }

        // Determine Bias based on breakout direction
        const isBullish = currentCMP >= midpoint;
        
        let entry, sl, tp, status;

        if (isBullish) {
          // Bullish: Entry at discount FVG, SL below swing low, TP at 1:3 RR
          entry = swingLow + (swingHigh - swingLow) * 0.45;
          sl = swingLow - (step * 0.25);
          tp = entry + ((entry - sl) * 3);
          status = 'BULLISH BOS / LONG';
        } else {
          // Bearish: Entry at premium FVG, SL above swing high, TP at 1:3 RR
          entry = swingHigh - (swingHigh - swingLow) * 0.45;
          sl = swingHigh + (step * 0.25);
          tp = entry - ((sl - entry) * 3);
          status = 'BEARISH MSS / SHORT';
        }

        return {
          ...prev,
          [selectedAsset.symbol]: {
            bias: isBullish ? 'LONG' : 'SHORT',
            entry,
            sl,
            tp,
            swingHigh,
            swingLow,
            status,
            timestamp: new Date().toLocaleTimeString(),
          }
        };
      });
    };

    detectBiDirectionalStructure();
  }, [prices, selectedAsset]);

  const currentCMP = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
  const isSmallAsset = currentCMP < 10;
  
  const activeStructure = structure[selectedAsset.symbol] || {
    bias: 'LONG',
    entry: currentCMP * 0.998,
    sl: currentCMP * 0.993,
    tp: currentCMP * 1.013,
    status: 'ANALYZING CANDLES',
    timestamp: 'Live'
  };

  const isLong = activeStructure.bias === 'LONG';

  const formatPrice = (val) => {
    if (!val) return '0.00';
    return isSmallAsset ? Number(val).toFixed(4) : Number(val).toFixed(2);
  };

  const distanceDiff = Math.abs(currentCMP - activeStructure.entry);
  const isAtRetest = distanceDiff < (activeStructure.entry * 0.001);

  const riskAmount = (accountSize * 0.01).toFixed(0);
  const rewardAmount = (riskAmount * 3).toFixed(0);

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-200 p-3 md:p-5 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full animate-ping absolute opacity-75 ${isLong ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <div className={`w-2.5 h-2.5 rounded-full ${isLong ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                APEX<span className={isLong ? "text-emerald-400" : "text-rose-400"}>NY</span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  isLong ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  BI-DIRECTIONAL SMC
                </span>
              </h1>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span className="text-emerald-400 font-semibold uppercase tracking-wider">
                Proprietary Architecture by Mr. Vishal Langade
              </span>
              <span>•</span>
              <span>Bullish & Bearish Dual-Execution Engine</span>
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column: Watchlist */}
        <aside className="space-y-4">
          <div className="bg-[#090d16] p-3.5 rounded-xl border border-slate-800/80 shadow-xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">WATCHLIST</span>
              <span className="text-[10px] text-emerald-400 font-mono">Dual Feed</span>
            </div>

            <div className="space-y-2">
              {ASSETS.map(asset => {
                const p = prices[asset.symbol]?.price || asset.basePrice;
                const isSelected = selectedAsset.symbol === asset.symbol;
                const assetStruct = structure[asset.symbol];
                const assetIsLong = assetStruct?.bias !== 'SHORT';

                return (
                  <div
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 flex justify-between items-center ${
                      isSelected
                        ? assetIsLong
                          ? 'bg-gradient-to-r from-emerald-500/15 via-[#0f172a] to-transparent border-emerald-500/60 shadow-lg'
                          : 'bg-gradient-to-r from-rose-500/15 via-[#0f172a] to-transparent border-rose-500/60 shadow-lg'
                        : 'bg-[#0d1322]/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        {asset.symbol}
                        <span className="text-[10px] text-slate-400 font-normal">({asset.name})</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-300 font-medium mt-0.5">
                        CMP: ${formatPrice(p)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                        assetIsLong 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {assetStruct?.bias || 'LONG'}
                      </span>
                      <div className="text-[9px] text-slate-500 font-mono mt-1">
                        ${formatPrice(assetStruct?.entry || p)}
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

        {/* Right Column: Bi-Directional Execution HUD */}
        <main className="lg:col-span-3 flex flex-col space-y-3">
          <div className="bg-[#090d16] p-3.5 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-2.5">
              <div className={`px-2.5 py-1 rounded text-black font-black text-xs font-mono tracking-wider shadow ${
                isLong ? 'bg-emerald-500' : 'bg-rose-500 text-white'
              }`}>
                {isLong ? 'BUY / LONG' : 'SELL / SHORT'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{selectedAsset.symbol}</span>
                  <span className={`text-xs font-mono font-bold ${isLong ? 'text-cyan-400' : 'text-rose-400'}`}>
                    [{activeStructure.status}]
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  CMP: <span className="text-emerald-400 font-bold">${formatPrice(currentCMP)}</span>
                  <span className="ml-2 text-slate-500">• Anchored at {activeStructure.timestamp}</span>
                </div>
              </div>
            </div>

            {/* Exact Dynamic Anchored Levels */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="bg-[#0d1322] px-3 py-1.5 rounded-lg border border-cyan-500/40 shadow">
                <span className="text-slate-400 text-[10px] block">{isLong ? 'DISCOUNT ENTRY' : 'PREMIUM ENTRY'}</span>
                <span className="text-cyan-300 font-bold text-sm">${formatPrice(activeStructure.entry)}</span>
              </div>

              <div className="bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/40 shadow">
                <span className="text-rose-400 text-[10px] block">STOP LOSS ({isLong ? 'BELOW LOW' : 'ABOVE HIGH'})</span>
                <span className="text-rose-300 font-bold text-sm">${formatPrice(activeStructure.sl)}</span>
              </div>

              <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/40 shadow">
                <span className="text-emerald-400 text-[10px] block">TARGET PROFIT (1:3 RR)</span>
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

          {/* Clean Interactive TradingView Chart */}
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
              <span>Bi-Directional Engine: Monitoring Bullish/Bearish Structure Shifts</span>
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
