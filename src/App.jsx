import { useState, useEffect } from 'react';
import { createChart } from 'lightweight-charts';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartContainer, setChartContainer] = useState(null);

  useEffect(() => {
    fetch('https://api.india.delta.exchange/v2/tickers')
      .then(r => r.json())
      .then(d => {
        const btc = d.result?.find(t => t.symbol === 'BTCUSD');
        setData(btc);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!chartContainer) return;
    
    const chart = createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: 500,
      layout: { background: { color: '#0a0e17' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00ff88',
      downColor: '#ff3366',
      borderDownColor: '#ff3366',
      borderUpColor: '#00ff88',
      wickDownColor: '#ff3366',
      wickUpColor: '#00ff88',
    });

    fetch('https://api.india.delta.exchange/v2/history/candles?symbol=BTCUSD&resolution=5m&start=' + Math.floor(Date.now()/1000 - 86400) + '&end=' + Math.floor(Date.now()/1000))
      .then(r => r.json())
      .then(d => {
        if (d.result) {
          const candles = d.result.map(c => ({
            time: c.t,
            open: c.o,
            high: c.h,
            low: c.l,
            close: c.c,
          }));
          candleSeries.setData(candles);
        }
      });

    chart.timeScale().fitContent();
    
    return () => chart.remove();
  }, [chartContainer]);

  return (
    <div className="min-h-screen bg-terminal-bg">
      <header className="border-b border-terminal-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-neon-green animate-pulse"></div>
          <h1 className="text-xl font-bold">⚡ ApexNY Engine</h1>
          <span className="text-xs text-gray-500">Delta Exchange India</span>
        </div>
        <div className="text-sm font-mono text-neon-green">
          {loading ? 'Loading...' : `BTC: $${data?.mark_price || '---'}`}
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r border-terminal-border p-4 h-[calc(100vh-57px)]">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">WATCHLIST</h2>
          <div className="space-y-2">
            {['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'].map(pair => (
              <div key={pair} className="p-3 rounded bg-terminal-card hover:bg-terminal-surface cursor-pointer transition">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm">{pair}</span>
                  <span className="text-xs text-gray-500">PERP</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {pair === 'BTCUSD' && data ? `$${Number(data.mark_price).toLocaleString()}` : '---'}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-4">
          <div className="mb-4 flex gap-2">
            {['3m', '5m', '15m'].map(tf => (
              <button key={tf} className="px-3 py-1 text-xs rounded bg-terminal-card hover:bg-neon-green hover:text-black transition">
                {tf}
              </button>
            ))}
          </div>
          <div ref={setChartContainer} className="bg-terminal-surface rounded-lg overflow-hidden" />
          
          <div className="mt-4 p-4 rounded-lg bg-terminal-card border border-terminal-border">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">📊 TRADE SIGNAL</h3>
            <p className="text-xs text-gray-500">No active signals. Monitoring NY Killzone (13:30-20:00 UTC)...</p>
          </div>
        </main>
      </div>
    </div>
  );
}
