// api/tcbs.js — proxy SSI data API để tránh CORS
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { ticker, type } = req.query;
  if (!ticker || !type) {
    return res.status(400).json({ error: "Missing ticker or type" });
  }

  try {
    const resolution = type === "weekly" ? "W" : "D";
    const to = Math.floor(Date.now() / 1000);
    const from = to - (type === "weekly" ? 200 * 7 * 86400 : 365 * 86400);

    const url = `https://iboard-query.ssi.com.vn/chart/history?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${to}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Origin": "https://iboard.ssi.com.vn",
        "Referer": "https://iboard.ssi.com.vn/",
      },
    });

    const data = await response.json();

    // Convert SSI format to OHLCV array
    if (!data.t || !data.t.length) {
      return res.status(200).json({ data: [] });
    }

    const bars = data.t.map((time, i) => ({
      tradingDate: new Date(time * 1000).toISOString().split("T")[0],
      open:   data.o[i],
      high:   data.h[i],
      low:    data.l[i],
      close:  data.c[i],
      volume: data.v[i],
    }));

    res.status(200).json({ data: bars });
  } catch (err) {
    console.error("SSI proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
