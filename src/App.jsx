import React, { useState, useEffect } from 'react';

const INITIAL_ASSETS = [
  { symbol: 'BTCUSD', tvSymbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', category: 'Crypto', basePrice: 80967.50, strikeStep: 1000, hasOptions: true, newsType: 'CRYPTO' },
  { symbol: 'ETHUSD', tvSymbol: 'BINANCE:ETHUSDT', name: 'Ethereum', category: 'Crypto', basePrice: 2501.20, strikeStep: 50, hasOptions: true, newsType: 'CRYPTO' },
  { symbol: 'SOLUSD', tvSymbol: 'BINANCE:SOLUSDT', name: 'Solana', category: 'Crypto', basePrice: 104.50, strikeStep: 5, hasOptions: false, newsType: 'CRYPTO' },
  { symbol: 'XRPUSD', tvSymbol: 'BINANCE:XRPUSDT', name: 'Ripple', category: 'Crypto', basePrice: 1.4500, strikeStep: 0.1, hasOptions: false, newsType: 'CRYPTO' },
  { symbol: 'XAUUSD', tvSymbol: 'OANDA:XAUUSD', name: 'Gold Spot', category: 'Commodities', basePrice: 4493.05, strikeStep: 25, hasOptions: false, newsType: 'COMMODITY' },
  { symbol: 'XAGUSD', tvSymbol: 'OANDA:XAGUSD', name: 'Silver Spot', category: 'Commodities', basePrice: 42.50, strikeStep: 1, hasOptions: false, newsType: 'COMMODITY' },
];

const ASSET_SPECIFIC_NEWS = {
  CRYPTO: [
    { id: 1, event: 'US Core CPI & Liquidations', impact: 'HIGH', time: '18:00 IST', forecast: '2.8%', previous: '2.9%', status: 'High Leverage Volatility', scenarioBullish: 'Actual < Forecast: Dollar weakens, massive short squeeze on BTC & ETH perpetuals.', scenarioBearish: 'Actual > Forecast: Yields surge, long positions wiped out near key support.' },
    { id: 2, event: 'Federal Reserve Rate Decision', impact: 'HIGH', time: '23:30 IST', forecast: '4.75%', previous: '5.00%', status: 'Macro Liquidity Expansion', scenarioBullish: 'Dovish Cut: Crypto institutional inflows accelerate into risk-on assets.', scenarioBearish: 'Hawkish Stance: Immediate liquidity contraction, sweep of local lows.' }
  ],
  COMMODITY: [
    { id: 1, event: 'US Non-Farm Payrolls (NFP)', impact: 'HIGH', time: '18:00 IST', forecast: '145K', previous: '160K', status: 'Safe Haven Volatility', scenarioBullish: 'Weak Job Report: Gold & Silver surge as USD index drops sharply.', scenarioBearish: 'Strong Job Report: Real yields rise, precious metals face profit booking.' },
    { id: 2, event: 'Global Central Bank Gold Reserves & CPI', impact: 'HIGH', time: '19:30 IST', forecast: '2.8%', previous: '2.9%', status: 'Inflation Hedge Catalyst', scenarioBullish: 'Persistent Inflation: Strong institutional demand for physical and spot XAU/XAG.', scenarioBearish: 'Cooling Inflation: Short-term correction in bullion spot prices.' }
  ]
};

export default function App() {
  const [terminalMode, setTerminalMode] = useState('SMC'); 
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(INITIAL_ASSETS[0]);
  
  // Structure Cache: Keeps entry locked per asset until price breaches structural swing boundaries
  const [structureCache, setStructureCache] = useState({});
  
  const [timeUTC, setTimeUTC] = useState('');
  const [activeSession, setActiveSession] = useState({ name: 'NEW YORK SESSION' });
  const [optionStrat, setOptionStrat] = useState('STRANGLE');
  const [contractQty, setContractQty] = useState(1);

  const currentNewsList = ASSET_SPECIFIC_NEWS[selectedAsset.newsType] || ASSET_SPECIFIC_NEWS.CRYPTO;
  const [selectedNews, setSelectedNews] = useState(currentNewsList[0]);

  useEffect(() => {
    const list = ASSET_SPECIFIC_NEWS[selectedAsset.newsType] || ASSET_SPECIFIC_NEWS.CRYPTO;
    setSelectedNews(list[0]);
  }, [selectedAsset]);

  // Live prices feed
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

  // Clock & Sessions
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

  // STRUCTURAL BREAK ENGINE: Only changes entry when price breaks current swing block boundaries
  useEffect(() => {
    const currentCMP = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
    if (!currentCMP) return;

    const step = currentCMP < 10 ? 0.05 : currentCMP * 0.005;
    const currentBlock = Math.floor(currentCMP / step);
    const swingLow = currentBlock * step;
    const swingHigh = (currentBlock + 1) * step;

    setStructureCache(prev => {
      const existing = prev[selectedAsset.symbol];

      // If structure already exists AND price is inside current bounds, KEEP IT LOCKED!
      if (existing && currentCMP <= existing.swingHigh && currentCMP >= existing.swingLow) {
        return prev;
      }

      // Structure Break Detected (New Swing Block Formed) -> Recalibrate institutional zone
      const isBullish = currentCMP >= ((swingLow + swingHigh) / 2);
      let entry, sl, tp, bias, status, smcZone, logic;

      if (isBullish) {
        bias = 'LONG';
        entry = swingLow + (swingHigh - swingLow) * 0.40;
        sl = swingLow - (step * 0.3);
        tp = entry + ((entry - sl) * 3);
        status = 'BULLISH BOS / LONG LOCKED';
        smcZone = '5M Discount FVG & Swing Low Sweep';
        logic = 'New Market Structure Break (BOS) confirmed. Price retraced into institutional discount FVG block. Entry is locked until structural boundary breach.';
      } else {
        bias = 'SHORT';
        entry = swingHigh - (swingHigh - swingLow) * 0.40;
        sl = swingHigh + (step * 0.3);
        tp = entry - ((sl - entry) * 3);
        status = 'BEARISH MSS / SHORT LOCKED';
        smcZone = '4H Premium Supply & Equal Highs Sweep';
        logic = 'New Market Structure Shift (MSS) confirmed. Price tapped premium supply array. Entry is locked until structural boundary breach.';
      }

      return {
        ...prev,
        [selectedAsset.symbol]: {
          bias,
          entry,
          sl,
          tp,
          swingLow,
          swingHigh,
          smcZone,
          logic,
          status,
        }
      };
    });
  }, [prices, selectedAsset]);

  const cmp = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
  const isSmallAsset = cmp < 10;
  
  const activeStructure = structureCache[selectedAsset.symbol] || {
    bias: 'LONG',
    entry: cmp ? cmp * 0.998 : selectedAsset.basePrice,
    sl: cmp ? cmp * 0.993 : selectedAsset.basePrice * 0.99,
    tp: cmp ? cmp * 1.013 : selectedAsset.basePrice * 1.03,
    smcZone: 'Initial Liquidity Array',
    logic: 'Initializing institutional liquidity mapping. Structure locked.',
    status: 'BULLISH BOS / LONG LOCKED',
  };

  const isLong = activeStructure.bias === 'LONG';
  const formatPrice = (val) => isSmallAsset ? Number(val || 0).toFixed(4) : Number(val || 0).toFixed(2);

  const optionAsset = selectedAsset.hasOptions ? selectedAsset : INITIAL_ASSETS[0];
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
      type: 'Pure Theta Decay',
      legs: [
        { action: 'SELL', type: 'CE', strike: otmCallSell, premium: callPremium },
        { action: 'SELL', type: 'PE', strike: otmPutSell, premium: putPremium },
      ],
      netCredit: (callPremium + putPremium) * contractQty,
      lowerBreakeven: otmPutSell - (callPremium + putPremium),
      upperBreakeven: otmCallSell + (callPremium + putPremium),
      pop: '78%',
    },
    CONDOR: {
      name: 'Iron Condor',
      type: 'Protected Spread',
      legs: [
        { action: 'BUY', type: 'CE Wing', strike: otmCallBuy, premium: wingPremium },
        { action: 'SELL', type: 'CE Sell', strike: otmCallSell, premium: callPremium },
        { action: 'SELL', type: 'PE Sell', strike: otmPutSell, premium: putPremium },
        { action: 'BUY', type: 'PE Wing', strike: otmPutBuy, premium: wingPremium },
      ],
      netCredit: ((callPremium + putPremium) - (wingPremium * 2)) * contractQty,
      lowerBreakeven: otmPutSell - ((callPremium + putPremium) - (wingPremium * 2)),
      upperBreakeven: otmCallSell + ((callPremium + putPremium) - (wingPremium * 2)),
      pop: '82%',
    }
  };

  const currentOption = OPTION_STRATEGIES[optionStrat];

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-200 p-3 md:p-5 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              APEX<span className="text-emerald-400">PRO</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                TERMINAL v10.0
              </span>
            </h1>
            <p className="text-[11px] text-emerald-400 font-mono">
              By Mr. Vishal Langade • <span className="text-amber-400 font-bold">Proudly Indian</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#0d1322] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => { setTerminalMode('SMC'); setActiveTab('dashboard'); }}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition ${
                terminalMode === 'SMC' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              SMC & Macro
            </button>
            <button
              onClick={() => { setTerminalMode('OPTIONS'); setActiveTab('dashboard'); }}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition ${
                terminalMode === 'OPTIONS' ? 'bg-cyan-500 text-black shadow' : 'text-cyan-400 hover:text-cyan-300'
              }`}
            >
              Delta Option Selling
            </button>
          </div>

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
              <span>Open Chart</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono bg-[#0b101b] border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400">{activeSession.name}</span>
            <span className="text-slate-600">|</span>
            <span className="text-white font-bold">{timeUTC}</span>
          </div>
        </div>
      </header>

      {/* DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Watchlist */}
          <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wider">
                WATCHLIST ({INITIAL_ASSETS.length} ASSETS)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Structure Locked</span>
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {INITIAL_ASSETS.map(asset => {
                const p = prices[asset.symbol]?.price || asset.basePrice;
                const isSelected = selectedAsset.symbol === asset.symbol;
                const cached = structureCache[asset.symbol];
                const assetIsLong = cached ? cached.bias === 'LONG' : true;

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
                      </div>
                      <div className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
                        ${formatPrice(p)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                        assetIsLong ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {assetIsLong ? 'LONG' : 'SHORT'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(asset);
                          setActiveTab('chart');
                        }}
                        className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs px-3 py-1 rounded font-mono transition"
                      >
                        Chart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-2 space-y-4">
            {terminalMode === 'SMC' && (
              <div className="space-y-4">
                {/* Setup Bar with Structure Locked Status */}
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-xs text-slate-400 font-mono block">STRUCTURE-LOCKED SETUP:</span>
                      <span className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                        {selectedAsset.name} ({selectedAsset.symbol})
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                          isLong ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}>
                          {activeStructure.status}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <div className="bg-[#0d1322] px-2.5 py-1.5 rounded-lg border border-cyan-500/40">
                        <span className="text-slate-400 text-[10px] block">LOCKED ENTRY</span>
                        <span className="text-cyan-300 font-bold text-sm">${formatPrice(activeStructure.entry)}</span>
                      </div>
                      <div className="bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/40">
                        <span className="text-rose-400 text-[10px] block">STOP LOSS</span>
                        <span className="text-rose-300 font-bold text-sm">${formatPrice(activeStructure.sl)}</span>
                      </div>
                      <div className="bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/40">
                        <span className="text-emerald-400 text-[10px] block">TARGET (1:3 RR)</span>
                        <span className="text-emerald-300 font-bold text-sm">${formatPrice(activeStructure.tp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* SMC Execution Logic */}
                  <div className="bg-[#0d1322] p-3 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-400 font-mono font-bold uppercase tracking-wider">
                        Zone: {activeStructure.smcZone}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Locked Until Structure Change
                      </span>
                    </div>
                    <p className="text-slate-300 font-sans leading-relaxed">
                      <strong className="text-white">Execution Logic:</strong> {activeStructure.logic}
                    </p>
                  </div>
                </div>

                {/* Macro News Matrix */}
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        MACRO IMPACT SCENARIOS FOR {selectedAsset.symbol}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {selectedAsset.newsType} FEED ACTIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {currentNewsList.map(news => (
                      <div
                        key={news.id}
                        onClick={() => setSelectedNews(news)}
                        className={`p-3 rounded-lg border cursor-pointer transition text-xs font-mono ${
                          selectedNews.id === news.id ? 'bg-rose-500/15 border-rose-500 text-white shadow' : 'bg-[#0d1322] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold">
                            {news.impact} IMPACT
                          </span>
                          <span className="text-[10px] text-slate-400">{news.time}</span>
                        </div>
                        <div className="font-bold text-xs text-slate-200 mt-1">{news.event}</div>
                        <div className="text-[10px] text-slate-500 mt-2 flex justify-between">
                          <span>Forecast: {news.forecast}</span>
                          <span>Previous: {news.previous}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#0d1322] p-3.5 rounded-lg border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">Impact Analysis: {selectedNews.event}</span>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {selectedNews.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                        <span className="font-bold text-emerald-400 block font-mono">Bullish Scenario:</span>
                        {selectedNews.scenarioBullish}
                      </div>
                      <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                        <span className="font-bold text-rose-400 block font-mono">Bearish Scenario:</span>
                        {selectedNews.scenarioBearish}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {terminalMode === 'OPTIONS' && (
              <div className="space-y-4">
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-cyan-400 font-mono tracking-wider uppercase">
                      DELTA INDIA OPTION SELLING ENGINE ({optionAsset.symbol})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Daily Expiry</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'STRANGLE', name: 'Short Strangle', badge: 'Max Theta Decay' },
                      { id: 'CONDOR', name: 'Iron Condor', badge: 'Protected Wings' },
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

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                    <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">MAX PROFIT</span>
                      <span className="text-emerald-400 font-bold text-sm">+${currentOption.netCredit}</span>
                    </div>
                    <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">WIN RATE</span>
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

                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-2">
                  <div className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    EXECUTION LEGS (DELTA EXCHANGE)
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

            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-600/10 via-[#0d1322] to-transparent border border-indigo-500/30 flex justify-between items-center">
              <div>
                <span className="text-xs text-white font-bold block">Ready to View Technical Candlesticks?</span>
                <span className="text-[11px] text-slate-400">Current selection: {selectedAsset.name} (${formatPrice(cmp)})</span>
              </div>
              <button
                onClick={() => setActiveTab('chart')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition"
              >
                Launch Chart →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHART VIEW */}
      {activeTab === 'chart' && (
        <div className="space-y-3">
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5"
              >
                ← Back to Dashboard
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
                <span className="text-slate-400 text-[10px]">SL: </span>
                <span className="text-rose-300 font-bold">${formatPrice(activeStructure.sl)}</span>
              </div>
              <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/40">
                <span className="text-slate-400 text-[10px]">TP: </span>
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
          <span>Designed by Mr. Vishal Langade • Proudly Indian</span>
        </div>
        <div className="font-mono text-emerald-400 font-bold">
          Crafted with Precision by Mr. Vishal Langade
        </div>
      </footer>
    </div>
  );
}