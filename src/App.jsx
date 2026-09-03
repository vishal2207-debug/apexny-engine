import React, { useState, useEffect } from 'react';

const ALL_ASSETS = [
  { symbol: 'BTCUSD', tvSymbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', category: 'Crypto', basePrice: 80967.50, strikeStep: 1000, hasOptions: true },
  { symbol: 'ETHUSD', tvSymbol: 'BINANCE:ETHUSDT', name: 'Ethereum', category: 'Crypto', basePrice: 2501.20, strikeStep: 50, hasOptions: true },
  { symbol: 'SOLUSD', tvSymbol: 'BINANCE:SOLUSDT', name: 'Solana', category: 'Crypto', basePrice: 104.50, strikeStep: 5, hasOptions: false },
  { symbol: 'XRPUSD', tvSymbol: 'BINANCE:XRPUSDT', name: 'Ripple', category: 'Crypto', basePrice: 1.4500, strikeStep: 0.1, hasOptions: false },
  { symbol: 'XAUUSD', tvSymbol: 'OANDA:XAUUSD', name: 'Gold Spot', category: 'Commodities', basePrice: 4493.05, strikeStep: 25, hasOptions: false },
  { symbol: 'XAGUSD', tvSymbol: 'OANDA:XAGUSD', name: 'Silver Spot', category: 'Commodities', basePrice: 42.50, strikeStep: 1, hasOptions: false },
];

const GLOBAL_NEWS_DATA = [
  {
    id: 1,
    event: 'US Core CPI (YoY)',
    impact: 'HIGH',
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
    time: '23:30 IST',
    forecast: '4.75%',
    previous: '5.00%',
    status: 'Institutional Liquidity Spike',
    scenarioBullish: 'Dovish Rate Cut (-25bps / -50bps): Weak Dollar liquidity expands crypto and commodities.',
    scenarioBearish: 'Hawkish Pause / Stance: Yields surge, sudden sweeps of Asian & London session lows.'
  },
  {
    id: 3,
    event: 'US Non-Farm Payrolls (NFP)',
    impact: 'HIGH',
    time: '18:00 IST',
    forecast: '145K',
    previous: '160K',
    status: 'Initial Liquidity Grab Zone',
    scenarioBullish: 'Weaker Job Data: Confirms economic cooldown, instant short-squeeze on Gold & ETH.',
    scenarioBearish: 'Hot Job Print: Heavy dollar demand, equal highs act as liquidity traps.'
  }
];

export default function App() {
  const [terminalMode, setTerminalMode] = useState('SMC'); // 'SMC' or 'OPTIONS'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'chart'
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(ALL_ASSETS[0]);
  const [structure, setStructure] = useState({});
  const [timeUTC, setTimeUTC] = useState('');
  const [activeSession, setActiveSession] = useState({ name: '24H GLOBAL' });
  const [selectedNews, setSelectedNews] = useState(GLOBAL_NEWS_DATA[0]);
  const [optionStrat, setOptionStrat] = useState('STRANGLE');
  const [contractQty, setContractQty] = useState(1);

  // Live prices
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

  // Clock and Sessions
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

  // Bi-directional Structure Engine
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

  const cmp = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
  const isSmallAsset = cmp < 10;
  const activeStructure = structure[selectedAsset.symbol] || {
    bias: 'LONG',
    entry: cmp * 0.998,
    sl: cmp * 0.993,
    tp: cmp * 1.013,
    status: 'ACTIVE',
    timestamp: 'Live'
  };

  const isLong = activeStructure.bias === 'LONG';
  const formatPrice = (val) => isSmallAsset ? Number(val || 0).toFixed(4) : Number(val || 0).toFixed(2);

  // Option Engine Calculations (BTC & ETH)
  const optionAsset = selectedAsset.hasOptions ? selectedAsset : ALL_ASSETS[0];
  const optCMP = prices[optionAsset.symbol]?.price || optionAsset.basePrice;
  const optStep = optionAsset.strikeStep;
  const atmStrike = Math.round(optCMP / optStep) * optStep;
  const otmCallSell = atmStrike + (optStep * 2);
  const otmPutSell = atmStrike - (optStep * 2);
  const otmCallBuy = otmCallSell + optStep;
  const otmPutBuy = otmPutSell - optStep;
  const callPremium = optionAsset.symbol === 'BTCUSD' ? 420 : 28;
  const putPremium = optionAsset.symbol === 'BTCUSD' ? 390 : 26;
  const wingPremium = optionAsset.symbol === 'BTCUSD' ? 120 : 8;

  const OPTION_STRATEGIES = {
    STRANGLE: {
      name: 'Delta Short Strangle',
      type: 'Pure Theta Decay (Neutral)',
      legs: [
        { action: 'SELL', type: 'CE', strike: otmCallSell, premium: callPremium },
        { action: 'SELL', type: 'PE', strike: otmPutSell, premium: putPremium },
      ],
      netCredit: (callPremium + putPremium) * contractQty,
      lowerBreakeven: otmPutSell - (callPremium + putPremium),
      upperBreakeven: otmCallSell + (callPremium + putPremium),
      pop: '78%',
      logic: `Collects double theta decay. Maximum profit realized if ${optionAsset.symbol} settles between $${otmPutSell} and $${otmCallSell}.`
    },
    CONDOR: {
      name: 'Iron Condor (Protected)',
      type: 'Defined Risk Theta Spread',
      legs: [
        { action: 'BUY', type: 'CE', strike: otmCallBuy, premium: wingPremium },
        { action: 'SELL', type: 'CE', strike: otmCallSell, premium: callPremium },
        { action: 'SELL', type: 'PE', strike: otmPutSell, premium: putPremium },
        { action: 'BUY', type: 'PE', strike: otmPutBuy, premium: wingPremium },
      ],
      netCredit: ((callPremium + putPremium) - (wingPremium * 2)) * contractQty,
      lowerBreakeven: otmPutSell - ((callPremium + putPremium) - (wingPremium * 2)),
      upperBreakeven: otmCallSell + ((callPremium + putPremium) - (wingPremium * 2)),
      pop: '82%',
      logic: `Wings protect capital against sudden macro announcements while generating daily decay.`
    },
    BULL_PUT: {
      name: 'Bull Put Credit Spread',
      type: 'Bullish Bias Theta Sell',
      legs: [
        { action: 'SELL', type: 'PE', strike: otmPutSell, premium: putPremium },
        { action: 'BUY', type: 'PE', strike: otmPutBuy, premium: wingPremium },
      ],
      netCredit: (putPremium - wingPremium) * contractQty,
      lowerBreakeven: otmPutSell - (putPremium - wingPremium),
      upperBreakeven: optCMP,
      pop: '75%',
      logic: `High win-rate seller setup anchored below key support. Captures decay as long as market holds above $${otmPutSell}.`
    }
  };

  const currentOption = OPTION_STRATEGIES[optionStrat];

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-200 p-3 md:p-5 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              APEX<span className="text-emerald-400">PRO</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                TERMINAL v5.5
              </span>
            </h1>
            <p className="text-[11px] text-emerald-400 font-mono">By Mr. Vishal Langade • SMC & Delta Options Architecture</p>
          </div>
        </div>

        {/* Global Controls & Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Mode Toggle: SMC vs Delta Options */}
          <div className="flex bg-[#0d1322] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => { setTerminalMode('SMC'); setActiveTab('dashboard'); }}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition ${
                terminalMode === 'SMC' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              ?? SMC & Macro
            </button>
            <button
              onClick={() => { setTerminalMode('OPTIONS'); setActiveTab('dashboard'); }}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition ${
                terminalMode === 'OPTIONS' ? 'bg-cyan-500 text-black shadow' : 'text-cyan-400 hover:text-cyan-300'
              }`}
            >
              ? Delta Option Selling
            </button>
          </div>

          {/* Tab: Dashboard vs Chart */}
          <div className="flex bg-[#0d1322] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition ${
                activeTab === 'dashboard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'chart' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-400 hover:text-indigo-300'
              }`}
            >
              <span>?? Open Chart</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono bg-[#0b101b] border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400">{activeSession.name}</span>
            <span className="text-slate-600">|</span>
            <span className="text-white font-bold">{timeUTC}</span>
          </div>
        </div>
      </header>

      {/* VIEW 1: DASHBOARD (Switchable between SMC/Macro vs Option Selling) */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Universal Watchlist (All 6 Assets) */}
          <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wider">
                WATCHLIST ({ALL_ASSETS.length} ASSETS)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Synced Feed</span>
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {ALL_ASSETS.map(asset => {
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
                        ? 'bg-slate-800/90 border-emerald-500/80 shadow'
                        : 'bg-[#0d1322]/70 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        {asset.symbol}
                        <span className="text-xs text-slate-400 font-normal">({asset.name})</span>
                        {asset.hasOptions && (
                          <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 rounded font-mono">
                            OPT
                          </span>
                        )}
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
                        className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs px-2 py-1 rounded font-mono transition"
                      >
                        Chart ?
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 2 Columns: DYNAMIC DISPLAY (SMC & News OR Delta Option Selling) */}
          <div className="lg:col-span-2 space-y-4">
            {/* SUB-VIEW A: SMC & GLOBAL NEWS MODE */}
            {terminalMode === 'SMC' && (
              <div className="space-y-4">
                {/* Active SMC Level Bar */}
                <div className="bg-[#090d16] p-3.5 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <span className="text-xs text-slate-400 font-mono block">ACTIVE ASSET SETUP:</span>
                    <span className="text-sm font-bold text-white">{selectedAsset.name} ({selectedAsset.symbol})</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <div className="bg-[#0d1322] px-2.5 py-1 rounded border border-cyan-500/40">
                      <span className="text-slate-400 text-[10px]">ENTRY: </span>
                      <span className="text-cyan-300 font-bold">${formatPrice(activeStructure.entry)}</span>
                    </div>
                    <div className="bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/40">
                      <span className="text-rose-400 text-[10px]">SL: </span>
                      <span className="text-rose-300 font-bold">${formatPrice(activeStructure.sl)}</span>
                    </div>
                    <div className="bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/40">
                      <span className="text-emerald-400 text-[10px]">TP: </span>
                      <span className="text-emerald-300 font-bold">${formatPrice(activeStructure.tp)}</span>
                    </div>
                  </div>
                </div>

                {/* Macro News Matrix */}
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        GLOBAL MACRO IMPACT SCENARIOS
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">CPI • FOMC • NFP</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {GLOBAL_NEWS_DATA.map(news => (
                      <div
                        key={news.id}
                        onClick={() => setSelectedNews(news)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition text-xs font-mono ${
                          selectedNews.id === news.id ? 'bg-rose-500/15 border-rose-500 text-white shadow' : 'bg-[#0d1322] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded text-[9px] font-bold">
                            {news.impact}
                          </span>
                          <span className="text-[10px] text-slate-400">{news.time}</span>
                        </div>
                        <div className="font-bold text-xs text-slate-200 mt-1 truncate">{news.event}</div>
                        <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                          <span>Exp: {news.forecast}</span>
                          <span>Prev: {news.previous}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Scenarios Display */}
                  <div className="bg-[#0d1322] p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">? Impact Scenario: {selectedNews.event}</span>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {selectedNews.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                        <span className="font-bold text-emerald-400 block font-mono">?? Bullish Scenario:</span>
                        {selectedNews.scenarioBullish}
                      </div>
                      <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                        <span className="font-bold text-rose-400 block font-mono">?? Bearish Scenario:</span>
                        {selectedNews.scenarioBearish}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VIEW B: DELTA OPTION SELLING ENGINE (BTC & ETH) */}
            {terminalMode === 'OPTIONS' && (
              <div className="space-y-4">
                {/* Option Strategy Switcher */}
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-cyan-400 font-mono tracking-wider uppercase">
                      DELTA INDIA OPTION SELLING ENGINE ({optionAsset.symbol})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Daily 17:30 IST Expiry</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'STRANGLE', name: 'Short Strangle', badge: 'Max Theta Decay' },
                      { id: 'CONDOR', name: 'Iron Condor', badge: 'Protected Wings' },
                      { id: 'BULL_PUT', name: 'Bull Put Spread', badge: 'Support Credit' },
                    ].map(strat => (
                      <div
                        key={strat.id}
                        onClick={() => setOptionStrat(strat.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition text-xs font-mono ${
                          optionStrat === strat.id
                            ? 'bg-cyan-500/15 border-cyan-500/80 text-white shadow'
                            : 'bg-[#0d1322] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-white">{strat.name}</div>
                        <div className="text-[10px] text-cyan-400 mt-1">{strat.badge}</div>
                      </div>
                    ))}
                  </div>

                  {/* Strategy Metrics Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                    <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">MAX PROFIT</span>
                      <span className="text-emerald-400 font-bold text-sm">+${currentOption.netCredit}</span>
                    </div>
                    <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">EST. WIN RATE</span>
                      <span className="text-cyan-300 font-bold text-sm">{currentOption.pop}</span>
                    </div>
                    <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">LOWER BREAKEVEN</span>
                      <span className="text-rose-400 font-bold text-sm">${currentOption.lowerBreakeven.toFixed(0)}</span>
                    </div>
                    <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">UPPER BREAKEVEN</span>
                      <span className="text-rose-400 font-bold text-sm">${currentOption.upperBreakeven.toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Option Legs Table */}
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-2">
                  <div className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    EXECUTION LEGS (DELTA EXCHANGE ORDER SHEET)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono text-left">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800">
                          <th className="pb-2">ACTION</th>
                          <th className="pb-2">STRIKE</th>
                          <th className="pb-2">TYPE</th>
                          <th className="pb-2">PREMIUM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {currentOption.legs.map((leg, idx) => (
                          <tr key={idx}>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                leg.action === 'SELL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {leg.action}
                              </span>
                            </td>
                            <td className="py-2 text-white font-bold">${leg.strike}</td>
                            <td className="py-2 text-slate-300">{leg.type}</td>
                            <td className="py-2 text-emerald-400 font-bold">${leg.premium * contractQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Chart Launch Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-600/10 via-[#0d1322] to-transparent border border-indigo-500/30 flex justify-between items-center">
              <div>
                <span className="text-xs text-white font-bold block">Ready to View Technical Candlesticks?</span>
                <span className="text-[11px] text-slate-400">Current selection: {selectedAsset.name} (${formatPrice(cmp)})</span>
              </div>
              <button
                onClick={() => setActiveTab('chart')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition"
              >
                Launch Chart ?
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED FULL-SCREEN TRADINGVIEW CHART */}
      {activeTab === 'chart' && (
        <div className="space-y-3">
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5"
              >
                ? Back to Dashboard
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{selectedAsset.symbol}</span>
                <span className="text-xs text-slate-400">({selectedAsset.name})</span>
              </div>
            </div>

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
            </div>
          </div>

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

      {/* Footer */}
      <footer className="mt-4 p-3 bg-[#090d16] rounded-xl border border-slate-800/80 flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
          <span>Dual Architecture: Complete Watchlist + SMC & Delta Option Selling</span>
        </div>
        <div className="font-mono text-emerald-400 font-bold">
          Crafted with Precision by Mr. Vishal Langade
        </div>
      </footer>
    </div>
  );
}
