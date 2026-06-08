// api/tcbs.js — proxy Yahoo Finance cho cổ phiếu Việt Nam
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { ticker, type } = req.query;
  if (!ticker || !type) {
    return res.status(400).json({ error: "Missing ticker or type" });
  }

  try {
    let bars = [];

    if (ticker === "VNINDEX") {
      // Dùng stooq.com cho VN-Index
      const to = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const from = new Date(Date.now() - (type === "weekly" ? 200 * 7 : 365) * 86400000)
        .toISOString().split("T")[0].replace(/-/g, "");
      const url = `https://stooq.com/q/d/l/?s=%5Evni&d1=${from}&d2=${to}&i=${type === "weekly" ? "w" : "d"}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const csv = await response.text();
      const lines = csv.trim().split("\n").slice(1);
      bars = lines.map(line => {
        const [date, open, high, low, close, volume] = line.split(",");
        return {
          tradingDate: date,
          open:   parseFloat(open)   || 0,
          high:   parseFloat(high)   || 0,
          low:    parseFloat(low)    || 0,
          close:  parseFloat(close)  || 0,
          volume: parseInt(volume)   || 0,
        };
      }).filter(b => b.close > 0);

    } else {
      // Dùng Yahoo Finance cho cổ phiếu .VN
      const yahooTicker = `${ticker}.VN`;
      const interval = type === "weekly" ? "1wk" : "1d";
      const range    = type === "weekly" ? "4y"  : "1y";
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=${interval}&range=${range}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      });
      const json = await response.json();
      const result = json?.chart?.result?.[0];
      if (result) {
        const timestamps = result.timestamp || [];
        const q = result.indicators?.quote?.[0] || {};
        bars = timestamps.map((t, i) => ({
          tradingDate: new Date(t * 1000).toISOString().split("T")[0],
          open:   Math.round((q.open?.[i]  || 0) * 100) / 100,
          high:   Math.round((q.high?.[i]  || 0) * 100) / 100,
          low:    Math.round((q.low?.[i]   || 0) * 100) / 100,
          close:  Math.round((q.close?.[i] || 0) * 100) / 100,
          volume: q.volume?.[i] || 0,
        })).filter(b => b.close > 0);
      }
    }

    res.status(200).json({ data: bars });
  } catch (err) {
    console.error("Yahoo Finance proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
