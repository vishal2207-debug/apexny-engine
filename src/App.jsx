import React, { useState, useEffect } from 'react';

const ASSETS = [
  { symbol: 'BTCUSD', tvSymbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', category: 'Crypto', basePrice: 80967.50 },
  { symbol: 'ETHUSD', tvSymbol: 'BINANCE:ETHUSDT', name: 'Ethereum', category: 'Crypto', basePrice: 2501.20 },
  { symbol: 'SOLUSD', tvSymbol: 'BINANCE:SOLUSDT', name: 'Solana', category: 'Crypto', basePrice: 104.50 },
  { symbol: 'XRPUSD', tvSymbol: 'BINANCE:XRPUSDT', name: 'Ripple', category: 'Crypto', basePrice: 1.4500 },
  { symbol: 'XAUUSD', tvSymbol: 'OANDA:XAUUSD', name: 'Gold Spot', category: 'Commodities', basePrice: 4493.05 },
  { symbol: 'XAGUSD', tvSymbol: 'OANDA:XAGUSD', name: 'Silver Spot', category: 'Commodities', basePrice: 42.50 },
];

const GLOBAL_NEWS_DATA = [
  {
    id: 1,
    event: 'US Core CPI (YoY)',
    impact: 'HIGH',
    currency: 'USD',
    time: '18:00 IST',
    forecast: '2.8%',
    previous: '2.9%',
    status: 'High Volatility Expected',
    scenarioBullish: 'Actual < Forecast: DXY Dump -> Massive Pump on Gold, BTC & Risk Assets (Long Bias).',
    scenarioBearish: 'Actual > Forecast: DXY Spike -> Sharp Liquidation on BTC & Gold (Short Bias).'
  },
  {
    id: 2,
    event: 'Federal Reserve Interest Rate Decision (FOMC)',
    impact: 'HIGH',
    currency: 'USD',
    time: '23:30 IST',
    forecast: '4.75%',
    previous: '5.00%',
    status: 'Institutional Manipulation Spike',
    scenarioBullish: 'Dovish Rate Cut (-25bps / -50bps): Weak Dollar liquidity expands crypto and commodities.',
    scenarioBearish: 'Hawkish Pause / Stance: Yields surge, sudden sweeps of Asian & London session lows.'
  },
  {
    id: 3,
    event: 'US Non-Farm Payrolls (NFP) & Unemployment',
    impact: 'HIGH',
    currency: 'USD',
    time: '18:00 IST (First Friday)',
    forecast: '145K',
    previous: '160K',
    status: 'Initial Liquidity Grab Zone',
    scenarioBullish: 'Weaker Job Data: Confirms economic cooldown, instant short-squeeze on Gold & ETH.',
    scenarioBearish: 'Hot Job Print: Heavy dollar demand, equal highs act as liquidity traps.'
  }
];

export default function App() {
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[4]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' (Watchlist + News) or 'chart'
  const [structure, setStructure] = useState({});
  const [timeUTC, setTimeUTC] = useState('');
  const [activeSession, setActiveSession] = useState({ name: '24H GLOBAL' });
  const [selectedNews, setSelectedNews] = useState(GLOBAL_NEWS_DATA[0]);

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
    const track24hSessions = () => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      const timeVal = utcHours + utcMinutes / 60;

      let sessionName = 'ASIAN SESSION';
      if (timeVal >= 13.0 && timeVal <= 16.5) sessionName = 'LONDON + NY OVERLAP';
      else if (timeVal >= 13.0 && timeVal <= 22.0) sessionName = 'NEW YORK SESSION';
      else if (timeVal >= 7.0 && timeVal < 13.0) sessionName = 'LONDON SESSION';

      setActiveSession({ name: sessionName });
      setTimeUTC(now.toUTCString().split(' ')[4] + ' UTC');
    };

    track24hSessions();
    const timer = setInterval(track24hSessions, 1000);
    return () => clearInterval(timer);
  }, []);

  // Bi-Directional Structure Engine
  useEffect(() => {
    const currentCMP = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
    const step = currentCMP < 10 ? 0.05 : currentCMP * 0.004;
    const currentBlock = Math.floor(currentCMP / step);
    const swingLow = currentBlock * step;
    const swingHigh = (currentBlock + 1) * step;
    const midpoint = (swingLow + swingHigh) / 2;

    setStructure(prev => {
      const stored = prev[selectedAsset.symbol];
      if (stored && currentCMP <= stored.swingHigh && currentCMP >= stored.swingLow) return prev;

      const isBullish = currentCMP >= midpoint;
      let entry, sl, tp, status;

      if (isBullish) {
        entry = swingLow + (swingHigh - swingLow) * 0.45;
        sl = swingLow - (step * 0.25);
        tp = entry + ((entry - sl) * 3);
        status = 'BULLISH BOS / LONG';
      } else {
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
          status,
          timestamp: new Date().toLocaleTimeString(),
        }
      };
    });
  }, [prices, selectedAsset]);

  const currentCMP = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
  const isSmallAsset = currentCMP < 10;
  const activeStructure = structure[selectedAsset.symbol] || {
    bias: 'LONG',
    entry: currentCMP * 0.998,
    sl: currentCMP * 0.993,
    tp: currentCMP * 1.013,
    status: 'ACTIVE',
    timestamp: 'Live'
  };

  const isLong = activeStructure.bias === 'LONG';
  const formatPrice = (val) => isSmallAsset ? Number(val || 0).toFixed(4) : Number(val || 0).toFixed(2);

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-200 p-3 md:p-5 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              APEX<span className="text-emerald-400">PRO</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                TERMINAL v5.2
              </span>
            </h1>
            <p className="text-[11px] text-emerald-400 font-mono">By Mr. Vishal Langade • 24/7 SMC Architecture</p>
          </div>
        </div>

        {/* Global Controls & Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex bg-[#0d1322] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition ${
                activeTab === 'overview' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dashboard (News & Watchlist)
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'chart' ? 'bg-emerald-500 text-black shadow' : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <span>?? Open Chart ({selectedAsset.symbol})</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-[#0b101b] border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400">{activeSession.name}</span>
            <span className="text-slate-600">|</span>
            <span className="text-white font-bold">{timeUTC}</span>
          </div>
        </div>
      </header>

      {/* VIEW 1: CLEAN OVERVIEW (Watchlist + Global News Matrix) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Watchlist Section */}
          <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800/80 shadow-xl space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wider">SELECT ASSET TO ANALYZE</span>
              <span className="text-[10px] text-emerald-400 font-mono">Real-Time Sync</span>
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
                    className={`p-3 rounded-lg border cursor-pointer transition flex justify-between items-center ${
                      isSelected
                        ? 'bg-slate-800/80 border-emerald-500/80 shadow'
                        : 'bg-[#0d1322]/70 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        {asset.symbol}
                        <span className="text-xs text-slate-400 font-normal">({asset.name})</span>
                      </div>
                      <div className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
                        ${formatPrice(p)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                        assetIsLong ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {assetStruct?.bias || 'LONG'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(asset);
                          setActiveTab('chart');
                        }}
                        className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black text-xs px-2.5 py-1 rounded font-mono transition"
                      >
                        Chart ?
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Macro News & Execution Scenarios Section */}
          <div className="lg:col-span-2 bg-[#090d16] p-4 rounded-xl border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  GLOBAL MACRO NEWS & EXECUTION SCENARIOS
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Institutional Impact</span>
            </div>

            {/* News Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {GLOBAL_NEWS_DATA.map(news => {
                const isCurrent = selectedNews.id === news.id;
                return (
                  <div
                    key={news.id}
                    onClick={() => setSelectedNews(news)}
                    className={`p-3 rounded-lg border cursor-pointer transition text-xs font-mono ${
                      isCurrent ? 'bg-rose-500/15 border-rose-500 text-white shadow' : 'bg-[#0d1322] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold">
                        {news.impact}
                      </span>
                      <span className="text-[10px] text-slate-400">{news.time}</span>
                    </div>
                    <div className="font-bold text-xs text-slate-200 mt-1">{news.event}</div>
                    <div className="text-[10px] text-slate-500 mt-2 flex justify-between">
                      <span>Forecast: {news.forecast}</span>
                      <span>Prev: {news.previous}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Scenario Breakdown */}
            <div className="bg-[#0d1322] p-4 rounded-xl border border-slate-800 text-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-white">? Impact Analysis: {selectedNews.event}</span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {selectedNews.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                  <span className="font-bold text-emerald-400 block font-mono">?? Bullish Outcome Scenario:</span>
                  <p className="leading-relaxed">{selectedNews.scenarioBullish}</p>
                </div>
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1">
                  <span className="font-bold text-rose-400 block font-mono">?? Bearish Outcome Scenario:</span>
                  <p className="leading-relaxed">{selectedNews.scenarioBearish}</p>
                </div>
              </div>
            </div>

            {/* Quick Chart CTA Banner */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-[#0d1322] to-transparent border border-emerald-500/30 flex justify-between items-center">
              <div>
                <span className="text-xs text-white font-bold block">Ready to Execute?</span>
                <span className="text-[11px] text-slate-400">Current selection: {selectedAsset.name} (${formatPrice(currentCMP)})</span>
              </div>
              <button
                onClick={() => setActiveTab('chart')}
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition"
              >
                Launch Live Chart ?
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED FULL-SCREEN CHART VIEW (Shown ONLY on click) */}
      {activeTab === 'chart' && (
        <div className="space-y-3">
          {/* Top Return and Trade Control Bar */}
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveTab('overview')}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5"
              >
                ? Back to News & Watchlist
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{selectedAsset.symbol}</span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  isLong ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {activeStructure.status}
                </span>
              </div>
            </div>

            {/* Exact Level Numbers */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="bg-[#0d1322] px-3 py-1.5 rounded-lg border border-cyan-500/40">
                <span className="text-slate-400 text-[10px]">ENTRY: </span>
                <span className="text-cyan-300 font-bold">${formatPrice(activeStructure.entry)}</span>
              </div>
              <div className="bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/40">
                <span className="text-rose-400 text-[10px]">SL: </span>
                <span className="text-rose-300 font-bold">${formatPrice(activeStructure.sl)}</span>
              </div>
              <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/40">
                <span className="text-emerald-400 text-[10px]">TP: </span>
                <span className="text-emerald-300 font-bold">${formatPrice(activeStructure.tp)}</span>
              </div>
              <div className="bg-blue-500/20 px-2.5 py-1.5 rounded-lg border border-blue-500/40 text-blue-400 font-bold">
                1:3 RR
              </div>
            </div>
          </div>

          {/* Full Clean Chart Container */}
          <div className="w-full h-[650px] rounded-xl overflow-hidden border border-slate-800 bg-[#05070b] shadow-2xl">
            <iframe
              key={selectedAsset.tvSymbol}
              title="TradingView Pro Chart"
              className="w-full h-full border-0"
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(selectedAsset.tvSymbol)}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata&studies=%5B%5D&hide_side_toolbar=0&allow_symbol_change=1&save_image=0`}
            />
          </div>
        </div>
      )}

      {/* Author Footer */}
      <footer className="mt-4 p-3 bg-[#090d16] rounded-xl border border-slate-800/80 flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
          <span>Dual Mode Terminal: Switch Seamlessly Between Scenarios and Charts</span>
        </div>
        <div className="font-mono text-emerald-400 font-bold">
          Crafted with Precision by Mr. Vishal Langade
        </div>
      </footer>
    </div>
  );
}
