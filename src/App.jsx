import React, { useState, useEffect } from 'react';

const CRYPTO_ASSETS = [
  { symbol: 'BTCUSD', tvSymbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', basePrice: 80967.50, strikeStep: 1000 },
  { symbol: 'ETHUSD', tvSymbol: 'BINANCE:ETHUSDT', name: 'Ethereum', basePrice: 2501.20, strikeStep: 50 },
];

export default function App() {
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(CRYPTO_ASSETS[0]);
  const [activeStrategy, setActiveStrategy] = useState('STRANGLE'); // 'STRANGLE' | 'CONDOR' | 'BULL_PUT' | 'BEAR_CALL'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'chart'
  const [timeUTC, setTimeUTC] = useState('');
  const [contractQty, setContractQty] = useState(1);

  // Delta Exchange India live spot/perps price
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
    const timer = setInterval(() => {
      const now = new Date();
      setTimeUTC(now.toUTCString().split(' ')[4] + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const cmp = prices[selectedAsset.symbol]?.price || selectedAsset.basePrice;
  const step = selectedAsset.strikeStep;
  const atmStrike = Math.round(cmp / step) * step;

  // Option Selling Strike Selections (Based on 15 Delta / Safe OTM Ranges)
  const otmCallSell = atmStrike + (step * 2);
  const otmPutSell = atmStrike - (step * 2);
  const otmCallBuy = otmCallSell + step;
  const otmPutBuy = otmPutSell - step;

  // Estimated Delta India Premiums
  const callPremium = selectedAsset.symbol === 'BTCUSD' ? 420 : 28;
  const putPremium = selectedAsset.symbol === 'BTCUSD' ? 390 : 26;
  const wingPremium = selectedAsset.symbol === 'BTCUSD' ? 120 : 8;

  // Option Selling Strategy Configurations
  const STRATEGIES = {
    STRANGLE: {
      name: 'Delta Short Strangle',
      type: 'Neutral / Pure Theta Decay',
      legs: [
        { action: 'SELL', type: 'CE (Call)', strike: otmCallSell, premium: callPremium, delta: '0.15' },
        { action: 'SELL', type: 'PE (Put)', strike: otmPutSell, premium: putPremium, delta: '-0.15' },
      ],
      netCredit: (callPremium + putPremium) * contractQty,
      upperBreakeven: otmCallSell + callPremium + putPremium,
      lowerBreakeven: otmPutSell - (callPremium + putPremium),
      thetaDecayDaily: `+$${((callPremium + putPremium) * 0.28 * contractQty).toFixed(1)}/day`,
      pop: '78%', // Probability of Profit
      logic: `Sell OTM Call at $${otmCallSell} and OTM Put at $${otmPutSell}. Ideal when price consolidates inside ${otmPutSell} - ${otmCallSell}. Full premium captured upon expiry.`
    },
    CONDOR: {
      name: 'Iron Condor (Defined Risk)',
      type: 'Range-Bound / Protected Margin',
      legs: [
        { action: 'BUY', type: 'CE (Call Wing)', strike: otmCallBuy, premium: wingPremium, delta: '0.07' },
        { action: 'SELL', type: 'CE (Call Sell)', strike: otmCallSell, premium: callPremium, delta: '0.15' },
        { action: 'SELL', type: 'PE (Put Sell)', strike: otmPutSell, premium: putPremium, delta: '-0.15' },
        { action: 'BUY', type: 'PE (Put Wing)', strike: otmPutBuy, premium: wingPremium, delta: '-0.07' },
      ],
      netCredit: ((callPremium + putPremium) - (wingPremium * 2)) * contractQty,
      upperBreakeven: otmCallSell + ((callPremium + putPremium) - (wingPremium * 2)),
      lowerBreakeven: otmPutSell - ((callPremium + putPremium) - (wingPremium * 2)),
      thetaDecayDaily: `+$${(((callPremium + putPremium) - (wingPremium * 2)) * 0.32 * contractQty).toFixed(1)}/day`,
      pop: '82%',
      logic: `Capped-risk option selling. Wings bought at $${otmCallBuy} CE & $${otmPutBuy} PE protect against macro black-swan wick moves.`
    },
    BULL_PUT: {
      name: 'Bull Put Credit Spread',
      type: 'Bullish Bias / Theta Positive',
      legs: [
        { action: 'SELL', type: 'PE (Put Sell)', strike: otmPutSell, premium: putPremium, delta: '-0.18' },
        { action: 'BUY', type: 'PE (Put Buy)', strike: otmPutBuy, premium: wingPremium, delta: '-0.08' },
      ],
      netCredit: (putPremium - wingPremium) * contractQty,
      upperBreakeven: cmp,
      lowerBreakeven: otmPutSell - (putPremium - wingPremium),
      thetaDecayDaily: `+$${((putPremium - wingPremium) * 0.30 * contractQty).toFixed(1)}/day`,
      pop: '75%',
      logic: `Sell Put at $${otmPutSell} below Asian/London support lows. Collect decay as long as ${selectedAsset.symbol} stays above $${otmPutSell}.`
    },
    BEAR_CALL: {
      name: 'Bear Call Credit Spread',
      type: 'Bearish Bias / Theta Positive',
      legs: [
        { action: 'SELL', type: 'CE (Call Sell)', strike: otmCallSell, premium: callPremium, delta: '0.18' },
        { action: 'BUY', type: 'CE (Call Buy)', strike: otmCallBuy, premium: wingPremium, delta: '0.08' },
      ],
      netCredit: (callPremium - wingPremium) * contractQty,
      upperBreakeven: otmCallSell + (callPremium - wingPremium),
      lowerBreakeven: cmp,
      thetaDecayDaily: `+$${((callPremium - wingPremium) * 0.30 * contractQty).toFixed(1)}/day`,
      pop: '76%',
      logic: `Sell Call at $${otmCallSell} above key liquidity sweep highs. Collect full decay if market remains capped below resistance.`
    }
  };

  const currentStrat = STRATEGIES[activeStrategy];

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-200 p-3 md:p-5 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              APEX<span className="text-cyan-400">OPTIONS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                THETA SELLING PRO
              </span>
            </h1>
            <p className="text-[11px] text-emerald-400 font-mono">By Mr. Vishal Langade • Delta Exchange India Option Engine</p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <div className="flex bg-[#0d1322] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition ${
                activeTab === 'overview' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Option Cockpit
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'chart' ? 'bg-cyan-500 text-black shadow' : 'text-cyan-400 hover:text-cyan-300'
              }`}
            >
              <span>?? Open Chart ({selectedAsset.symbol})</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-[#0b101b] border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400">DELTA INDIA EXPIRY: DAILY 17:30 IST</span>
            <span className="text-slate-600">|</span>
            <span className="text-white font-bold">{timeUTC}</span>
          </div>
        </div>
      </header>

      {/* VIEW 1: OPTION SELLING DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Asset Selection & Strategy Switcher */}
          <div className="space-y-4">
            {/* Asset Switcher (BTC / ETH Only) */}
            <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wider block">
                SELECT UNDERLYING (DELTA OPTION FEED)
              </span>

              <div className="grid grid-cols-2 gap-2">
                {CRYPTO_ASSETS.map(asset => {
                  const p = prices[asset.symbol]?.price || asset.basePrice;
                  const isSelected = selectedAsset.symbol === asset.symbol;
                  return (
                    <div
                      key={asset.symbol}
                      onClick={() => setSelectedAsset(asset)}
                      className={`p-3 rounded-lg border cursor-pointer transition text-center ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/70 text-white shadow-md'
                          : 'bg-[#0d1322] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-sm text-white">{asset.symbol}</div>
                      <div className="text-xs font-mono text-cyan-400 mt-0.5">${Number(p).toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Option Selling Strategy Selector */}
            <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-2.5">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wider block">
                SELLER DEPLOYMENT BLUEPRINT
              </span>

              {[
                { id: 'STRANGLE', label: 'Short Strangle', desc: 'Max Theta decay, range-bound' },
                { id: 'CONDOR', label: 'Iron Condor', desc: 'Protected wings, defined loss' },
                { id: 'BULL_PUT', label: 'Bull Put Spread', desc: 'Bullish support credit sell' },
                { id: 'BEAR_CALL', label: 'Bear Call Spread', desc: 'Bearish resistance credit sell' },
              ].map(strat => (
                <div
                  key={strat.id}
                  onClick={() => setActiveStrategy(strat.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition flex justify-between items-center ${
                    activeStrategy === strat.id
                      ? 'bg-emerald-500/15 border-emerald-500/70 text-white'
                      : 'bg-[#0d1322] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{strat.label}</div>
                    <div className="text-[10px] text-slate-400">{strat.desc}</div>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    activeStrategy === strat.id ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
                  }`}>
                    SELECT
                  </span>
                </div>
              ))}
            </div>

            {/* Contract Size Slider */}
            <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">LOTS / CONTRACTS:</span>
                <span className="text-cyan-400 font-bold text-sm">{contractQty}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={contractQty}
                onChange={(e) => setContractQty(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Center & Right Columns: Strategy Breakdown & Execution Legs */}
          <div className="lg:col-span-2 space-y-4">
            {/* Strategy Profile Banner */}
            <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
              <div className="flex flex-wrap justify-between items-center border-b border-slate-800 pb-3 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{currentStrat.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {currentStrat.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">{currentStrat.logic}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block font-mono">ESTIMATED WIN RATE</span>
                  <span className="text-emerald-400 font-bold font-mono text-sm">{currentStrat.pop}</span>
                </div>
              </div>

              {/* Performance & Breakeven Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">TOTAL CREDIT (PROFIT)</span>
                  <span className="text-emerald-400 font-bold text-sm">+${currentStrat.netCredit}</span>
                </div>
                <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">THETA RATE</span>
                  <span className="text-cyan-300 font-bold text-sm">{currentStrat.thetaDecayDaily}</span>
                </div>
                <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">LOWER BREAKEVEN</span>
                  <span className="text-rose-400 font-bold text-sm">${currentStrat.lowerBreakeven.toFixed(0)}</span>
                </div>
                <div className="bg-[#0d1322] p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">UPPER BREAKEVEN</span>
                  <span className="text-rose-400 font-bold text-sm">${currentStrat.upperBreakeven.toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Exact Option Legs Execution Table */}
            <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  EXECUTION LEGS (DELTA EXCHANGE ORDER SHEET)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Spot CMP: ${Number(cmp).toFixed(2)}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="pb-2">ACTION</th>
                      <th className="pb-2">STRIKE</th>
                      <th className="pb-2">TYPE</th>
                      <th className="pb-2">EST. PREMIUM</th>
                      <th className="pb-2">DELTA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {currentStrat.legs.map((leg, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            leg.action === 'SELL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {leg.action}
                          </span>
                        </td>
                        <td className="py-2.5 text-white font-bold">${leg.strike}</td>
                        <td className="py-2.5 text-slate-300">{leg.type}</td>
                        <td className="py-2.5 text-emerald-400 font-bold">${leg.premium * contractQty}</td>
                        <td className="py-2.5 text-slate-400">{leg.delta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Launch Chart Overlay Button */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/10 via-[#0d1322] to-transparent border border-cyan-500/30 flex justify-between items-center">
              <div>
                <span className="text-xs text-white font-bold block">Visualize Strike Levels on Chart</span>
                <span className="text-[11px] text-slate-400">View safe seller zone: ${currentStrat.lowerBreakeven.toFixed(0)} to ${currentStrat.upperBreakeven.toFixed(0)}</span>
              </div>
              <button
                onClick={() => setActiveTab('chart')}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg text-xs font-bold font-mono transition"
              >
                Launch Chart & Levels ?
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL CHART COCKPIT WITH OPTION SELLER RANGE */}
      {activeTab === 'chart' && (
        <div className="space-y-3">
          {/* Top Control Bar with Seller Strikes */}
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveTab('overview')}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition"
              >
                ? Back to Option Dashboard
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{selectedAsset.symbol}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {currentStrat.name}
                </span>
              </div>
            </div>

            {/* Strategy Range Visual Metrics */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="bg-[#0d1322] px-3 py-1.5 rounded-lg border border-rose-500/40">
                <span className="text-slate-400 text-[10px]">LOWER PUT SELL: </span>
                <span className="text-rose-400 font-bold">${otmPutSell}</span>
              </div>
              <div className="bg-[#0d1322] px-3 py-1.5 rounded-lg border border-cyan-500/40">
                <span className="text-slate-400 text-[10px]">UPPER CALL SELL: </span>
                <span className="text-cyan-400 font-bold">${otmCallSell}</span>
              </div>
              <div className="bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 font-bold">
                MAX CREDIT: +${currentStrat.netCredit}
              </div>
            </div>
          </div>

          {/* Interactive TradingView Engine */}
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
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
          <span>Delta Exchange India Option Selling Engine (BTC & ETH Exclusive)</span>
        </div>
        <div className="font-mono text-emerald-400 font-bold">
          Crafted with Precision by Mr. Vishal Langade
        </div>
      </footer>
    </div>
  );
}
