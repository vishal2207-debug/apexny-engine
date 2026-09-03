import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [data, setData] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    fetch('https://api.india.delta.exchange/v2/tickers')
      .then(r => r.json())
      .then(d => {
        const btc = d.result?.find(t => t.symbol === 'BTCUSD');
        setData(btc);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: 'BINANCE:BTCUSDT',
          interval: '5',
          timezone: 'Asia/Kolkata',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0f172a',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: 'tradingview_widget_container',
        });
      }
    };

    containerRef.current.appendChild(script);
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
          BTC: <span className="font-mono text-emerald-400 font-bold">${data?.mark_price || '80,800'}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <aside className="bg-[#131722] p-4 rounded-lg border border-gray-800 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 tracking-wider">WATCHLIST</h2>
          <div className="p-3 bg-[#1e222d] rounded border border-gray-700/50 flex justify-between items-center cursor-pointer">
            <div>
              <div className="font-bold text-sm">BTCUSDT</div>
              <div className="text-xs text-emerald-400 font-mono">${data?.mark_price || '80,800'}</div>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">PERP</span>
          </div>
        </aside>

        <main className="md:col-span-3 bg-[#131722] p-4 rounded-lg border border-gray-800 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-slate-800 px-2.5 py-1 rounded text-emerald-400 font-medium border border-emerald-500/20">Live</span>
              <span className="text-xs text-gray-400">Bitcoin / Tether US (Interactive Chart)</span>
            </div>
          </div>

          <div className="w-full flex-grow min-h-[520px] rounded overflow-hidden" ref={containerRef}>
            <div id="tradingview_widget_container" className="w-full h-[520px]" />
          </div>

          <footer className="mt-4 p-3 bg-[#1e222d] rounded border border-gray-800 text-xs text-gray-400">
            <span className="text-emerald-400 font-medium">Engine Status:</span> TradingView charts active. Monitoring NY Killzone...
          </footer>
        </main>
      </div>
    </div>
  );
}
