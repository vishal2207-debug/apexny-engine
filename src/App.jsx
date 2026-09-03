import React, { useState, useEffect } from 'react';

export default function App() {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    fetch('https://api.india.delta.exchange/v2/tickers')
      .then(r => r.json())
      .then(d => {
        const btc = d.result?.find(t => t.symbol === 'BTCUSD');
        if (btc) setPrice(btc.mark_price);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-4 font-sans">
      <header className="flex justify-between items-center pb-4 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
          <h1 className="text-xl font-bold tracking-wider text-emerald-400">? ApexNY Engine</h1>
          <span className="text-xs text-gray-500">TradingView Live Data</span>
        </div>
        <div className="text-sm">
          BTC: <span className="font-mono text-emerald-400 font-bold">${price || '80,862'}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <aside className="bg-[#131722] p-4 rounded-lg border border-gray-800 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 tracking-wider">WATCHLIST</h2>
          <div className="p-3 bg-[#1e222d] rounded border border-gray-700/50 flex justify-between items-center cursor-pointer">
            <div>
              <div className="font-bold text-sm">BTCUSD</div>
              <div className="text-xs text-emerald-400 font-mono">${price || '80,862'}</div>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">PERP</span>
          </div>
        </aside>

        <main className="md:col-span-3 bg-[#131722] p-4 rounded-lg border border-gray-800 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-slate-800 px-2.5 py-1 rounded text-emerald-400 font-medium border border-emerald-500/20">Live</span>
              <span className="text-xs text-gray-400">Bitcoin / US Dollar (Advanced TradingView)</span>
            </div>
          </div>

          <div className="w-full flex-grow h-[550px] rounded overflow-hidden border border-gray-800 bg-[#0b0e14]">
            <iframe
              title="TradingView Chart"
              className="w-full h-full border-0"
              src="https://s.tradingview.com/widgetembed/?symbol=BINANCE%3ABTCUSDT&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata&studies=%5B%5D&hide_side_toolbar=0&allow_symbol_change=1&save_image=0"
            />
          </div>

          <footer className="mt-4 p-3 bg-[#1e222d] rounded border border-gray-800 text-xs text-gray-400">
            <span className="text-emerald-400 font-medium">Engine Status:</span> TradingView Advanced Chart Active. Monitoring NY Killzone...
          </footer>
        </main>
      </div>
    </div>
  );
}
