// lib/briefing.js — Claude API + comprehensive market intelligence

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

// ─── Gather comprehensive market data ─────────────────────
async function gatherMarketData(type) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const baseQueries = [
    // Thị trường VN
    "VN-Index HNX-Index điểm số khối lượng " + today,
    "top cổ phiếu tăng giảm mạnh HOSE biến động lớn " + today,
    "khối ngoại mua bán ròng VN-Index " + today,

    // Kinh tế vĩ mô VN
    "kinh tế vĩ mô Việt Nam lạm phát GDP tăng trưởng tín dụng " + today,
    "chính sách tiền tệ NHNN lãi suất tỷ giá USD VND " + today,
    "chính trị Việt Nam chính sách kinh tế tác động chứng khoán " + today,

    // Kinh tế thế giới
    "Fed lãi suất CPI Mỹ kinh tế Mỹ hôm nay " + today,
    "S&P 500 Nasdaq Dow Jones đóng cửa tối qua",
    "giá dầu WTI Brent OPEC hôm nay",
    "DXY USD index thị trường tiền tệ hôm nay",
    "kinh tế Trung Quốc tác động Việt Nam " + today,

    // Chính trị thế giới
    "căng thẳng địa chính trị tác động thị trường chứng khoán " + today,
    "tin tức chính trị thế giới ảnh hưởng kinh tế " + today,

    // Cổ phiếu tiềm năng
    "cổ phiếu tiềm năng đáng chú ý HOSE HNX tuần này",
    "cổ phiếu biến động lớn khối lượng bất thường " + today,
  ];

  const middayExtra = [
    "VN-Index phiên sáng diễn biến " + today,
    "tin tức doanh nghiệp niêm yết kết quả kinh doanh " + today,
    "IPO phát hành cổ phiếu sự kiện corporate " + today,
  ];

  const eodExtra = [
    "VN-Index đóng cửa tổng kết phiên " + today,
    "nhận định chuyên gia thị trường ngày mai",
    "dòng tiền thông minh smart money chứng khoán VN",
  ];

  const queries = type === "morning" ? baseQueries :
                  type === "midday"  ? [...baseQueries, ...middayExtra] :
                                       [...baseQueries, ...eodExtra];

  const results = await Promise.all(queries.map((q) => searchWeb(q)));
  return results.filter(Boolean).join("\n\n---\n\n");
}

// ─── Build comprehensive intelligence prompt ───────────────
function buildPrompt(type, marketData, watchlist) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const tickers = watchlist.join(", ");

  const systemPrompt = `Bạn là Senior Research Analyst & Market Strategist của VietCap Securities với 15 năm kinh nghiệm. Bạn viết báo cáo cho fund manager và broker chuyên nghiệp.

NGUYÊN TẮC BẮT BUỘC:
1. PHÂN TÍCH, không tóm tắt — giải thích TẠI SAO mỗi thông tin quan trọng với thị trường VN
2. ĐƯA RA QUAN ĐIỂM RÕ RÀNG: MUA/BÁN/GIỮ/TRÁNH với entry, target, stop loss cụ thể
3. KẾT NỐI DOTS: liên kết kinh tế thế giới → tác động lên nhóm ngành cụ thể tại VN
4. ĐÁNH GIÁ RỦI RO/REWARD cho từng khuyến nghị
5. KHÔNG dùng ngôn ngữ né tránh — nói thẳng quan điểm
6. SỐ LIỆU CỤ THỂ — không ước chừng
7. Viết bằng tiếng Việt, tông chuyên nghiệp`;

  const morningPrompt = `Hôm nay là ${today}. Dữ liệu thị trường:

${marketData}

Viết MORNING INTELLIGENCE BRIEF toàn diện:

## 1. TỔNG QUAN THỊ TRƯỜNG
- VN-Index & HNX-Index: điểm, %, khối lượng vs TB 20 phiên
- Giai đoạn thị trường hiện tại: tích lũy/phân phối/uptrend/downtrend — bằng chứng cụ thể?
- Tâm lý thị trường: THAM LAM / SỢ HÃI / TRUNG TÍNH

## 2. PHÂN TÍCH KỸ THUẬT VN-INDEX
- RSI (14): giá trị, xu hướng, có divergence không?
- MACD: histogram mở rộng/thu hẹp, cắt lên/xuống signal?
- Bollinger Bands: vị trí giá, bandwidth co/nở
- MA 20/50/200: xếp hàng, golden/death cross?
- Mẫu hình nến: ý nghĩa gì?
- Kết luận kỹ thuật: BULLISH / BEARISH / NEUTRAL
- Hỗ trợ mạnh: [điểm] — tại sao?
- Kháng cự mạnh: [điểm] — tại sao?
- Xác suất breakout hôm nay: [%] — lý do

## 3. KINH TẾ VĨ MÔ VIỆT NAM
- Tình trạng kinh tế VN hiện tại: GDP, lạm phát, tín dụng
- Chính sách NHNN: lãi suất, tỷ giá — tác động lên ngành ngân hàng/bất động sản?
- Tỷ giá USD/VND: xu hướng và tác động lên nhóm xuất khẩu vs nhập khẩu
- Chính sách tài khóa: đầu tư công, chi tiêu chính phủ — nhóm ngành hưởng lợi?
- Tin tức chính trị trong nước: sự kiện nào có thể tác động thị trường? Tại sao?

## 4. KINH TẾ THẾ GIỚI & TÁC ĐỘNG LÊN VN
**Fed & Kinh tế Mỹ:**
- Lãi suất Fed hiện tại và kỳ vọng: tác động lên DXY → tác động lên VND → tác động lên dòng vốn ngoại vào VN
- CPI/PCE Mỹ: xu hướng lạm phát → Fed sẽ làm gì tiếp theo?
- S&P 500/Nasdaq: tín hiệu kỹ thuật và sentiment → VN-Index thường lag Mỹ bao nhiêu?

**Giá dầu & Hàng hóa:**
- Dầu WTI/Brent: giá hiện tại, xu hướng, OPEC news
- Tác động CỤ THỂ lên VN: GAS, BSR, PLX, PVD hưởng lợi hay chịu áp lực? Nhóm vận tải/logistics bị ảnh hưởng thế nào?
- Kim loại (thép, đồng): HPG, HSG — tác động?

**Kinh tế Trung Quốc:**
- Tăng trưởng TQ: tác động lên xuất khẩu VN (dệt may, điện tử)?
- Chính sách kích thích TQ: cơ hội hay rủi ro cho VN?

**Địa chính trị thế giới:**
Với TỪNG sự kiện chính trị/địa chính trị quan trọng:
- [Tên sự kiện]: Tác động trực tiếp lên nhóm ngành/mã cụ thể nào tại VN? Mức độ tác động? Cơ hội hay rủi ro?

## 5. NEWS CATALYST HÔM NAY
Tin tức có thể gây BIẾN ĐỘNG MẠNH hôm nay:
- [Tin]: Tác động lên nhóm ngành/mã? Bullish/Bearish? Mức độ?
- [Tin]: Tác động lên nhóm ngành/mã? Bullish/Bearish? Mức độ?
(liệt kê tất cả tin quan trọng)

## 6. CỔ PHIẾU TIỀM NĂNG & CƠ HỘI
**Cổ phiếu có setup kỹ thuật tốt nhất hôm nay:**
Với từng mã (3-5 mã):
- Mã: [tên] — Giá: [x] — Nhóm ngành: [x]
- Setup: [mô tả kỹ thuật cụ thể]
- Catalyst: [lý do fundamental/news]
- Entry: [vùng giá] | Target: [vùng giá] (+[%]) | Stop: [vùng giá] (-[%])
- Risk/Reward: [tỷ lệ]
- Độ tin cậy: CAO/TRUNG BÌNH/THẤP

**Cổ phiếu có biến động bất thường (volume spike):**
- Mã nào có khối lượng bất thường? Lý do gì? Nên chú ý hay tránh?

## 7. DANH MỤC THEO DÕI: ${tickers}
Với TỪNG mã:
- Giá & % thay đổi | RSI | MACD signal
- Khuyến nghị: **MUA / BÁN / GIỮ / TRÁNH**
- Entry: [giá] | Target: [giá] (+[%]) | Stop Loss: [giá] (-[%])
- Lý do: [kỹ thuật + fundamental + catalyst]

## 8. DÒNG TIỀN KHỐI NGOẠI
- Net buy/sell (tỷ đồng)
- Top 3 mua ròng → signal gì?
- Top 3 bán ròng → lo ngại không?
- Xu hướng 1 tuần, 1 tháng: smart money đang làm gì?
- Dự báo hành động khối ngoại hôm nay

## 9. KHUYẾN NGHỊ CHIẾN LƯỢC PHIÊN HÔM NAY
- **Tâm lý tổng thể:** TÍCH CỰC / THẬN TRỌNG / TIÊU CỰC
- **Chiến lược:** [cụ thể nên làm gì]
- **Top 3 mã ưu tiên:** lý do cụ thể
- **Mức rủi ro thị trường:** THẤP / TRUNG BÌNH / CAO
- **Điểm cần theo dõi sát:** [list các trigger quan trọng trong phiên]`;

  const middayPrompt = `Hôm nay là ${today}. Dữ liệu giữa phiên:

${marketData}

Viết MIDDAY INTELLIGENCE BRIEF:

## 1. DIỄN BIẾN PHIÊN SÁNG
- VN-Index: điểm, %, khối lượng — so với dự báo sáng?
- Breadth: tăng/giảm/đứng — thị trường rộng hay hẹp?
- Tiền vào nhóm ngành nào nhiều nhất?

## 2. PHÂN TÍCH KỸ THUẬT GIỮA PHIÊN
- RSI khung ngắn: overbought/oversold?
- Momentum: tăng tốc hay giảm tốc vào chiều?
- Dự báo phiên chiều: VN-Index khả năng [tăng/giảm/đi ngang] vì [lý do kỹ thuật]

## 3. NEWS & CATALYST TRONG NGÀY
Với từng tin quan trọng xuất hiện trong ngày:
- [Tin]: Tác động lên nhóm ngành/mã nào? Đã phản ánh vào giá chưa hay còn room?

## 4. KINH TẾ VĨ MÔ CẬP NHẬT
- Số liệu kinh tế mới nhất công bố hôm nay (nếu có)
- Diễn biến tỷ giá, lãi suất trong ngày
- Tin chính trị trong/ngoài nước mới nhất

## 5. KINH TẾ THẾ GIỚI REAL-TIME
- Thị trường châu Á đang giao dịch: Nikkei, Shanghai, HSI — tác động lên VN?
- Giá dầu, vàng, USD hiện tại — thay đổi so với sáng?

## 6. CƠ HỘI PHIÊN CHIỀU
Top 3-5 trade ideas với entry/target/stop và lý do cụ thể:
- Mã: [x] | Entry: [x] | Target: [x] | Stop: [x] | Catalyst: [x]

## 7. CẬP NHẬT DANH MỤC: ${tickers}
- Diễn biến từng mã, có cần action gì ngay không?

## 8. CHIẾN LƯỢC PHIÊN CHIỀU
- Defensive hay offensive?
- Nhóm ngành nên tập trung
- Mức độ rủi ro hiện tại`;

  const eodPrompt = `Hôm nay là ${today}. Dữ liệu tổng kết:

${marketData}

Viết EOD INTELLIGENCE SUMMARY toàn diện:

## 1. TỔNG KẾT PHIÊN
- VN-Index & HNX-Index đóng cửa: điểm, %, khối lượng vs TB
- Breadth cuối phiên
- Đánh giá phiên: TÍCH CỰC / TIÊU CỰC / TRUNG TÍNH — lý do cụ thể

## 2. PHÂN TÍCH KỸ THUẬT SAU PHIÊN
- RSI đóng cửa: giá trị, trend
- MACD: signal, divergence?
- Mẫu hình nến hôm nay: ý nghĩa?
- Volume xác nhận hay phủ nhận giá?
- Xu hướng ngắn hạn (1-5 phiên): BULLISH / BEARISH / NEUTRAL + lý do

## 3. TOP MOVERS PHÂN TÍCH SÂU
- Top 5 tăng: momentum bền? Nên chase hay bỏ qua?
- Top 5 giảm: cơ hội mua đáy hay tiếp tục tránh?
- Mã có volume bất thường: smart money đang làm gì?

## 4. KINH TẾ VĨ MÔ TỔNG KẾT NGÀY
- Sự kiện kinh tế vĩ mô VN nổi bật trong ngày: tác động thị trường?
- Chính sách/thông tin từ cơ quan quản lý (UBCKNN, NHNN, Chính phủ)
- Tỷ giá, lãi suất cuối ngày

## 5. KINH TẾ THẾ GIỚI — DỰ BÁO ĐÊM NAY
- Thị trường Mỹ sắp mở cửa: kỳ vọng S&P 500/Nasdaq đêm nay dựa trên gì?
- Sự kiện quan trọng đêm nay/ngày mai: FOMC, CPI, earnings, v.v.
- Dầu, USD, vàng: xu hướng sau giờ VN đóng cửa

## 6. CHÍNH TRỊ & ĐỊA CHÍNH TRỊ
Với từng sự kiện:
- [Sự kiện]: Tác động ngắn hạn/dài hạn lên VN-Index? Nhóm ngành nào bị ảnh hưởng? Bullish/Bearish? Lý do cụ thể?

## 7. CỔ PHIẾU TIỀM NĂNG NGÀY MAI
Top 5 cổ phiếu đáng chú ý phiên ngày mai:
- Mã: [x] | Nhóm ngành: [x]
- Lý do: kỹ thuật + catalyst + macro
- Entry: [x] | Target: [x] | Stop: [x] | R/R: [x]

## 8. DÒNG TIỀN KHỐI NGOẠI TỔNG KẾT
- Net buy/sell cả ngày, xu hướng tuần/tháng
- Smart money đang tích lũy hay phân phối?
- Dự báo hành động khối ngoại ngày mai

## 9. KẾT QUẢ DANH MỤC: ${tickers}
Với từng mã: đóng cửa, RSI, action ngày mai (MUA THÊM/GIỮ/CẮT LỖ/CHỐT LỜI), vùng giá cần theo dõi

## 10. DỰ BÁO & CHIẾN LƯỢC NGÀY MAI
- **Kịch bản cơ sở (60%):** VN-Index [dự báo] — tại sao
- **Kịch bản tích cực (20%):** nếu [điều kiện] → VN-Index [kết quả] → nên làm gì
- **Kịch bản tiêu cực (20%):** nếu [điều kiện] → VN-Index [kết quả] → nên làm gì
- **Triggers cần theo dõi:** [list sự kiện/mức giá quan trọng ngày mai]
- **Chiến lược tổng thể:** cụ thể nên làm gì ngày mai`;

  const prompts = { morning: morningPrompt, midday: middayPrompt, eod: eodPrompt };
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
    morning: { title: "Morning Intelligence Brief",  color: "#c0392b", time: "8:30 AM" },
    midday:  { title: "Midday Intelligence Snapshot", color: "#e67e22", time: "1:00 PM" },
    eod:     { title: "EOD Intelligence Summary",    color: "#1a5fa8", time: "3:00 PM" },
  };
  const { title, color, time } = labels[type];

  const formattedText = reportText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^## (.*$)/gm, `<h3 style="color:${color};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin:20px 0 8px;border-bottom:1px solid #f0f0f0;padding-bottom:6px;">$1</h3>`)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.*$)/gm, "<li style='margin:3px 0;line-height:1.6;'>$1</li>")
    .replace(/\n\n/g, "</p><p style='margin:8px 0;line-height:1.7;'>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:24px 0;">
<tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
  <tr>
    <td style="background:linear-gradient(135deg,${color},${color}dd);padding:28px 36px;">
      <div style="color:rgba(255,255,255,0.75);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">VietCap Securities · Senior Research & Strategy</div>
      <div style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:-0.02em;">${title}</div>
      <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:6px;">${today} &nbsp;·&nbsp; ${time} GMT+7</div>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 36px;font-size:13px;line-height:1.7;color:#1a1a1a;">
      <p style="margin:0 0 8px;">${formattedText}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 36px 20px;text-align:center;border-top:1px solid #eee;background:#fafafa;">
      <a href="https://vietcap-briefing-v2.vercel.app/api/chart" target="_blank"
         style="display:inline-block;padding:11px 28px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;letter-spacing:0.02em;">
        📈 Xem biểu đồ kỹ thuật
      </a>
      <p style="font-size:11px;color:#bbb;margin:10px 0 0;">VCB · TCB · VNM · HPG &nbsp;·&nbsp; RSI · MACD · Bollinger Bands · MA 20/50/200</p>
    </td>
  </tr>
  <tr>
    <td style="background:#f7f7f7;padding:12px 36px;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:11px;color:#aaa;margin:0;">VietCap AI Research · Chỉ mang tính tham khảo, không phải khuyến nghị đầu tư chính thức · ${today}</p>
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

  console.log(`[${type}] Gathering market intelligence...`);
  const marketData = await gatherMarketData(type);

  console.log(`[${type}] Analyzing with Claude...`);
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
