// api/morning.js — chạy lúc 8:30 AM GMT+7 (1:30 AM UTC) các ngày T2-T6
const { runBriefing } = require("../lib/briefing");

module.exports = async (req, res) => {
  // Chỉ cho phép Vercel Cron hoặc request có đúng secret
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await runBriefing("morning");
    res.status(200).json(result);
  } catch (err) {
    console.error("[morning] Error:", err);
    res.status(500).json({ error: err.message });
  }
};
