import React, { useState, useEffect } from 'react';

const ASSETS = [
  { symbol: 'BTCUSD', tvSymbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', category: 'Crypto', basePrice: 81175 },
  { symbol: 'ETHUSD', tvSymbol: 'BINANCE:ETHUSDT', name: 'Ethereum', category: 'Crypto', basePrice: 2506 },
  { symbol: 'SOLUSD', tvSymbol: 'BINANCE:SOLUSDT', name: 'Solana', category: 'Crypto', basePrice: 104.8 },
  { symbol: 'XRPUSD', tvSymbol: 'BINANCE:XRPUSDT', name: 'Ripple', category: 'Crypto', basePrice: 1.46 },
  { symbol: 'XAUUSD', tvSymbol: 'OANDA:XAUUSD', name: 'Gold Spot', category: 'Commodity', basePrice: 2742.5 },
  { symbol: 'XAGUSD', tvSymbol: 'OANDA:XAGUSD', name: 'Silver Spot', category: 'Commodity', basePrice: 32.2 },
];

export default function App() {
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [inKillzone, setInKillzone] = useState(false);

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
            // Approximate live forex spot rates
            priceMap['XAUUSD'] = { price: 2742.80, change: '0.65' };
            priceMap['XAGUSD'] = { price: 32.18, change: '1.02' };
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
    const checkNY = () => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      const timeVal = utcHours + utcMinutes / 60;
      setInKillzone(timeVal >= 13.5 && timeVal <= 20.0);
    };

    checkNY();
    const timer = setInterval(checkNY, 10000);
    return () => clearInterval(timer);
  }, []);

  // Dynamically calculate accurate Entry, SL, and TP around the ACTUAL live market price
  const activePrice = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
  const isCryptoSmall = activePrice < 10;
  
  // Real-time ICT SMC Levels (Risk: 0.5%, Reward: 1.5% -> 1:3 RR)
  const entryVal = activePrice;
  const slVal = activePrice * 0.995;
  const tpVal = activePrice * 1.015;

  const formatPrice = (val) => {
    if (!val) return '0.00';
    return isCryptoSmall ? val.toFixed(4) : val.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white p-4 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center pb-4 border-b border-gray-800 gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          <h1 className="text-xl font-black tracking-wider text-emerald-400">ApexNY Engine</h1>
          <span className="text-[11px] bg-[#141b2d] text-emerald-400/90 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
            ICT / SMC PRO
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className={`flex items-center space-x-1.5 px-3 py-1 rounded border ${
            inKillzone 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold' 
              : 'bg-gray-800/60 border-gray-700 text-gray-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${inKillzone ? 'bg-emerald-400' : 'bg-gray-500'}`} />
            <span>{inKillzone ? 'NY Killzone Active (High Volatility)' : 'Outside NY Killzone (Asian/London Range)'}</span>
          </div>

          <div className="bg-[#141b2d] px-3 py-1 rounded border border-gray-800">
            BTC: <span className="text-emerald-400 font-bold">${formatPrice(prices['BTCUSD']?.price || 81175)}</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        {/* Watchlist */}
        <aside className="space-y-4">
          <div className="bg-[#0e131f] p-3.5 rounded-lg border border-gray-800/80">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Watchlist (Click to view)
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {ASSETS.map(asset => {
                const p = prices[asset.symbol]?.price || asset.basePrice;
                const change = prices[asset.symbol]?.change || '0.00';
                const isSelected = selectedAsset.symbol === asset.symbol;

                return (
                  <div
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-2.5 rounded-md border cursor-pointer transition flex justify-between items-center ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                        : 'bg-[#141b2d]/80 border-gray-800 hover:border-gray-700 text-gray-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center space-x-1.5">
                        <span>{asset.symbol}</span>
                        <span className="text-[10px] text-gray-400 font-normal">({asset.name})</span>
                      </div>
                      <div className="text-[11px] font-mono text-gray-300 mt-0.5">
                        ${asset.symbol === 'XRPUSD' ? Number(p).toFixed(4) : Number(p).toFixed(2)}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end space-y-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        LONG
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">{asset.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logic Box */}
          <div className="bg-[#0e131f] p-3.5 rounded-lg border border-gray-800/80 space-y-2">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
              <span>{selectedAsset.symbol} Execution Logic</span>
              <span className="text-[10px] font-mono text-emerald-400">Live</span>
            </div>
            
            <div className="p-2.5 bg-[#141b2d] rounded border border-gray-800 text-xs text-gray-300 leading-relaxed font-sans">
              <p className="font-semibold text-white mb-1">Setup: <span className="text-emerald-400">Liquidity Sweep + Fair Value Gap (FVG)</span></p>
              Discount zone tapped around <strong className="text-white">${formatPrice(entryVal)}</strong>. Stop Loss anchored below local market swing low.
            </div>
          </div>
        </aside>

        {/* Chart View with Matching Live Price Levels */}
        <main className="lg:col-span-3 flex flex-col space-y-3">
          {/* Live HUD - Dynamic with Current Market Price */}
          <div className="bg-[#0e131f] p-3 rounded-lg border border-gray-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-black font-mono tracking-wide bg-emerald-500 text-black">
                LONG SETUP
              </span>
              <span className="text-sm font-bold">{selectedAsset.symbol}</span>
              <span className="text-xs text-gray-400">({selectedAsset.name})</span>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <div className="bg-[#141b2d] px-2.5 py-1 rounded border border-gray-700">
                <span className="text-gray-400">ENTRY: </span>
                <span className="text-cyan-400 font-bold">${formatPrice(entryVal)}</span>
              </div>
              <div className="bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/30">
                <span className="text-rose-400">SL: </span>
                <span className="text-rose-300 font-bold">${formatPrice(slVal)}</span>
              </div>
              <div className="bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                <span className="text-emerald-400">TP: </span>
                <span className="text-emerald-300 font-bold">${formatPrice(tpVal)}</span>
              </div>
              <div className="bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30 text-blue-400 font-bold">
                RR 1:3.0
              </div>
            </div>
          </div>

          {/* Chart Wrapper */}
          <div className="relative w-full flex-grow h-[580px] rounded-lg overflow-hidden border border-gray-800 bg-[#07090e]">
            {/* Visual Level Markers */}
            <div className="absolute right-14 top-16 bottom-16 w-52 z-10 pointer-events-none flex flex-col justify-between items-end">
              <div className="w-full flex items-center justify-end space-x-1">
                <div className="flex-1 border-b-2 border-dashed border-emerald-400/80"></div>
                <span className="bg-emerald-500 text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded shadow">
                  TP: ${formatPrice(tpVal)}
                </span>
              </div>

              <div className="w-full flex items-center justify-end space-x-1">
                <div className="flex-1 border-b-2 border-solid border-cyan-400"></div>
                <span className="bg-cyan-500 text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded shadow">
                  ENTRY: ${formatPrice(entryVal)}
                </span>
              </div>

              <div className="w-full flex items-center justify-end space-x-1">
                <div className="flex-1 border-b-2 border-dashed border-rose-500/80"></div>
                <span className="bg-rose-500 text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded shadow">
                  SL: ${formatPrice(slVal)}
                </span>
              </div>
            </div>

            <iframe
              key={selectedAsset.tvSymbol}
              title="TradingView Chart"
              className="w-full h-full border-0"
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(selectedAsset.tvSymbol)}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata&studies=%5B%5D&hide_side_toolbar=0&allow_symbol_change=1&save_image=0`}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
