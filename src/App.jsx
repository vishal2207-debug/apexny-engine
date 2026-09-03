import React, { useState, useEffect } from 'react';

const ASSETS = [
  { symbol: 'BTCUSD', tvSymbol: 'BINANCE:BTCUSDT', name: 'Bitcoin' },
  { symbol: 'ETHUSD', tvSymbol: 'BINANCE:ETHUSDT', name: 'Ethereum' },
  { symbol: 'SOLUSD', tvSymbol: 'BINANCE:SOLUSDT', name: 'Solana' },
  { symbol: 'XRPUSD', tvSymbol: 'BINANCE:XRPUSDT', name: 'Ripple' },
];

export default function App() {
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [nyStatus, setNyStatus] = useState({ isOpen: false, text: 'Checking Killzone...' });
  const [signals, setSignals] = useState([]);

  // Fetch live market tickers from Delta Exchange
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
            setPrices(priceMap);
          }
        })
        .catch(() => {});
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000);
    return () => clearInterval(interval);
  }, []);

  // Monitor NY Session / Killzone (13:30 - 20:00 UTC)
  useEffect(() => {
    const checkNY = () => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      const timeVal = utcHours + utcMinutes / 60;

      // NY Killzone typically 13:30 to 20:00 UTC (7:00 PM to 1:30 AM IST)
      const inKillzone = timeVal >= 13.5 && timeVal <= 20.0;
      setNyStatus({
        isOpen: inKillzone,
        text: inKillzone ? '?? NY Killzone Active (High Volatility)' : '?? Outside NY Killzone (Asia/London Range)',
      });

      // Sample Engine Signal updates
      setSignals([
        {
          symbol: 'BTCUSD',
          type: 'BULLISH FVG',
          zone: '$80,450 - $80,600',
          bias: 'LONG',
          status: 'Confirmed',
          time: '5m ago'
        },
        {
          symbol: 'ETHUSD',
          type: 'LIQUIDITY SWEEP',
          zone: '$2,480 Highs',
          bias: 'SHORT',
          status: 'Watching',
          time: '12m ago'
        }
      ]);
    };

    checkNY();
    const timer = setInterval(checkNY, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#07090e] text-white p-4 font-sans">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center pb-4 border-b border-gray-800 gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
          <h1 className="text-xl font-bold tracking-wider text-emerald-400">? ApexNY Engine</h1>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">ICT / SMC Pro</span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className={`px-2.5 py-1 rounded border ${nyStatus.isOpen ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
            {nyStatus.text}
          </div>
          <div>
            BTC: <span className="text-emerald-400 font-bold">${prices['BTCUSD']?.price || '80,883'}</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        {/* Left Column: Watchlist & Live Signals */}
        <aside className="space-y-4">
          {/* Watchlist */}
          <div className="bg-[#0e131f] p-4 rounded-lg border border-gray-800/80">
            <h2 className="text-xs font-semibold text-gray-400 tracking-wider mb-3">WATCHLIST (CLICK TO SWITCH)</h2>
            <div className="space-y-2">
              {ASSETS.map(asset => {
                const p = prices[asset.symbol];
                const isSelected = selectedAsset.symbol === asset.symbol;
                return (
                  <div
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-3 rounded border cursor-pointer transition flex justify-between items-center ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-[#141b2d] border-gray-800 hover:border-gray-700 text-gray-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        {asset.symbol}
                        <span className="text-[10px] text-gray-400 font-normal">({asset.name})</span>
                      </div>
                      <div className="text-xs font-mono mt-0.5">
                        ${p?.price || 'Loading...'}
                      </div>
                    </div>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      parseFloat(p?.change || 0) >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                    }`}>
                      {p?.change ? `${p.change}%` : 'LIVE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Signals Engine */}
          <div className="bg-[#0e131f] p-4 rounded-lg border border-gray-800/80">
            <h2 className="text-xs font-semibold text-gray-400 tracking-wider mb-3 flex items-center justify-between">
              <span>ALGO SIGNALS</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <div className="space-y-2.5">
              {signals.map((sig, idx) => (
                <div key={idx} className="p-2.5 bg-[#141b2d] rounded border border-gray-800 text-xs space-y-1">
                  <div className="flex justify-between items-center font-bold">
                    <span>{sig.symbol} - {sig.type}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${sig.bias === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {sig.bias}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 flex justify-between">
                    <span>Zone: {sig.zone}</span>
                    <span className="text-gray-500">{sig.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column: Dynamic TradingView Chart & Details */}
        <main className="lg:col-span-3 flex flex-col space-y-4">
          <div className="bg-[#0e131f] p-4 rounded-lg border border-gray-800/80 flex flex-col flex-grow">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-bold">
                  {selectedAsset.symbol}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {selectedAsset.name} / US Dollar • 5M Resolution
                </span>
              </div>
              <span className="text-xs text-emerald-400 font-mono">
                Live Price: ${prices[selectedAsset.symbol]?.price || '...'}
              </span>
            </div>

            {/* TradingView Dynamic Iframe Container */}
            <div className="w-full h-[540px] rounded overflow-hidden border border-gray-800 bg-[#07090e]">
              <iframe
                key={selectedAsset.tvSymbol}
                title="TradingView"
                className="w-full h-full border-0"
                src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(selectedAsset.tvSymbol)}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata&studies=%5B%5D&hide_side_toolbar=0&allow_symbol_change=1&save_image=0`}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
