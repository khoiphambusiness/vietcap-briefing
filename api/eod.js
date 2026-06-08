// api/eod.js — chạy lúc 3:00 PM GMT+7 (8:00 AM UTC) các ngày T2-T6
const { runBriefing } = require("../lib/briefing");

module.exports = async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await runBriefing("eod");
    res.status(200).json(result);
  } catch (err) {
    console.error("[eod] Error:", err);
    res.status(500).json({ error: err.message });
  }
};
