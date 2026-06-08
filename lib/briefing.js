// lib/briefing.js — Claude API + deep analysis prompts

const Anthropic = require("@anthropic-ai/sdk");
const nodemailer = require("nodemailer");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Web search via Serper ─────────────────────────────────
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
    return "";
  }
}

// ─── Gather market data ────────────────────────────────────
async function gatherMarketData(type) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const queries = {
    morning: [
      "VN-Index HNX-Index điểm số khối lượng hôm nay " + today,
      "VN-Index RSI MACD phân tích kỹ thuật xu hướng " + today,
      "S&P 500 Nasdaq Dow Jones đóng cửa tối qua",
      "giá dầu WTI Brent Fed lãi suất DXY hôm nay",
      "tin tức kinh tế chính trị thế giới tác động chứng khoán " + today,
      "khối ngoại mua bán ròng VN-Index top mã " + today,
      "top cổ phiếu tăng giảm mạnh HOSE " + today,
    ],
    midday: [
      "VN-Index điểm số phiên sáng khối lượng " + today,
      "cổ phiếu tăng giảm mạnh nhất HOSE buổi sáng " + today,
      "tin tức kinh tế thế giới nổi bật hôm nay " + today,
      "IPO cổ phiếu đáng chú ý chứng khoán Việt Nam " + today,
      "khối ngoại mua bán ròng phiên sáng " + today,
    ],
    eod: [
      "VN-Index đóng cửa điểm số khối lượng " + today,
      "top cổ phiếu tăng giảm mạnh nhất HOSE cả ngày " + today,
      "khối ngoại mua bán ròng tổng kết " + today,
      "nhận định phân tích thị trường chứng khoán ngày mai",
      "VN-Index RSI MACD kỹ thuật sau phiên " + today,
    ],
  };

  const results = await Promise.all(queries[type].map((q) => searchWeb(q)));
  return results.filter(Boolean).join("\n\n---\n\n");
}

// ─── Build deep analysis prompt ────────────────────────────
function buildPrompt(type, marketData, watchlist) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const tickers = watchlist.join(", ");

  const systemPrompt = `Bạn là chuyên gia phân tích thị trường chứng khoán cao cấp (Senior Research Analyst) của VietCap Securities với 15 năm kinh nghiệm. 

Nguyên tắc phân tích BẮT BUỘC:
- LUÔN đưa ra quan điểm rõ ràng: MUA / BÁN / GIỮ / TRÁNH — không được mơ hồ
- LUÔN nêu vùng giá cụ thể: entry point, target price, stop loss
- LUÔN giải thích TẠI SAO với lập luận kỹ thuật + cơ bản
- LUÔN đánh giá rủi ro/reward ratio
- KHÔNG dùng ngôn ngữ né tránh như "có thể", "theo dõi thêm", "cần quan sát" mà không có recommendation cụ thể
- KHÔNG tóm tắt lại tin tức — phải PHÂN TÍCH tác động của tin tức lên giá
- Nếu thị trường có tín hiệu xấu, nói thẳng là xấu và khuyến nghị phòng thủ cụ thể
- Viết như đang báo cáo cho fund manager, không phải cho nhà đầu tư cá nhân phổ thông`;

  const prompts = {
    morning: `Hôm nay là ${today}. Dữ liệu thị trường mới nhất:

${marketData}

Viết báo cáo MORNING BRIEF chuyên sâu gồm:

## 1. TỔNG QUAN THỊ TRƯỜNG
- VN-Index & HNX-Index: điểm số, % thay đổi, khối lượng so với TB 20 phiên
- Nhận định ngắn gọn: thị trường đang ở giai đoạn nào (tích lũy/phân phối/uptrend/downtrend)?

## 2. PHÂN TÍCH KỸ THUẬT VN-INDEX
- RSI (14): giá trị cụ thể, đang divergence không?
- MACD: cắt lên/xuống, histogram đang mở rộng hay thu hẹp?
- Bollinger Bands: giá đang ở đâu, bandwidth đang co/nở?
- MA 20/50/200: xếp hàng bullish hay bearish? Golden/death cross?
- Volume: confirmation hay divergence với price action?
- Kết luận kỹ thuật: TÍCH CỰC / TIÊU CỰC / TRUNG TÍNH — lý do cụ thể
- Vùng hỗ trợ: [số điểm cụ thể] — [lý do tại sao đây là hỗ trợ]
- Vùng kháng cự: [số điểm cụ thể] — [lý do tại sao đây là kháng cự]

## 3. TOP MOVERS & CƠ HỘI
- Top 5 tăng mạnh: phân tích ngắn từng mã — momentum thật hay pump?
- Top 5 giảm mạnh: đây là cơ hội mua hay tiếp tục tránh?
- 2-3 mã có setup kỹ thuật tốt nhất hôm nay: entry point cụ thể, target, stop loss

## 4. DANH MỤC THEO DÕI: ${tickers}
Với TỪNG mã, cung cấp:
- Giá hiện tại & % thay đổi
- RSI + tín hiệu MACD
- Khuyến nghị: MUA / BÁN / GIỮ / TRÁNH
- Entry point: [vùng giá cụ thể]
- Target: [vùng giá cụ thể]  
- Stop loss: [vùng giá cụ thể]
- Lý do ngắn gọn (1-2 câu)

## 5. DÒNG TIỀN KHỐI NGOẠI
- Net buy/sell tổng (tỷ đồng)
- Top 3 mã mua ròng → tín hiệu gì?
- Top 3 mã bán ròng → cần lo ngại không?
- Xu hướng khối ngoại 1 tuần/1 tháng → bullish hay bearish?

## 6. VĨ MÔ & THỊ TRƯỜNG MỸ
- S&P 500/Nasdaq/Dow: số điểm, % thay đổi, tín hiệu kỹ thuật ngắn
- DXY: tác động lên VND và dòng vốn EM
- Dầu WTI/Brent: tác động lên nhóm cổ phiếu nào tại VN?
- Fed: khả năng thay đổi lãi suất tới — tác động lên VN-Index?
- Phân tích 2-3 sự kiện chính trị/kinh tế thế giới: tác động CỤ THỂ lên nhóm ngành nào tại VN?

## 7. KHUYẾN NGHỊ MỞ CỬA
- Tâm lý tổng thể: TÍCH CỰC / THẬN TRỌNG / TIÊU CỰC
- Chiến lược cụ thể cho phiên hôm nay
- 2-3 mã ưu tiên quan sát khi mở cửa với lý do cụ thể
- Mức độ rủi ro: THẤP / TRUNG BÌNH / CAO — lý do`,

    midday: `Hôm nay là ${today}. Dữ liệu thị trường giữa phiên:

${marketData}

Viết báo cáo MIDDAY SNAPSHOT chuyên sâu gồm:

## 1. DIỄN BIẾN PHIÊN SÁNG
- VN-Index: điểm số hiện tại, % thay đổi, khối lượng 
- So sánh với kỳ vọng buổi sáng: đúng hay sai dự báo? Tại sao?
- Breadth: số mã tăng/giảm/đứng — thị trường rộng hay hẹp?

## 2. PHÂN TÍCH KỸ THUẬT GIỮA PHIÊN
- RSI khung 15 phút: overbought/oversold/neutral?
- Momentum: đang tăng tốc hay giảm tốc vào phiên chiều?
- Volume pattern: tích lũy hay phân phối?
- Dự báo: VN-Index phiên chiều khả năng cao sẽ [tăng/giảm/đi ngang] vì [lý do kỹ thuật cụ thể]

## 3. TIN TỨC & TÁC ĐỘNG
Với từng tin tức quan trọng trong ngày:
- [Tên sự kiện]: tác động CỤ THỂ lên nhóm ngành/mã nào? Tích cực hay tiêu cực? Mức độ nào?

## 4. CƠ HỘI PHIÊN CHIỀU
- 3 mã có setup tốt nhất cho phiên chiều
- Với từng mã: entry point, target, stop loss, lý do
- IPOs hoặc sự kiện corporate action đáng chú ý

## 5. CẬP NHẬT DANH MỤC: ${tickers}
- Diễn biến từng mã so với mở cửa
- Có mã nào cần action ngay không? (cắt lỗ/chốt lời/thêm vị thế)

## 6. KHUYẾN NGHỊ PHIÊN CHIỀU
- Chiến lược cụ thể: offensive hay defensive?
- 2-3 trade ideas với entry/target/stop cụ thể`,

    eod: `Hôm nay là ${today}. Dữ liệu tổng kết phiên:

${marketData}

Viết báo cáo EOD SUMMARY chuyên sâu gồm:

## 1. TỔNG KẾT PHIÊN
- VN-Index đóng cửa: điểm số, % thay đổi, khối lượng vs TB 20 phiên
- HNX-Index: điểm số, % thay đổi
- Breadth cuối phiên: mã tăng/giảm/đứng
- Đánh giá phiên: TÍCH CỰC / TIÊU CỰC / TRUNG TÍNH và lý do

## 2. PHÂN TÍCH KỸ THUẬT SAU PHIÊN
- RSI (14) đóng cửa: giá trị, trend
- MACD: tín hiệu mua/bán, có phân kỳ (divergence) không?
- Nến ngày hôm nay: mẫu hình gì? Ý nghĩa?
- Bollinger Bands: vị trí giá, bandwidth
- Volume: xác nhận hay phủ nhận xu hướng giá?
- Kết luận: xu hướng ngắn hạn (1-5 phiên) là GÌ và TẠI SAO

## 3. TOP MOVERS PHÂN TÍCH
- Top 5 tăng: momentum có bền không? Nên chase hay bỏ qua?
- Top 5 giảm: đây là cơ hội mua đáy hay tránh?
- Mã nào có volume bất thường cần theo dõi?

## 4. DÒNG TIỀN KHỐI NGOẠI TỔNG KẾT
- Net buy/sell cả ngày
- Xu hướng so với tuần/tháng
- Phân tích: smart money đang làm gì?

## 5. KẾT QUẢ DANH MỤC: ${tickers}
Với TỪNG mã:
- Đóng cửa & % thay đổi
- RSI đóng cửa
- Setup cho ngày mai: MUA THÊM / GIỮ / CẮT LỖ / CHỐT LỜI
- Vùng giá cần theo dõi ngày mai

## 6. DỰ BÁO & CHIẾN LƯỢC NGÀY MAI
- Kịch bản cơ sở (xác suất 60%): VN-Index sẽ [dự báo cụ thể] vì [lý do]
- Kịch bản tích cực (20%): nếu [điều kiện] thì có thể [kết quả]
- Kịch bản tiêu cực (20%): nếu [điều kiện] thì có thể [kết quả]
- Chiến lược: cụ thể nên làm gì ngày mai
- 3 mã ưu tiên ngày mai: entry, target, stop`,
  };

  return { system: systemPrompt, user: prompts[type] };
}

// ─── Call Claude API ───────────────────────────────────────
async function writeReport(promptObj) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: promptObj.system,
    messages: [{ role: "user", content: promptObj.user }],
  });
  return message.content[0]?.text || "";
}

// ─── Build HTML email ──────────────────────────────────────
function buildEmailHtml(type, reportText, today) {
  const labels = {
    morning: { title: "Morning Brief",  color: "#c0392b", time: "8:30 AM" },
    midday:  { title: "Midday Snapshot", color: "#e67e22", time: "1:00 PM" },
    eod:     { title: "EOD Summary",    color: "#1a5fa8", time: "3:00 PM" },
  };
  const { title, color, time } = labels[type];

  // Convert markdown-style headers và bold
  const formattedText = reportText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^## (.*$)/gm, `<h3 style="color:${color};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin:20px 0 8px;border-bottom:1px solid #f0f0f0;padding-bottom:6px;">$1</h3>`)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.*$)/gm, "<li style='margin:3px 0;'>$1</li>")
    .replace(/\n\n/g, "</p><p style='margin:8px 0;'>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:${color};padding:24px 32px;">
      <div style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">VietCap Securities · Senior Research</div>
      <div style="color:#fff;font-size:22px;font-weight:bold;">${title}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">${today} · ${time} GMT+7</div>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 32px;font-size:13px;line-height:1.8;color:#1a1a1a;">
      <p style="margin:0 0 8px;">${formattedText}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 32px;text-align:center;border-top:1px solid #eee;">
      <a href="https://vietcap-briefing-v2.vercel.app/api/chart" target="_blank"
         style="display:inline-block;padding:10px 24px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">
        📈 Xem biểu đồ kỹ thuật
      </a>
      <p style="font-size:11px;color:#aaa;margin:10px 0 0;">VCB · TCB · VNM · HPG · RSI · MACD · Bollinger Bands · MA 20/50/200</p>
    </td>
  </tr>
  <tr>
    <td style="background:#f7f7f7;padding:12px 32px;text-align:center;">
      <p style="font-size:11px;color:#999;margin:0;">VietCap AI Briefing · Senior Research Analysis · Chỉ mang tính tham khảo · ${today}</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Send email ────────────────────────────────────────────
async function sendEmail(subject, htmlBody) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  await transporter.sendMail({
    from: `"VietCap Senior Research" <${process.env.GMAIL_USER}>`,
    to: process.env.RECIPIENT_EMAIL,
    subject,
    html: htmlBody,
  });
}

// ─── Main export ───────────────────────────────────────────
async function runBriefing(type) {
  const watchlist = (process.env.WATCHLIST || "VCB,TCB,VNM,HPG").split(",");
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const subjectLabels = {
    morning: "Morning Brief",
    midday:  "Midday Snapshot",
    eod:     "EOD Summary",
  };

  console.log(`[${type}] Searching market data...`);
  const marketData = await gatherMarketData(type);

  console.log(`[${type}] Writing deep analysis with Claude...`);
  const promptObj = buildPrompt(type, marketData, watchlist);
  const reportText = await writeReport(promptObj);

  console.log(`[${type}] Sending email...`);
  const subject = `[VietCap ${subjectLabels[type]}] ${today}`;
  const html = buildEmailHtml(type, reportText, today);
  await sendEmail(subject, html);

  console.log(`[${type}] ✅ Done`);
  return { success: true, subject };
}

module.exports = { runBriefing };
