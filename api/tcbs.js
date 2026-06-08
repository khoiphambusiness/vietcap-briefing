// api/tcbs.js — proxy VNDirect API
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { ticker, type } = req.query;
  if (!ticker || !type) {
    return res.status(400).json({ error: "Missing ticker or type" });
  }

  try {
    const toDate = new Date().toISOString().split("T")[0].replace(/-/g, "-");
    const fromDate = new Date(Date.now() - (type === "weekly" ? 200 * 7 : 365) * 86400000)
      .toISOString().split("T")[0];

    const url = `https://finfo-api.vndirect.com.vn/v4/stock_prices?code=${ticker}&fromDate=${fromDate}&toDate=${toDate}&size=365&sort=date`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": "https://chart.vndirect.com.vn",
        "Referer": "https://chart.vndirect.com.vn/",
      },
    });

    const data = await response.json();
    const items = data.data || [];

    const bars = items.map(b => ({
      tradingDate: b.date,
      open:   parseFloat(b.open)   * 1000,
      high:   parseFloat(b.high)   * 1000,
      low:    parseFloat(b.low)    * 1000,
      close:  parseFloat(b.close)  * 1000,
      volume: parseInt(b.nmVolume) || parseInt(b.volume) || 0,
    })).filter(b => b.close > 0);

    res.status(200).json({ data: bars });
  } catch (err) {
    console.error("VNDirect proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
