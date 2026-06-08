// lib/briefing.js — Optimized for Vercel free tier (10s limit)
// Strategy: 5 parallel searches + Claude with streaming timeout handling

const Anthropic = require("@anthropic-ai/sdk");
const nodemailer = require("nodemailer");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Single search with 4s timeout ────────────────────────
async function search(query, lang = "vi", country = "vn") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: country, hl: lang, num: 5 }),
    });
    const data = await res.json();
    return (data.organic || data.news || [])
      .slice(0, 4)
      .map((r) => `${r.title}: ${r.snippet}`)
      .join(" | ");
  } catch (e) {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function searchNews(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: "us", hl: "en", num: 5 }),
    });
    const data = await res.json();
    return (data.news || [])
      .slice(0, 4)
      .map((r) => `[${r.source || ""}] ${r.title}: ${r.snippet}`)
      .join(" | ");
  } catch (e) {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

// ─── 5 batched searches only ───────────────────────────────
async function gatherMarketData() {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const [vnData, usData, geoData, commodityData, globalData] = await Promise.all([
    // Batch 1: Vietnam market + macro + policy
    search(
      `VN-Index HNX cổ phiếu tăng giảm khối ngoại NHNN tỷ giá lãi suất ${today}`,
      "vi", "vn"
    ),
    // Batch 2: US market + Fed + economy
    searchNews(
      `Fed interest rate S&P 500 Nasdaq Dow Jones US economy CPI GDP 2026`
    ),
    // Batch 3: Geopolitics — Iran, Ukraine, US-China
    searchNews(
      `Iran Israel Middle East Ukraine Russia war US China trade market impact 2026`
    ),
    // Batch 4: Commodities — oil, gold, metals
    searchNews(
      `crude oil WTI Brent OPEC gold silver steel copper DXY dollar 2026`
    ),
    // Batch 5: Global economy + sectors
    searchNews(
      `China economy emerging markets Vietnam investment tech AI semiconductor Asia 2026`
    ),
  ]);

  return { vnData, usData, geoData, commodityData, globalData, today };
}

// ─── Build prompt ──────────────────────────────────────────
function buildPrompt(type, d, watchlist) {
  const tickers = watchlist.join(", ");

  const system = `Bạn là Senior Research Analyst của VietCap Securities. Viết báo cáo thị trường chuyên sâu cho broker chuyên nghiệp.
Nguyên tắc: (1) Phân tích TÁC ĐỘNG — không tóm tắt tin tức; (2) Kết nối macro thế giới → VN cụ thể; (3) Đưa ra MUA/BÁN/GIỮ với entry/target/stop rõ ràng; (4) Nêu catalyst và rủi ro; (5) Không dùng ngôn ngữ mơ hồ.`;

  const dataBlock = `
DỮ LIỆU THỊ TRƯỜNG (${d.today}):
[VN] ${d.vnData}
[Mỹ/Fed] ${d.usData}
[Địa chính trị: Iran/Ukraine/Mỹ-Trung] ${d.geoData}
[Hàng hóa: Dầu/Vàng/Thép/USD] ${d.commodityData}
[Kinh tế TQ/Châu Á/Tech/EM] ${d.globalData}`;

  const templates = {
    morning: `${dataBlock}

Viết MORNING BRIEF (${d.today}):

## 1. EXECUTIVE SUMMARY
Bức tranh tổng thể hôm nay trong 3-4 câu — thị trường sẽ như thế nào và tại sao?

## 2. VN-INDEX KỸ THUẬT
RSI, MACD, Bollinger Bands, MA 20/50/200. Hỗ trợ/kháng cự. Kết luận: BULLISH/BEARISH/NEUTRAL.

## 3. VĨ MÔ VIỆT NAM
NHNN, tỷ giá, lãi suất, đầu tư công, chính trị — tác động lên nhóm ngành nào? Tại sao?

## 4. THỊ TRƯỜNG MỸ & FED
S&P500/Nasdaq đêm qua, Fed stance, DXY → tác động lên dòng vốn EM và VN-Index?

## 5. ĐỊA CHÍNH TRỊ & XUNG ĐỘT
Với TỪNG điểm nóng (Iran/Israel, Ukraine/Nga, Mỹ-Trung):
- Diễn biến mới nhất + tác động CỤ THỂ lên nhóm cổ phiếu VN nào? Mức độ?

## 6. HÀNG HÓA & TIỀN TỆ → TÁC ĐỘNG VN
- Dầu WTI/Brent: giá, xu hướng → GAS/BSR/PLX/PVD/HVN bị ảnh hưởng thế nào?
- Vàng: safe haven signal gì?
- Thép/Đồng: HPG/HSG?
- DXY/USD/VND: áp lực tỷ giá → xuất khẩu vs nhập khẩu VN?

## 7. KINH TẾ TRUNG QUỐC & CHÂU Á
Tác động lên xuất khẩu VN, dòng vốn FDI, nhóm ngành liên quan?

## 8. NEWS CATALYSTS HÔM NAY
Tin nào có thể gây BIẾN ĐỘNG MẠNH? Tác động lên nhóm ngành/mã cụ thể nào?

## 9. CỔ PHIẾU TIỀM NĂNG HÔM NAY
Top 5 cơ hội (kỹ thuật + catalyst + macro):
**[MÃ]** — Entry: [x] | Target: [x] (+[%]) | Stop: [x] (-[%]) | R/R: [x] | Lý do: [x]

## 10. CỔ PHIẾU BIẾN ĐỘNG BẤT THƯỜNG
Volume spike, gap, tin tức — nên chú ý hay tránh?

## 11. DANH MỤC ${tickers}
Từng mã: Giá | RSI | **MUA/BÁN/GIỮ/TRÁNH** | Entry | Target | Stop | Lý do

## 12. CHIẾN LƯỢC PHIÊN HÔM NAY
Tổng quan + Top 3 ưu tiên + Rủi ro lớn nhất cần theo dõi`,

    midday: `${dataBlock}

Viết MIDDAY SNAPSHOT (${d.today}):

## 1. DIỄN BIẾN PHIÊN SÁNG
VN-Index hiện tại, breadth, tiền vào nhóm ngành nào?

## 2. NEWS BREAKS & CATALYST CẬP NHẬT
Tin mới trong ngày — tác động gì? Đã phản ánh vào giá chưa?

## 3. ĐỊA CHÍNH TRỊ & HÀNG HÓA CẬP NHẬT
Dầu, vàng, USD thay đổi so với sáng? Tác động phiên chiều?

## 4. KỸ THUẬT GIỮA PHIÊN
RSI, momentum — dự báo phiên chiều?

## 5. CƠ HỘI PHIÊN CHIỀU
Top 3-5 trade ideas: Entry | Target | Stop | Catalyst

## 6. CẬP NHẬT DANH MỤC: ${tickers}
Cần action gì ngay không?

## 7. CHIẾN LƯỢC PHIÊN CHIỀU
Offensive hay defensive? Nhóm ngành nào?`,

    eod: `${dataBlock}

Viết EOD SUMMARY (${d.today}):

## 1. EXECUTIVE SUMMARY
Ngày hôm nay tóm tắt + outlook ngày mai trong 3-4 câu

## 2. TỔNG KẾT PHIÊN
VN-Index đóng cửa, breadth, khối lượng. Đánh giá: TÍCH CỰC/TIÊU CỰC/TRUNG TÍNH + lý do

## 3. KỸ THUẬT SAU PHIÊN
RSI, MACD, nến, volume. Xu hướng 1-5 phiên tới?

## 4. TOP MOVERS PHÂN TÍCH
Top 5 tăng/giảm — momentum bền? Cơ hội hay tránh?

## 5. ĐỊA CHÍNH TRỊ & GLOBAL — TÁC ĐỘNG NGÀY MAI
Từng sự kiện: Iran, Ukraine, Mỹ-Trung, Fed → nhóm ngành VN bị ảnh hưởng thế nào ngày mai?

## 6. HÀNG HÓA & DỰ BÁO ĐÊM NAY
Dầu, vàng, thép đóng cửa. Thị trường Mỹ sắp mở — kỳ vọng gì?

## 7. CỔ PHIẾU TIỀM NĂNG NGÀY MAI
Top 5: Entry | Target | Stop | R/R | Catalyst cụ thể

## 8. DÒNG TIỀN KHỐI NGOẠI
Net buy/sell, smart money đang làm gì?

## 9. KẾT QUẢ DANH MỤC: ${tickers}
Đóng cửa, RSI, action ngày mai

## 10. DỰ BÁO NGÀY MAI
- Cơ sở (60%): [dự báo + lý do + hành động]
- Tích cực (20%): [điều kiện + kết quả]
- Tiêu cực (20%): [điều kiện + kết quả]
- Risk triggers: [list]`,
  };

  return { system, user: templates[type] };
}

// ─── Call Claude API with timeout ─────────────────────────
async function writeReport(promptObj) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: promptObj.system,
    messages: [{ role: "user", content: promptObj.user }],
  });
  return message.content[0]?.text || "";
}

// ─── Build HTML email ──────────────────────────────────────
function buildEmailHtml(type, reportText, today) {
  const labels = {
    morning: { title: "Morning Intelligence Brief",   color: "#c0392b", time: "8:30 AM" },
    midday:  { title: "Midday Intelligence Snapshot", color: "#e67e22", time: "1:00 PM" },
    eod:     { title: "EOD Intelligence Summary",     color: "#1a5fa8", time: "3:00 PM" },
  };
  const { title, color, time } = labels[type];

  const html = reportText
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^## (.*$)/gm, `<h3 style="color:${color};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:20px 0 8px;border-bottom:2px solid ${color}33;padding-bottom:5px;">$1</h3>`)
    .replace(/^\*\*(.*?)\*\*$/gm, `<div style="font-weight:700;margin:8px 0 3px;">$1</div>`)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.*$)/gm, "<li style='margin:3px 0;line-height:1.6;'>$1</li>")
    .replace(/\n\n/g, "</p><p style='margin:6px 0;line-height:1.75;'>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#eef0f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3;padding:20px 0;"><tr><td align="center">
<table width="700" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
  <tr><td style="background:${color};padding:26px 36px;">
    <div style="color:rgba(255,255,255,0.7);font-size:10px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">VietCap Securities · Senior Research & Strategy</div>
    <div style="color:#fff;font-size:22px;font-weight:800;">${title}</div>
    <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:6px;">${today} · ${time} GMT+7</div>
  </td></tr>
  <tr><td style="padding:28px 36px;font-size:13px;line-height:1.75;color:#222;">
    <p style="margin:0;">${html}</p>
  </td></tr>
  <tr><td style="padding:16px 36px 20px;text-align:center;border-top:1px solid #eee;background:#fafafa;">
    <a href="https://vietcap-briefing-v2.vercel.app/api/chart" target="_blank"
       style="display:inline-block;padding:11px 28px;background:${color};color:#fff;text-decoration:none;border-radius:7px;font-size:13px;font-weight:700;">
      📈 Xem biểu đồ kỹ thuật
    </a>
    <p style="font-size:11px;color:#bbb;margin:10px 0 0;">VCB · TCB · VNM · HPG · RSI · MACD · BB · MA 20/50/200</p>
  </td></tr>
  <tr><td style="background:#f5f5f5;padding:12px 36px;text-align:center;">
    <p style="font-size:10px;color:#bbb;margin:0;">VietCap AI Research · Chỉ mang tính tham khảo · ${today}</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ─── Send email ────────────────────────────────────────────
async function sendEmail(subject, htmlBody) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: `"VietCap Research" <${process.env.GMAIL_USER}>`,
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
    morning: "Morning Intelligence Brief",
    midday:  "Midday Snapshot",
    eod:     "EOD Intelligence Summary",
  };

  console.log(`[${type}] Gathering intelligence...`);
  const data = await gatherMarketData();

  console.log(`[${type}] Analyzing with Claude...`);
  const promptObj = buildPrompt(type, data, watchlist);
  const reportText = await writeReport(promptObj);

  console.log(`[${type}] Sending email...`);
  const subject = `[VietCap ${subjectLabels[type]}] ${today}`;
  const htmlBody = buildEmailHtml(type, reportText, today);
  await sendEmail(subject, htmlBody);

  console.log(`[${type}] ✅ Done`);
  return { success: true, subject };
}

module.exports = { runBriefing };
