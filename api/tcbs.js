// api/tcbs.js — proxy TCBS API để tránh CORS
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { ticker, type } = req.query;
  if (!ticker || !type) {
    return res.status(400).json({ error: "Missing ticker or type" });
  }

  try {
    const count = type === "weekly" ? 200 : 365;
    let url;

    if (ticker === "VNINDEX") {
      url = `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=VNINDEX&type=${type}&count=${count}`;
    } else {
      url = `https://apipubaws.tcbs.com.vn/stock-insight/v2/stock/bars-long-term?ticker=${ticker}&type=${type}&count=${count}`;
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("TCBS proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
