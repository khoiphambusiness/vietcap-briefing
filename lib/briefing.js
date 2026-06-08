// lib/briefing.js — Multi-source intelligence aggregator + Claude deep analysis

const Anthropic = require("@anthropic-ai/sdk");
const nodemailer = require("nodemailer");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Web search via Serper (supports gl parameter) ─────────
async function search(query, lang = "vi", country = "vn") {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: country, hl: lang, num: 6 }),
    });
    const data = await res.json();
    return (data.organic || [])
      .map((r) => `[${r.date || ""}] ${r.title}: ${r.snippet}`)
      .join("\n");
  } catch (e) {
    return "";
  }
}

// ─── Search news specifically ──────────────────────────────
async function searchNews(query, lang = "en", country = "us") {
  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: country, hl: lang, num: 6 }),
    });
    const data = await res.json();
    return (data.news || [])
      .map((r) => `[${r.date || ""}] ${r.source || ""} — ${r.title}: ${r.snippet}`)
      .join("\n");
  } catch (e) {
    return "";
  }
}

// ─── Comprehensive multi-source data gathering ─────────────
async function gatherMarketData(type) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Run all searches in parallel — categorized by domain
  const [
    // === VIETNAM MARKET ===
    vnIndex,
    vnTopMovers,
    vnForeignFlow,
    vnMacro,
    vnPolicy,
    vnPolitics,
    vnCorporate,

    // === US MARKET & FED ===
    usFed,
    usMarket,
    usEconData,
    usTech,

    // === GEOPOLITICS & WARS ===
    geoConflicts,
    geoMiddleEast,
    geoUkraine,
    geoUSTrade,
    geoAsia,

    // === COMMODITIES ===
    oilGas,
    oilOpec,
    goldSilver,
    metals,
    agriculture,

    // === CURRENCIES ===
    dxyDollar,
    asianFX,
    crypto,

    // === GLOBAL ECONOMY ===
    chinaEcon,
    euroEcon,
    globalTrade,
    emergingMarkets,

    // === SECTOR NEWS ===
    techSector,
    bankingSector,
    realEstate,
    energy,

  ] = await Promise.all([
    // Vietnam market
    search("VN-Index HNX-Index điểm số khối lượng hôm nay " + today, "vi", "vn"),
    search("cổ phiếu tăng giảm mạnh nhất HOSE biến động lớn " + today, "vi", "vn"),
    search("khối ngoại mua bán ròng VN-Index top mã " + today, "vi", "vn"),
    search("GDP lạm phát tín dụng kinh tế vĩ mô Việt Nam 2026", "vi", "vn"),
    search("NHNN lãi suất tỷ giá chính sách tiền tệ Việt Nam " + today, "vi", "vn"),
    search("chính trị Việt Nam chính sách kinh tế đầu tư công " + today, "vi", "vn"),
    search("kết quả kinh doanh doanh nghiệp niêm yết IPO " + today, "vi", "vn"),

    // US market & Fed
    searchNews("Federal Reserve interest rate policy inflation 2026", "en", "us"),
    searchNews("S&P 500 Nasdaq Dow Jones market close today 2026", "en", "us"),
    searchNews("US CPI PPI jobs NFP GDP economic data 2026", "en", "us"),
    searchNews("tech stocks AI semiconductor earnings 2026", "en", "us"),

    // Geopolitics
    searchNews("geopolitical conflict war market impact 2026", "en", "us"),
    searchNews("Iran Israel Middle East war oil market 2026", "en", "us"),
    searchNews("Ukraine Russia war Europe energy market 2026", "en", "us"),
    searchNews("US China trade tariff sanctions technology 2026", "en", "us"),
    searchNews("Asia Pacific geopolitics Taiwan South China Sea 2026", "en", "us"),

    // Commodities
    searchNews("crude oil WTI Brent price OPEC today 2026", "en", "us"),
    searchNews("OPEC production cut oil supply demand 2026", "en", "us"),
    searchNews("gold silver price safe haven today 2026", "en", "us"),
    searchNews("steel copper iron ore commodity price 2026", "en", "us"),
    searchNews("agriculture rice wheat corn commodity 2026", "en", "us"),

    // Currencies
    searchNews("DXY dollar index Fed currency market 2026", "en", "us"),
    searchNews("Asian currencies emerging market FX USD 2026", "en", "us"),
    searchNews("Bitcoin crypto market today 2026", "en", "us"),

    // Global economy
    searchNews("China economy GDP growth stimulus policy 2026", "en", "us"),
    searchNews("Europe ECB economy recession growth 2026", "en", "us"),
    searchNews("global trade supply chain inflation 2026", "en", "us"),
    searchNews("emerging markets capital flows Vietnam investment 2026", "en", "us"),

    // Sectors
    searchNews("technology AI chip semiconductor stock 2026", "en", "us"),
    searchNews("global banking financial sector credit risk 2026", "en", "us"),
    searchNews("real estate property market Asia 2026", "en", "us"),
    searchNews("energy transition renewable oil gas sector 2026", "en", "us"),
  ]);

  return {
    vietnam: { vnIndex, vnTopMovers, vnForeignFlow, vnMacro, vnPolicy, vnPolitics, vnCorporate },
    usMarket: { usFed, usMarket, usEconData, usTech },
    geopolitics: { geoConflicts, geoMiddleEast, geoUkraine, geoUSTrade, geoAsia },
    commodities: { oilGas, oilOpec, goldSilver, metals, agriculture },
    currencies: { dxyDollar, asianFX, crypto },
    globalEcon: { chinaEcon, euroEcon, globalTrade, emergingMarkets },
    sectors: { techSector, bankingSector, realEstate, energy },
  };
}

// ─── Format data for prompt ────────────────────────────────
function formatData(data) {
  return `
=== THỊ TRƯỜNG VIỆT NAM ===
VN-Index/HNX: ${data.vietnam.vnIndex}

Top Movers: ${data.vietnam.vnTopMovers}

Khối ngoại: ${data.vietnam.vnForeignFlow}

Vĩ mô VN: ${data.vietnam.vnMacro}

Chính sách VN: ${data.vietnam.vnPolicy}

Chính trị VN: ${data.vietnam.vnPolitics}

Corporate news: ${data.vietnam.vnCorporate}

=== THỊ TRƯỜNG MỸ & FED ===
Fed/Lãi suất: ${data.usMarket.usFed}

Thị trường Mỹ: ${data.usMarket.usMarket}

Kinh tế Mỹ: ${data.usMarket.usEconData}

Tech/AI: ${data.usMarket.usTech}

=== ĐỊA CHÍNH TRỊ & XUNG ĐỘT ===
Xung đột toàn cầu: ${data.geopolitics.geoConflicts}

Iran/Israel/Trung Đông: ${data.geopolitics.geoMiddleEast}

Ukraine/Nga/Châu Âu: ${data.geopolitics.geoUkraine}

Mỹ-Trung/Thuế quan: ${data.geopolitics.geoUSTrade}

Châu Á-TBD: ${data.geopolitics.geoAsia}

=== HÀNG HÓA ===
Dầu WTI/Brent: ${data.commodities.oilGas}

OPEC: ${data.commodities.oilOpec}

Vàng/Bạc: ${data.commodities.goldSilver}

Kim loại công nghiệp: ${data.commodities.metals}

Nông sản: ${data.commodities.agriculture}

=== TIỀN TỆ ===
DXY/USD: ${data.currencies.dxyDollar}

Tiền tệ châu Á/EM: ${data.currencies.asianFX}

Crypto: ${data.currencies.crypto}

=== KINH TẾ TOÀN CẦU ===
Trung Quốc: ${data.globalEcon.chinaEcon}

Châu Âu/ECB: ${data.globalEcon.euroEcon}

Thương mại toàn cầu: ${data.globalEcon.globalTrade}

EM/Vốn ngoại: ${data.globalEcon.emergingMarkets}

=== NGÀNH ===
Tech/AI/Chip: ${data.sectors.techSector}

Ngân hàng toàn cầu: ${data.sectors.bankingSector}

Bất động sản: ${data.sectors.realEstate}

Năng lượng: ${data.sectors.energy}
`;
}

// ─── Build deep intelligence prompt ───────────────────────
function buildPrompt(type, data, watchlist) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const tickers = watchlist.join(", ");
  const formattedData = formatData(data);

  const systemPrompt = `Bạn là Senior Research Analyst & Market Strategist của VietCap Securities với 15 năm kinh nghiệm phân tích thị trường Việt Nam và quốc tế.

NHIỆM VỤ: Tổng hợp và phân tích thông tin từ nhiều nguồn để tạo ra intelligence brief chất lượng cao cho broker.

NGUYÊN TẮC BẮT BUỘC:
1. PHÂN TÍCH TÁC ĐỘNG — không chỉ tóm tắt tin tức. Với mỗi sự kiện: tại sao nó quan trọng? Tác động cụ thể lên nhóm ngành/mã nào tại VN? Mức độ?
2. KẾT NỐI MACRO → MICRO — liên kết sự kiện thế giới → dòng tiền → VN-Index → cổ phiếu cụ thể
3. QUAN ĐIỂM RÕ RÀNG — MUA/BÁN/GIỮ/TRÁNH với entry, target, stop loss
4. CATALYST ANALYSIS — sự kiện nào sắp xảy ra có thể gây biến động lớn?
5. RISK/REWARD — đánh giá rủi ro cho mọi khuyến nghị
6. KHÔNG mơ hồ — nói thẳng quan điểm dù tích cực hay tiêu cực
7. Ưu tiên tin TỪ HÔM NAY và gần nhất — bỏ qua tin cũ nếu không còn relevance`;

  const morningPrompt = `Hôm nay là ${today}.

Dữ liệu intelligence từ nhiều nguồn:
${formattedData}

Viết MORNING INTELLIGENCE BRIEF chuyên sâu:

## 1. EXECUTIVE SUMMARY
3-4 câu tóm tắt bức tranh tổng thể: thị trường hôm nay sẽ như thế nào và tại sao?

## 2. THỊ TRƯỜNG VIỆT NAM — KỸ THUẬT
- VN-Index & HNX: điểm, %, khối lượng vs TB 20 phiên
- RSI, MACD, Bollinger Bands, MA 20/50/200 — kết luận kỹ thuật
- Hỗ trợ: [điểm] | Kháng cự: [điểm]
- Tâm lý: TÍCH CỰC / THẬN TRỌNG / TIÊU CỰC

## 3. KINH TẾ VĨ MÔ VIỆT NAM
- GDP, lạm phát, tín dụng — giai đoạn chu kỳ kinh tế VN đang ở đâu?
- NHNN: chính sách lãi suất, tỷ giá — tác động lên ngân hàng, BĐS, xuất khẩu?
- Đầu tư công: tiến độ và nhóm ngành hưởng lợi (xây dựng, vật liệu)?
- Tin chính trị trong nước: sự kiện nào tác động thị trường? Tại sao?

## 4. THỊ TRƯỜNG MỸ & FED
- S&P 500/Nasdaq/Dow đêm qua: số điểm, %, tín hiệu
- Fed: stance hiện tại, kỳ vọng lãi suất tiếp theo — xác suất tăng/giảm/giữ?
- Tác động lên VN: DXY mạnh/yếu → dòng vốn EM → VN-Index
- Earnings/Events Mỹ tuần này ảnh hưởng gì?

## 5. ĐỊA CHÍNH TRỊ & XUNG ĐỘT THẾ GIỚI
Với TỪNG điểm nóng địa chính trị hiện tại:
**[Tên xung đột/sự kiện]:**
- Diễn biến mới nhất: [cập nhật]
- Tác động lên hàng hóa: [dầu/vàng/kim loại]
- Tác động lên VN cụ thể: nhóm ngành nào bị ảnh hưởng? Mức độ?
- Khuyến nghị: nên làm gì với cổ phiếu liên quan?

## 6. HÀNG HÓA — PHÂN TÍCH & TÁC ĐỘNG VN
**Dầu thô (WTI/Brent):**
- Giá hiện tại, % thay đổi, xu hướng
- OPEC news: ảnh hưởng cung/cầu?
- Tác động VN: GAS, BSR, PLX, PVD, PVS — MUA/BÁN/GIỮ? Vì sao?
- Nhóm chịu thiệt: vận tải (HVN, VJC), logistics, nhựa (NTP, BMP)

**Vàng/Bạc:**
- Giá, xu hướng, lý do tăng/giảm
- Tác động lên sentiment thị trường VN?

**Kim loại công nghiệp (thép, đồng):**
- HPG, HSG, NKG — tác động gì? MUA/BÁN/GIỮ?

**Nông sản:**
- Ảnh hưởng lên nhóm nông nghiệp VN (HAG, VHC, IDI)?

## 7. TIỀN TỆ & DÒNG VỐN
- DXY: mức hiện tại, xu hướng
- USD/VND: tỷ giá, áp lực — nhóm xuất khẩu (dệt may, thủy sản) vs nhập khẩu
- Dòng vốn vào/ra EM: VN đang được favor hay bị bán tháo?
- Khối ngoại: net buy/sell, top mã, xu hướng — smart money đang làm gì?

## 8. KINH TẾ TRUNG QUỐC & CHÂU Á
- Tăng trưởng TQ: tác động lên xuất khẩu VN (điện tử, dệt may)?
- Chính sách kích thích TQ: cơ hội hay rủi ro cho nhóm liên quan?
- Châu Á: sự kiện nào tác động dòng vốn vào ASEAN/VN?

## 9. CATALYST ANALYSIS — SỰ KIỆN SẮP TỚI
Liệt kê các sự kiện sắp diễn ra trong 1-5 ngày tới có thể gây biến động:
- [Ngày] [Sự kiện]: tác động kỳ vọng lên VN? Nên chuẩn bị gì?

## 10. CỔ PHIẾU TIỀM NĂNG HÔM NAY
Top 5 cổ phiếu đáng giao dịch hôm nay (kỹ thuật + fundamental + catalyst):
**[Mã] — [Nhóm ngành]**
- Catalyst: [lý do cụ thể hôm nay]
- Kỹ thuật: [RSI, MACD, setup]
- Entry: [giá] | Target: [giá] (+[%]) | Stop: [giá] (-[%])
- R/R: [tỷ lệ] | Tin cậy: CAO/TB/THẤP

## 11. CỔ PHIẾU BIẾN ĐỘNG LỚN CẦN THEO DÕI
- Mã có volume bất thường hoặc gap up/down: lý do? Nên chú ý hay tránh?

## 12. DANH MỤC THEO DÕI: ${tickers}
Với TỪNG mã:
- Giá | RSI | MACD | Khuyến nghị: **MUA/BÁN/GIỮ/TRÁNH**
- Entry: [x] | Target: [x] (+[%]) | Stop: [x] (-[%])
- Lý do: [kỹ thuật + fundamental + macro catalyst]

## 13. CHIẾN LƯỢC PHIÊN HÔM NAY
- Tổng quan: TÍCH CỰC / THẬN TRỌNG / TIÊU CỰC
- Chiến lược cụ thể
- Top 3 ưu tiên khi mở cửa
- Rủi ro lớn nhất cần theo dõi trong phiên`;

  const middayPrompt = `Hôm nay là ${today}.

Dữ liệu intelligence:
${formattedData}

Viết MIDDAY INTELLIGENCE SNAPSHOT:

## 1. DIỄN BIẾN PHIÊN SÁNG
- VN-Index hiện tại: điểm, %, khối lượng
- So với dự báo sáng: đúng/sai? Tại sao?
- Breadth: tăng/giảm/đứng — thị trường rộng hay hẹp?

## 2. NEWS BREAKS TRONG NGÀY
Tin tức mới xuất hiện kể từ sáng — tác động gì?
- [Tin]: Tác động lên nhóm ngành/mã nào? Đã phản ánh vào giá chưa?

## 3. CẬP NHẬT ĐỊA CHÍNH TRỊ & HÀNG HÓA
- Diễn biến mới nhất về các điểm nóng (Iran, Ukraine, v.v.)
- Dầu, vàng, USD thay đổi thế nào so với sáng?
- Tác động lên nhóm ngành VN trong phiên chiều?

## 4. PHÂN TÍCH KỸ THUẬT GIỮA PHIÊN
- RSI ngắn hạn, momentum
- Dự báo phiên chiều: [tăng/giảm/đi ngang] vì [lý do]

## 5. CƠ HỘI PHIÊN CHIỀU
Top 3-5 trade ideas với entry/target/stop và catalyst cụ thể

## 6. CATALYST ANALYSIS CẬP NHẬT
Sự kiện nào trong 24-48h tới cần theo dõi?

## 7. CẬP NHẬT DANH MỤC: ${tickers}
Diễn biến từng mã — có cần action gì ngay không?

## 8. CHIẾN LƯỢC PHIÊN CHIỀU
Offensive hay defensive? Nhóm ngành nào?`;

  const eodPrompt = `Hôm nay là ${today}.

Dữ liệu intelligence:
${formattedData}

Viết EOD INTELLIGENCE SUMMARY toàn diện:

## 1. EXECUTIVE SUMMARY
3-4 câu tóm tắt ngày hôm nay và outlook ngày mai

## 2. TỔNG KẾT PHIÊN
- VN-Index & HNX đóng cửa: điểm, %, khối lượng vs TB
- Breadth | Đánh giá: TÍCH CỰC/TIÊU CỰC/TRUNG TÍNH + lý do

## 3. PHÂN TÍCH KỸ THUẬT SAU PHIÊN
- RSI, MACD, mẫu nến, Bollinger Bands, Volume
- Xu hướng 1-5 phiên: BULLISH/BEARISH/NEUTRAL + lý do
- Hỗ trợ/kháng cự quan trọng ngày mai

## 4. TOP MOVERS PHÂN TÍCH SÂU
- Top 5 tăng: momentum bền? Có thể tiếp tục không?
- Top 5 giảm: cơ hội hay tiếp tục tránh?
- Mã có volume bất thường: smart money đang làm gì?

## 5. TỔNG KẾT ĐỊA CHÍNH TRỊ & GLOBAL NEWS
Với TỪNG sự kiện quan trọng trong ngày:
- [Sự kiện]: Tác động ngắn/dài hạn lên VN? Nhóm ngành? Bullish/Bearish? Lý do cụ thể?

## 6. HÀNG HÓA & TIỀN TỆ CUỐI NGÀY
- Dầu, vàng, thép đóng cửa — xu hướng và tác động nhóm ngành VN ngày mai
- DXY, USD/VND — áp lực tỷ giá?
- Dự báo biến động đêm nay sau khi VN đóng cửa

## 7. DỰ BÁO THỊ TRƯỜNG MỸ ĐÊM NAY
- Kỳ vọng S&P 500/Nasdaq dựa trên gì?
- Events đêm nay (earnings, data, Fed speak)?
- Tác động lên VN-Index ngày mai?

## 8. CATALYST NGÀY MAI & TUẦN TỚI
- Sự kiện quan trọng ngày mai: [list với tác động kỳ vọng]
- Sự kiện tuần tới cần chuẩn bị

## 9. CỔ PHIẾU TIỀM NĂNG NGÀY MAI
Top 5 cơ hội với đầy đủ: catalyst + kỹ thuật + entry/target/stop/R-R

## 10. DÒNG TIỀN KHỐI NGOẠI TỔNG KẾT
- Net buy/sell, xu hướng, smart money đang làm gì?

## 11. KẾT QUẢ DANH MỤC: ${tickers}
Từng mã: đóng cửa, RSI, action ngày mai, vùng giá quan trọng

## 12. DỰ BÁO & CHIẾN LƯỢC NGÀY MAI
- **Kịch bản cơ sở (60%):** [dự báo + lý do + hành động]
- **Kịch bản tích cực (20%):** [điều kiện + kết quả + hành động]
- **Kịch bản tiêu cực (20%):** [điều kiện + kết quả + hành động]
- **Risk triggers cần theo dõi:** [list]`;

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
    morning: { title: "Morning Intelligence Brief",   color: "#c0392b", time: "8:30 AM" },
    midday:  { title: "Midday Intelligence Snapshot", color: "#e67e22", time: "1:00 PM" },
    eod:     { title: "EOD Intelligence Summary",     color: "#1a5fa8", time: "3:00 PM" },
  };
  const { title, color, time } = labels[type];

  const formattedText = reportText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^## (.*$)/gm, `<h3 style="color:${color};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:22px 0 8px;border-bottom:2px solid ${color}22;padding-bottom:6px;">$1</h3>`)
    .replace(/^\*\*(.*?)\*\*$/gm, `<div style="font-weight:700;color:#1a1a1a;margin:10px 0 4px;">$1</div>`)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.*$)/gm, "<li style='margin:4px 0;line-height:1.65;'>$1</li>")
    .replace(/\n\n/g, "</p><p style='margin:6px 0;line-height:1.75;'>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef0f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3;padding:20px 0;">
<tr><td align="center">
<table width="700" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">

  <!-- HEADER -->
  <tr>
    <td style="background:${color};padding:26px 36px;">
      <div style="color:rgba(255,255,255,0.7);font-size:10px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">VietCap Securities · Senior Research & Strategy</div>
      <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.02em;">${title}</div>
      <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:6px;">${today} &nbsp;·&nbsp; ${time} GMT+7</div>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="padding:28px 36px;font-size:13px;line-height:1.75;color:#222;">
      <p style="margin:0 0 8px;">${formattedText}</p>
    </td>
  </tr>

  <!-- CHART BUTTON -->
  <tr>
    <td style="padding:16px 36px 22px;text-align:center;border-top:1px solid #eee;background:#fafafa;">
      <a href="https://vietcap-briefing-v2.vercel.app/api/chart" target="_blank"
         style="display:inline-block;padding:11px 28px;background:${color};color:#fff;text-decoration:none;border-radius:7px;font-size:13px;font-weight:700;letter-spacing:0.02em;">
        📈 Xem biểu đồ kỹ thuật
      </a>
      <p style="font-size:11px;color:#bbb;margin:10px 0 0;">VCB · TCB · VNM · HPG &nbsp;·&nbsp; Candle + RSI + MACD + BB + MA 20/50/200</p>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f5f5f5;padding:12px 36px;text-align:center;border-top:1px solid #e8e8e8;">
      <p style="font-size:10px;color:#bbb;margin:0;">VietCap AI Research Intelligence · Dữ liệu tổng hợp từ nhiều nguồn · Chỉ mang tính tham khảo · ${today}</p>
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

  console.log(`[${type}] Gathering multi-source intelligence...`);
  const data = await gatherMarketData(type);

  console.log(`[${type}] Deep analysis with Claude...`);
  const promptObj = buildPrompt(type, data, watchlist);
  const reportText = await writeReport(promptObj);

  console.log(`[${type}] Sending...`);
  const subject = `[VietCap ${subjectLabels[type]}] ${today}`;
  const html = buildEmailHtml(type, reportText, today);
  await sendEmail(subject, html);

  console.log(`[${type}] ✅ Done`);
  return { success: true, subject };
}

module.exports = { runBriefing };
