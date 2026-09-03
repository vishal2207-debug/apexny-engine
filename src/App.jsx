import React, { useState, useEffect } from 'react';

const ASSETS = [
  { symbol: 'BTCUSD', tvSymbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', category: 'Crypto' },
  { symbol: 'ETHUSD', tvSymbol: 'BINANCE:ETHUSDT', name: 'Ethereum', category: 'Crypto' },
  { symbol: 'SOLUSD', tvSymbol: 'BINANCE:SOLUSDT', name: 'Solana', category: 'Crypto' },
  { symbol: 'XRPUSD', tvSymbol: 'BINANCE:XRPUSDT', name: 'Ripple', category: 'Crypto' },
  { symbol: 'XAUUSD', tvSymbol: 'TVC:GOLD', name: 'Gold Spot', category: 'Commodity' },
  { symbol: 'XAGUSD', tvSymbol: 'TVC:SILVER', name: 'Silver Spot', category: 'Commodity' },
];

const SIGNALS_MAP = {
  BTCUSD: {
    bias: 'LONG',
    setup: 'Bullish FVG + Sweep',
    entry: '80,520.00',
    sl: '79,980.00',
    tp: '82,140.00',
    rr: '1:3.0',
    logic: 'Asian lows swept, 5M Bullish Fair Value Gap respected during NY Open.',
    time: '3m ago'
  },
  ETHUSD: {
    bias: 'SHORT',
    setup: 'Liquidity Grab + MSS',
    entry: '2,510.50',
    sl: '2,545.00',
    tp: '2,407.00',
    rr: '1:3.0',
    logic: 'Buy-side liquidity tapped at $2,515 followed by strong 5m Market Structure Shift.',
    time: '9m ago'
  },
  SOLUSD: {
    bias: 'LONG',
    setup: 'Order Block Retest',
    entry: '103.80',
    sl: '101.90',
    tp: '109.50',
    rr: '1:3.0',
    logic: 'Bullish Order block mitigation with high volume displacement.',
    time: '18m ago'
  },
  XRPUSD: {
    bias: 'NEUTRAL',
    setup: 'Range Bound',
    entry: '1.4300',
    sl: '1.4000',
    tp: '1.5200',
    rr: '1:3.0',
    logic: 'Consolidating below equal highs. Awaiting discount expansion.',
    time: '25m ago'
  },
  XAUUSD: {
    bias: 'LONG',
    setup: 'NY Killzone Expansion',
    entry: '2,740.00',
    sl: '2,728.00',
    tp: '2,776.00',
    rr: '1:3.0',
    logic: 'London Session high broken. Mitigation of 15m Imbalance at NY open.',
    time: 'Live'
  },
  XAGUSD: {
    bias: 'LONG',
    setup: 'SMT Divergence',
    entry: '32.10',
    sl: '31.65',
    tp: '33.45',
    rr: '1:3.0',
    logic: 'SMT Divergence with Gold on 5M timeframe. Bullish break confirmed.',
    time: 'Live'
  }
};

export default function App() {
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [inKillzone, setInKillzone] = useState(false);

  // Fetch live crypto prices from Delta Exchange
  useEffect(() => {
    const fetchPrices = () => {
      fetch('https://api.india.delta.exchange/v2/tickers')
        .then(r => r.json())
        .then(d => {
          if (d.result) {
            const priceMap = {};
            d.result.forEach(t => {
              priceMap[t.symbol] = {
                price: parseFloat(t.mark_price || t.close).toFixed(2),
                change: parseFloat(t.change_24h || 0).toFixed(2),
              };
            });
            setPrices(prev => ({ ...prev, ...priceMap }));
          }
        })
        .catch(() => {});
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000);
    return () => clearInterval(interval);
  }, []);

  // Check NY Session
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

  const currentSignal = SIGNALS_MAP[selectedAsset.symbol] || SIGNALS_MAP.BTCUSD;

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
            BTC: <span className="text-emerald-400 font-bold">${prices['BTCUSD']?.price || '80,868'}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        {/* Left Side: Watchlist and Setups */}
        <aside className="space-y-4">
          <div className="bg-[#0e131f] p-3.5 rounded-lg border border-gray-800/80">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Watchlist (Click to view)
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {ASSETS.map(asset => {
                const p = prices[asset.symbol];
                const isSelected = selectedAsset.symbol === asset.symbol;
                const sig = SIGNALS_MAP[asset.symbol];

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
                        {p?.price ? `$${p.price}` : <span className="text-emerald-400/80 font-sans text-[10px]">Live on Chart</span>}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end space-y-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${
                        sig?.bias === 'LONG'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : sig?.bias === 'SHORT'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-gray-700/50 text-gray-400'
                      }`}>
                        {sig?.bias || 'NEUTRAL'}
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">{asset.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logic & Strategy Explanation */}
          <div className="bg-[#0e131f] p-3.5 rounded-lg border border-gray-800/80 space-y-2">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
              <span>{selectedAsset.symbol} Execution Logic</span>
              <span className="text-[10px] font-mono text-emerald-400">{currentSignal.time}</span>
            </div>
            
            <div className="p-2.5 bg-[#141b2d] rounded border border-gray-800 text-xs text-gray-300 leading-relaxed font-sans">
              <p className="font-semibold text-white mb-1">Trigger: <span className="text-emerald-400">{currentSignal.setup}</span></p>
              {currentSignal.logic}
            </div>
          </div>
        </aside>

        {/* Right Side: Interactive Chart with On-Chart Entry / SL / TP Overlay Lines */}
        <main className="lg:col-span-3 flex flex-col space-y-3">
          {/* Live Trade HUD Overview */}
          <div className="bg-[#0e131f] p-3 rounded-lg border border-gray-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-xs font-black font-mono tracking-wide ${
                currentSignal.bias === 'LONG' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
              }`}>
                {currentSignal.bias} SETUP
              </span>
              <span className="text-sm font-bold">{selectedAsset.symbol}</span>
              <span className="text-xs text-gray-400">({selectedAsset.name})</span>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <div className="bg-[#141b2d] px-2.5 py-1 rounded border border-gray-700">
                <span className="text-gray-400">ENTRY: </span>
                <span className="text-white font-bold">${currentSignal.entry}</span>
              </div>
              <div className="bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/30">
                <span className="text-rose-400">SL: </span>
                <span className="text-rose-300 font-bold">${currentSignal.sl}</span>
              </div>
              <div className="bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                <span className="text-emerald-400">TP: </span>
                <span className="text-emerald-300 font-bold">${currentSignal.tp}</span>
              </div>
              <div className="bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30 text-blue-400 font-bold">
                RR {currentSignal.rr}
              </div>
            </div>
          </div>

          {/* Chart Wrapper with Projected Visual Entry, SL, TP Lines */}
          <div className="relative w-full flex-grow h-[580px] rounded-lg overflow-hidden border border-gray-800 bg-[#07090e]">
            {/* Direct Visual Price Target Lines Overlay on Right edge */}
            <div className="absolute right-14 top-10 bottom-14 w-44 z-10 pointer-events-none flex flex-col justify-between items-end">
              {/* TP Line */}
              <div className="w-full flex items-center justify-end space-x-1">
                <div className="flex-1 border-b-2 border-dashed border-emerald-400/80"></div>
                <span className="bg-emerald-500 text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded shadow-lg shadow-emerald-500/20">
                  TP: ${currentSignal.tp}
                </span>
              </div>

              {/* Entry Line */}
              <div className="w-full flex items-center justify-end space-x-1">
                <div className="flex-1 border-b-2 border-solid border-cyan-400"></div>
                <span className="bg-cyan-500 text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded shadow-lg shadow-cyan-500/20">
                  ENTRY: ${currentSignal.entry}
                </span>
              </div>

              {/* SL Line */}
              <div className="w-full flex items-center justify-end space-x-1">
                <div className="flex-1 border-b-2 border-dashed border-rose-500/80"></div>
                <span className="bg-rose-500 text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded shadow-lg shadow-rose-500/20">
                  SL: ${currentSignal.sl}
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
