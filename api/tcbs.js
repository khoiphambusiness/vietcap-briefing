// api/tcbs.js — proxy Yahoo Finance cho cổ phiếu Việt Nam
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { ticker, type } = req.query;
  if (!ticker || !type) {
    return res.status(400).json({ error: "Missing ticker or type" });
  }

  try {
    // Yahoo Finance: VCB.VN, TCB.VN, VNINDEX = ^VNINDEX
    // Thử nhiều format cho VNINDEX
    const tickerMap = {
      "VNINDEX": "VNINDEX.VN",
    };
    const yahooTicker = tickerMap[ticker] || `${ticker}.VN`;

    const interval = type === "weekly" ? "1wk" : "1d";
    const range    = type === "weekly" ? "4y"  : "1y";

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=${interval}&range=${range}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    const json = await response.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      return res.status(200).json({ data: [] });
    }

    const timestamps = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};

    const bars = timestamps.map((t, i) => ({
      tradingDate: new Date(t * 1000).toISOString().split("T")[0],
      open:   Math.round((q.open?.[i]   || 0) * 100) / 100,
      high:   Math.round((q.high?.[i]   || 0) * 100) / 100,
      low:    Math.round((q.low?.[i]    || 0) * 100) / 100,
      close:  Math.round((q.close?.[i]  || 0) * 100) / 100,
      volume: q.volume?.[i] || 0,
    })).filter(b => b.close > 0);

    res.status(200).json({ data: bars });
  } catch (err) {
    console.error("Yahoo Finance proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
