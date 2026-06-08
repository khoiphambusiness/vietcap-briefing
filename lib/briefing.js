// lib/briefing.js
// Core engine: search web (Serper) → Groq AI → send Gmail

const Groq = require("groq-sdk");
const nodemailer = require("nodemailer");

// ─── Groq client ───────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Web search via Serper (free 2500 queries) ─────────────
async function searchWeb(query) {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: "vn", hl: "vi", num: 5 }),
    });
    const data = await res.json();
    return (data.organic || [])
      .map((r) => `${r.title}: ${r.snippet}`)
      .join("\n");
  } catch (e) {
    console.error("Search error:", e.message);
    return "";
  }
}

// ─── Gather market data via multiple searches ───────────────
async function gatherMarketData(type) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const queries = {
    morning: [
      "VN-Index HNX-Index hôm nay " + today,
      "thị trường chứng khoán Mỹ S&P 500 Nasdaq tối qua",
      "giá dầu WTI Fed lãi suất hôm nay",
      "tin tức kinh tế chính trị thế giới tác động chứng khoán",
      "khối ngoại mua bán ròng VN-Index hôm nay",
    ],
    midday: [
      "VN-Index phiên sáng hôm nay " + today,
      "cổ phiếu tăng giảm mạnh HOSE hôm nay",
      "tin tức kinh tế thế giới hôm nay " + today,
      "IPO cổ phiếu đáng chú ý chứng khoán Việt Nam hôm nay",
    ],
    eod: [
      "VN-Index đóng cửa hôm nay " + today,
      "top cổ phiếu tăng giảm mạnh nhất HOSE hôm nay",
      "khối ngoại mua bán ròng tổng kết hôm nay",
      "nhận định thị trường chứng khoán ngày mai",
    ],
  };

  const results = await Promise.all(
    queries[type].map((q) => searchWeb(q))
  );

  return results.filter(Boolean).join("\n\n---\n\n");
}

// ─── Build prompt per report type ──────────────────────────
function buildPrompt(type, marketData, watchlist) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const tickers = watchlist.join(", ");

  const prompts = {
    morning: `Bạn là chuyên gia phân tích thị trường chứng khoán Việt Nam của VietCap Securities. Hôm nay là ${today}.

Dựa vào dữ liệu thị trường sau:
${marketData}

Viết báo cáo BUỔI SÁNG (trước 9:00 AM) chuyên nghiệp gồm:
1. VN-Index & HNX-Index: tổng quan, xu hướng kỹ thuật, vùng hỗ trợ/kháng cự
2. Top 5 cổ phiếu tăng mạnh & top 5 giảm mạnh nhất HOSE (nếu có data)
3. Phân tích nhanh danh mục: ${tickers}
4. Dòng tiền khối ngoại: net buy/sell, top mã mua/bán ròng
5. Thị trường Mỹ qua đêm: S&P 500, Nasdaq, DXY, dầu WTI, tín hiệu Fed
6. Sự kiện chính trị/kinh tế thế giới tác động hôm nay
7. Khuyến nghị mở cửa: 2-3 câu ngắn gọn

Viết bằng tiếng Việt, tông chuyên nghiệp, súc tích, format rõ ràng với tiêu đề từng phần.`,

    midday: `Bạn là chuyên gia phân tích thị trường chứng khoán Việt Nam của VietCap Securities. Hôm nay là ${today}.

Dựa vào dữ liệu thị trường sau:
${marketData}

Viết báo cáo GIỮA PHIÊN (1:00 PM) gồm:
1. VN-Index hiện tại: điểm số, % thay đổi so với mở cửa, khối lượng nửa ngày
2. Tin tức trong ngày: chính trị, kinh tế thế giới, sự kiện nổi bật ảnh hưởng thị trường
3. IPOs hôm nay & cổ phiếu đáng chú ý trong phiên chiều
4. Cập nhật nhanh danh mục: ${tickers} — so sánh với mở cửa
5. 2-3 cổ phiếu nên xem xét phiên chiều với lý do cụ thể

Viết bằng tiếng Việt, tông chuyên nghiệp, súc tích.`,

    eod: `Bạn là chuyên gia phân tích thị trường chứng khoán Việt Nam của VietCap Securities. Hôm nay là ${today}.

Dựa vào dữ liệu thị trường sau:
${marketData}

Viết báo cáo TỔNG KẾT PHIÊN (3:00 PM) gồm:
1. VN-Index đóng cửa: điểm số, % thay đổi, khối lượng vs bình quân
2. Top 5 cổ phiếu tăng mạnh nhất & top 5 giảm mạnh nhất cả ngày
3. Dòng tiền khối ngoại cả ngày: tổng net buy/sell, top mã
4. Kết quả danh mục: ${tickers}
5. Định hướng & điểm then chốt cần theo dõi cho ngày mai

Viết bằng tiếng Việt, tông chuyên nghiệp, súc tích.`,
  };

  return prompts[type];
}

// ─── Call Groq to write the report ─────────────────────────
async function writeReport(prompt) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2048,
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content || "";
}

// ─── Build HTML email ───────────────────────────────────────
function buildEmailHtml(type, reportText, today) {
  const labels = {
    morning: { title: "Morning Brief",   color: "#c0392b", time: "8:30 AM"  },
    midday:  { title: "Midday Summary",  color: "#e67e22", time: "1:00 PM"  },
    eod:     { title: "EOD Summary",     color: "#1a5fa8", time: "3:00 PM"  },
  };
  const { title, color, time } = labels[type];

  const formattedText = reportText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
  <tr>
    <td style="background:${color};padding:24px 32px;">
      <div style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">VietCap Securities · Market Intelligence</div>
      <div style="color:#fff;font-size:22px;font-weight:bold;">${title}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">${today} · ${time} GMT+7</div>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 32px;font-size:14px;line-height:1.8;color:#1a1a1a;">
      ${formattedText}
    </td>
  </tr>
  <tr>
    <td style="background:#f7f7f7;padding:12px 32px;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:11px;color:#999;margin:0;">VietCap AI Briefing · Chỉ mang tính tham khảo · ${today}</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Send email via Gmail SMTP ──────────────────────────────
async function sendEmail(subject, htmlBody) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"VietCap Briefing" <${process.env.GMAIL_USER}>`,
    to: process.env.RECIPIENT_EMAIL,
    subject,
    html: htmlBody,
  });
}

// ─── Main export ────────────────────────────────────────────
async function runBriefing(type) {
  const watchlist = (process.env.WATCHLIST || "VCB,TCB,VNM,HPG").split(",");
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const subjectLabels = {
    morning: "Morning Brief",
    midday:  "Midday Summary",
    eod:     "EOD Summary",
  };

  console.log(`[${type}] Searching market data...`);
  const marketData = await gatherMarketData(type);

  console.log(`[${type}] Writing report with Groq...`);
  const prompt = buildPrompt(type, marketData, watchlist);
  const reportText = await writeReport(prompt);

  console.log(`[${type}] Sending email...`);
  const subject = `[VietCap ${subjectLabels[type]}] ${today}`;
  const html = buildEmailHtml(type, reportText, today);
  await sendEmail(subject, html);

  console.log(`[${type}] ✅ Done — sent to ${process.env.RECIPIENT_EMAIL}`);
  return { success: true, subject };
}

module.exports = { runBriefing };
