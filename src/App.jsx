import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartContainerRef = useRef(null);

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
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 800,
      height: 480,
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.4)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.4)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 24 * 60 * 60;

    fetch(`https://api.india.delta.exchange/v2/chart/history?symbol=BTCUSD&resolution=5m&start=${startTime}&end=${endTime}`)
      .then(r => r.json())
      .then(res => {
        const rawCandles = res.result || [];
        if (Array.isArray(rawCandles) && rawCandles.length > 0) {
          const candles = rawCandles
            .map(c => ({
              time: Number(c.time || c.t || c[0]),
              open: Number(c.open || c.o || c[1]),
              high: Number(c.high || c.h || c[2]),
              low: Number(c.low || c.l || c[3]),
              close: Number(c.close || c.c || c[4]),
            }))
            .filter(c => !isNaN(c.time) && !isNaN(c.open) && !isNaN(c.close))
            .sort((a, b) => a.time - b.time);

          const uniqueCandles = [];
          const seen = new Set();
          for (const item of candles) {
            if (!seen.has(item.time)) {
              seen.add(item.time);
              uniqueCandles.push(item);
            }
          }

          if (uniqueCandles.length > 0) {
            candleSeries.setData(uniqueCandles);
            chart.timeScale().fitContent();
          }
        }
      })
      .catch(err => console.error("Candles fetch error:", err));

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-4 font-sans">
      <header className="flex justify-between items-center pb-4 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
          <h1 className="text-xl font-bold tracking-wider text-emerald-400">? ApexNY Engine</h1>
          <span className="text-xs text-gray-500">Delta Exchange India</span>
        </div>
        <div className="text-sm">
          BTC: <span className="font-mono text-emerald-400 font-bold">${data?.mark_price || 'Loading...'}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <aside className="bg-[#131722] p-4 rounded-lg border border-gray-800 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 tracking-wider">WATCHLIST</h2>
          <div className="p-3 bg-[#1e222d] rounded border border-gray-700/50 flex justify-between items-center cursor-pointer">
            <div>
              <div className="font-bold text-sm">BTCUSD</div>
              <div className="text-xs text-emerald-400 font-mono">${data?.mark_price || '...'}</div>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">PERP</span>
          </div>
        </aside>

        <main className="md:col-span-3 bg-[#131722] p-4 rounded-lg border border-gray-800 flex flex-col">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-xs bg-slate-800 px-2.5 py-1 rounded text-emerald-400 font-medium border border-emerald-500/20">5m</span>
            <span className="text-xs text-gray-400">Bitcoin / US Dollar</span>
          </div>

          <div ref={chartContainerRef} className="w-full flex-grow min-h-[480px]" />

          <footer className="mt-4 p-3 bg-[#1e222d] rounded border border-gray-800 text-xs text-gray-400">
            <span className="text-emerald-400 font-medium">Trade Status:</span> Monitoring live market feeds...
          </footer>
        </main>
      </div>
    </div>
  );
}
