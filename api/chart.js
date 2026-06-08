// api/chart.js — Chart page, served as HTML
module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VietCap Chart</title>
<script src="https://cdn.jsdelivr.net/npm/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>
<style>
  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --border: #2a2d3a;
    --text: #e2e4ec;
    --muted: #6b7099;
    --red: #ef5350;
    --green: #26a69a;
    --blue: #2196f3;
    --amber: #ffa726;
    --purple: #ab47bc;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; }

  .header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--border); }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .logo { font-size: 14px; font-weight: 600; color: var(--text); letter-spacing: 0.02em; }
  .logo span { color: #ef5350; }

  .ticker-row { display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border); }
  .btn { padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; font-size: 12px; font-weight: 500; transition: all .15s; font-family: inherit; }
  .btn:hover { border-color: var(--blue); color: var(--text); }
  .btn.active { background: var(--blue); border-color: var(--blue); color: #fff; }
  .btn-tf { padding: 4px 10px; font-size: 11px; }
  .btn-tf.active { background: var(--amber); border-color: var(--amber); color: #000; }

  .price-bar { display: flex; align-items: baseline; gap: 10px; padding: 8px 16px; background: var(--surface); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
  .price-main { font-size: 22px; font-weight: 700; }
  .price-change { font-size: 13px; font-weight: 500; }
  .price-meta { font-size: 11px; color: var(--muted); }
  .up { color: var(--green); }
  .down { color: var(--red); }

  .indicator-row { display: flex; gap: 6px; padding: 8px 16px; background: var(--surface); border-bottom: 1px solid var(--border); flex-wrap: wrap; align-items: center; }
  .ind-label { font-size: 11px; color: var(--muted); margin-right: 4px; }
  .ind-btn { padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; font-size: 11px; font-family: inherit; transition: all .15s; }
  .ind-btn.active { color: #fff; border-color: transparent; }
  .ind-btn[data-ind="bb"].active  { background: rgba(33,150,243,0.4); color: var(--blue); border-color: var(--blue); }
  .ind-btn[data-ind="ma"].active  { background: rgba(255,167,38,0.2); color: var(--amber); border-color: var(--amber); }
  .ind-btn[data-ind="vol"].active { background: rgba(38,166,154,0.2); color: var(--green); border-color: var(--green); }
  .ind-btn[data-ind="rsi"].active { background: rgba(171,71,188,0.2); color: var(--purple); border-color: var(--purple); }
  .ind-btn[data-ind="macd"].active{ background: rgba(33,150,243,0.2); color: var(--blue); border-color: var(--blue); }

  .charts-wrap { display: flex; flex-direction: column; height: calc(100vh - 180px); }
  #chart-main  { flex: 1; min-height: 0; }
  #chart-vol   { height: 80px; border-top: 1px solid var(--border); }
  #chart-rsi   { height: 100px; border-top: 1px solid var(--border); }
  #chart-macd  { height: 100px; border-top: 1px solid var(--border); }
  .chart-label { position: absolute; top: 6px; left: 12px; font-size: 10px; color: var(--muted); pointer-events: none; z-index: 10; }

  .loading { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--muted); font-size: 13px; gap: 8px; }
  .spinner { width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--blue); border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div class="logo"><span>Viet</span>Cap Chart</div>
    <div style="color:var(--muted);font-size:11px;">Technical Analysis</div>
  </div>
  <div style="display:flex;gap:6px;">
    <button class="btn btn-tf active" data-tf="D" onclick="switchTF('D')">Daily</button>
    <button class="btn btn-tf" data-tf="W" onclick="switchTF('W')">Weekly</button>
  </div>
</div>

<div class="ticker-row" id="tickerRow"></div>

<div class="price-bar" id="priceBar">
  <div class="loading"><div class="spinner"></div> Đang tải dữ liệu...</div>
</div>

<div class="indicator-row">
  <span class="ind-label">Indicators:</span>
  <button class="ind-btn active" data-ind="bb"  onclick="toggleInd('bb')">Bollinger Bands</button>
  <button class="ind-btn active" data-ind="ma"  onclick="toggleInd('ma')">MA 20/50/200</button>
  <button class="ind-btn active" data-ind="vol" onclick="toggleInd('vol')">Volume</button>
  <button class="ind-btn active" data-ind="rsi" onclick="toggleInd('rsi')">RSI</button>
  <button class="ind-btn active" data-ind="macd" onclick="toggleInd('macd')">MACD</button>
</div>

<div class="charts-wrap" id="chartsWrap">
  <div id="chart-main" style="position:relative;"></div>
  <div id="chart-vol"  style="position:relative;display:none;"><span class="chart-label">Volume</span></div>
  <div id="chart-rsi"  style="position:relative;display:none;"><span class="chart-label">RSI (14)</span></div>
  <div id="chart-macd" style="position:relative;display:none;"><span class="chart-label">MACD (12,26,9)</span></div>
</div>

<script>
const TICKERS = [
  { id: "VCB", name: "VCB", type: "stock" },
  { id: "TCB", name: "TCB", type: "stock" },
  { id: "VNM", name: "VNM", type: "stock" },
  { id: "HPG", name: "HPG", type: "stock" },
];

const CHART_CONFIG = {
  layout: { background: { color: "#0f1117" }, textColor: "#6b7099" },
  grid: { vertLines: { color: "#1e2130" }, horzLines: { color: "#1e2130" } },
  crosshair: { mode: 1 },
  rightPriceScale: { borderColor: "#2a2d3a" },
  timeScale: { borderColor: "#2a2d3a", timeVisible: true },
  handleScroll: true,
  handleScale: true,
};

let charts = {};
let series = {};
let state = { ticker: "VCB", tf: "D", inds: { bb: true, ma: true, vol: true, rsi: true, macd: true } };
let rawData = [];

// ── Init ticker buttons ──────────────────────────────────
function initTickers() {
  const row = document.getElementById("tickerRow");
  TICKERS.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "btn" + (t.id === state.ticker ? " active" : "");
    btn.textContent = t.name;
    btn.onclick = () => switchTicker(t.id);
    btn.dataset.id = t.id;
    row.appendChild(btn);
  });
}

// ── Init all chart instances ─────────────────────────────
function initCharts() {
  Object.values(charts).forEach(c => c.remove());
  charts = {}; series = {};

  charts.main = LightweightCharts.createChart(document.getElementById("chart-main"), { ...CHART_CONFIG });
  series.candle = charts.main.addCandlestickSeries({ upColor: "#26a69a", downColor: "#ef5350", borderUpColor: "#26a69a", borderDownColor: "#ef5350", wickUpColor: "#26a69a", wickDownColor: "#ef5350" });
  series.bb_upper = charts.main.addLineSeries({ color: "rgba(33,150,243,0.5)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
  series.bb_mid   = charts.main.addLineSeries({ color: "rgba(33,150,243,0.8)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
  series.bb_lower = charts.main.addLineSeries({ color: "rgba(33,150,243,0.5)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
  series.ma20  = charts.main.addLineSeries({ color: "#ffa726", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
  series.ma50  = charts.main.addLineSeries({ color: "#ef5350", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
  series.ma200 = charts.main.addLineSeries({ color: "#ab47bc", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

  charts.vol = LightweightCharts.createChart(document.getElementById("chart-vol"), { ...CHART_CONFIG, rightPriceScale: { borderColor: "#2a2d3a", scaleMargins: { top: 0.1, bottom: 0 } } });
  series.vol = charts.vol.addHistogramSeries({ priceFormat: { type: "volume" } });

  charts.rsi = LightweightCharts.createChart(document.getElementById("chart-rsi"), { ...CHART_CONFIG, rightPriceScale: { borderColor: "#2a2d3a", scaleMargins: { top: 0.1, bottom: 0.1 } } });
  series.rsi = charts.rsi.addLineSeries({ color: "#ab47bc", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
  series.rsi70 = charts.rsi.addLineSeries({ color: "rgba(239,83,80,0.4)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
  series.rsi30 = charts.rsi.addLineSeries({ color: "rgba(38,166,154,0.4)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

  charts.macd = LightweightCharts.createChart(document.getElementById("chart-macd"), { ...CHART_CONFIG, rightPriceScale: { borderColor: "#2a2d3a", scaleMargins: { top: 0.1, bottom: 0.1 } } });
  series.macdLine   = charts.macd.addLineSeries({ color: "#2196f3", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
  series.macdSignal = charts.macd.addLineSeries({ color: "#ffa726", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
  series.macdHist   = charts.macd.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });

  // Sync crosshair
  ["vol","rsi","macd"].forEach(key => {
    if (!charts[key]) return;
    charts[key].subscribeCrosshairMove(p => {
      if (p.time) charts.main.setCrosshairPosition(p.point ? p.point.x : 0, p.point ? p.point.y : 0, series.candle);
    });
  });

  applyVisibility();
}

// ── Fetch TCBS data ──────────────────────────────────────
async function fetchData(ticker, tf) {
  try {
    const type = tf === "W" ? "weekly" : "daily";
    const url = \`/api/tcbs?ticker=\${ticker}&type=\${type}\`;
    const res = await fetch(url);
    const data = await res.json();
    const bars = data.data || [];
    if (!bars.length) {
      document.getElementById("priceBar").innerHTML = \`<span style="color:var(--red);font-size:13px;">Không có data cho \${ticker} — Yahoo Finance chưa hỗ trợ mã này</span>\`;
      return [];
    }
    return bars.map(b => ({
      time: b.tradingDate ? b.tradingDate.split("T")[0] : b.date,
      open:  parseFloat(b.open)  || 0,
      high:  parseFloat(b.high)  || 0,
      low:   parseFloat(b.low)   || 0,
      close: parseFloat(b.close) || 0,
      volume: parseInt(b.volume) || 0,
    })).filter(b => b.time && b.close > 0).sort((a,b) => a.time > b.time ? 1 : -1);
  } catch(e) {
    console.error("Fetch error", e);
    document.getElementById("priceBar").innerHTML = \`<span style="color:var(--red);font-size:13px;">Lỗi tải data: \${e.message}</span>\`;
    return [];
  }
}

// ── Indicator calculations ────────────────────────────────
function calcSMA(data, period) {
  return data.map((d, i) => {
    if (i < period - 1) return null;
    const sum = data.slice(i - period + 1, i + 1).reduce((s, x) => s + x.close, 0);
    return { time: d.time, value: sum / period };
  }).filter(Boolean);
}

function calcBB(data, period = 20, mult = 2) {
  const upper = [], mid = [], lower = [];
  data.forEach((d, i) => {
    if (i < period - 1) return;
    const slice = data.slice(i - period + 1, i + 1).map(x => x.close);
    const mean = slice.reduce((s,x) => s+x, 0) / period;
    const std = Math.sqrt(slice.reduce((s,x) => s + (x-mean)**2, 0) / period);
    mid.push({ time: d.time, value: mean });
    upper.push({ time: d.time, value: mean + mult * std });
    lower.push({ time: d.time, value: mean - mult * std });
  });
  return { upper, mid, lower };
}

function calcRSI(data, period = 14) {
  const result = [];
  for (let i = period; i < data.length; i++) {
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j].close - data[j-1].close;
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const rs = gains / (losses || 0.0001);
    result.push({ time: data[i].time, value: parseFloat((100 - 100/(1+rs)).toFixed(2)) });
  }
  return result;
}

function calcMACD(data, fast=12, slow=26, signal=9) {
  function ema(vals, p) {
    const k = 2/(p+1); let e = vals[0];
    return vals.map((v,i) => { if(i===0) return e; e = v*k + e*(1-k); return e; });
  }
  const closes = data.map(d => d.close);
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = emaFast.map((f,i) => f - emaSlow[i]);
  const signalLine = ema(macdLine.slice(slow-1), signal);
  const result = { macd: [], signal: [], hist: [] };
  for (let i = slow-1; i < data.length; i++) {
    const si = i - (slow-1);
    if (si < signal-1) continue;
    const ssi = si - (signal-1);
    const m = macdLine[i], s = signalLine[ssi], h = m - s;
    result.macd.push({ time: data[i].time, value: parseFloat(m.toFixed(4)) });
    result.signal.push({ time: data[i].time, value: parseFloat(s.toFixed(4)) });
    result.hist.push({ time: data[i].time, value: parseFloat(h.toFixed(4)), color: h >= 0 ? "rgba(38,166,154,0.7)" : "rgba(239,83,80,0.7)" });
  }
  return result;
}

// ── Render data to charts ─────────────────────────────────
function renderCharts(data) {
  if (!data.length) return;
  rawData = data;

  const candleData = data.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close }));
  series.candle.setData(candleData);

  const bb = calcBB(data);
  series.bb_upper.setData(bb.upper);
  series.bb_mid.setData(bb.mid);
  series.bb_lower.setData(bb.lower);

  series.ma20.setData(calcSMA(data, 20));
  series.ma50.setData(calcSMA(data, 50));
  series.ma200.setData(calcSMA(data, 200));

  series.vol.setData(data.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)" })));

  const rsiData = calcRSI(data);
  series.rsi.setData(rsiData);
  if (rsiData.length) {
    series.rsi70.setData(rsiData.map(d => ({ time: d.time, value: 70 })));
    series.rsi30.setData(rsiData.map(d => ({ time: d.time, value: 30 })));
  }

  const macdData = calcMACD(data);
  series.macdLine.setData(macdData.macd);
  series.macdSignal.setData(macdData.signal);
  series.macdHist.setData(macdData.hist);

  charts.main.timeScale().fitContent();

  // Update price bar
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const chg = last.close - prev.close;
  const pct = (chg / prev.close * 100).toFixed(2);
  const cls = chg >= 0 ? "up" : "down";
  const lastRSI = rsiData[rsiData.length - 1];
  document.getElementById("priceBar").innerHTML = \`
    <span class="price-main \${cls}">\${last.close.toLocaleString("vi-VN")}</span>
    <span class="price-change \${cls}">\${chg >= 0 ? "+" : ""}\${chg.toFixed(2)} (\${chg >= 0 ? "+" : ""}\${pct}%)</span>
    <span class="price-meta">O: \${last.open.toLocaleString()} &nbsp; H: \${last.high.toLocaleString()} &nbsp; L: \${last.low.toLocaleString()} &nbsp; V: \${(last.volume/1e6).toFixed(1)}M</span>
    \${lastRSI ? \`<span class="price-meta" style="margin-left:auto;color:\${lastRSI.value>70?"#ef5350":lastRSI.value<30?"#26a69a":"#ab47bc"}">RSI: \${lastRSI.value}</span>\` : ""}
  \`;
}

// ── Toggle indicators ─────────────────────────────────────
function applyVisibility() {
  const { bb, ma, vol, rsi, macd } = state.inds;
  if (series.bb_upper) { series.bb_upper.applyOptions({ visible: bb }); series.bb_mid.applyOptions({ visible: bb }); series.bb_lower.applyOptions({ visible: bb }); }
  if (series.ma20) { series.ma20.applyOptions({ visible: ma }); series.ma50.applyOptions({ visible: ma }); series.ma200.applyOptions({ visible: ma }); }
  document.getElementById("chart-vol").style.display  = vol  ? "block" : "none";
  document.getElementById("chart-rsi").style.display  = rsi  ? "block" : "none";
  document.getElementById("chart-macd").style.display = macd ? "block" : "none";
  setTimeout(() => Object.values(charts).forEach(c => c.resize(c.chartElement().offsetWidth, c.chartElement().offsetHeight)), 50);
}

function toggleInd(ind) {
  state.inds[ind] = !state.inds[ind];
  document.querySelector(\`[data-ind="\${ind}"]\`).classList.toggle("active", state.inds[ind]);
  applyVisibility();
}

// ── Switch ticker / timeframe ─────────────────────────────
async function switchTicker(id) {
  state.ticker = id;
  document.querySelectorAll("#tickerRow .btn").forEach(b => b.classList.toggle("active", b.dataset.id === id));
  document.getElementById("priceBar").innerHTML = '<div class="loading"><div class="spinner"></div> Đang tải...</div>';
  const data = await fetchData(id, state.tf);
  renderCharts(data);
}

async function switchTF(tf) {
  state.tf = tf;
  document.querySelectorAll(".btn-tf").forEach(b => b.classList.toggle("active", b.dataset.tf === tf));
  const data = await fetchData(state.ticker, tf);
  renderCharts(data);
}

// ── Boot ──────────────────────────────────────────────────
initTickers();
initCharts();
switchTicker("VCB");
</script>
</body>
</html>`);
};
