import { NextRequest, NextResponse } from "next/server";

function extractValidPrice(raw?: string | number | null): number {
  if (!raw || (typeof raw !== "string" && typeof raw !== "number")) return 0;
  let s = String(raw);
  // Replace html non-breaking space entities and unicode spaces
  s = s.replace(/&nbsp;/gi, " ").replace(/&#160;/gi, " ").replace(/\u00A0/g, " ");
  // Remove trailing decimal kopecks (.00, ,00, .xx) when preceded by digits
  s = s.replace(/([0-9])[.,]\d{1,2}(?=[^\d]*$)/g, "$1");
  // Strip all remaining characters that are not numbers
  const digits = s.replace(/[^\d]/g, "");
  const num = parseInt(digits, 10);
  if (!isNaN(num) && num >= 5000 && num <= 3000000) {
    return num;
  }
  return 0;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ success: false, message: "Ссылка не указана" }, { status: 400 });
    }

    const cleanUrl = url.trim();

    // Default metadata
    let detectedModel = "";
    let detectedPrice = 0;
    let detectedBrand = "Кондиционер";
    let detectedType = "Сплит-система";

    // Comprehensive climate equipment brands map
    const brandPatterns: Record<string, string> = {
      shuft: "Shuft",
      axioma: "Axioma",
      daichi: "Daichi",
      green: "Green",
      haier: "Haier",
      ballu: "Ballu",
      daikin: "Daikin",
      gree: "Gree",
      midea: "Midea",
      electrolux: "Electrolux",
      mitsubishi: "Mitsubishi Electric",
      toshiba: "Toshiba",
      panasonic: "Panasonic",
      lg: "LG",
      samsung: "Samsung",
      kentatsu: "Kentatsu",
      aux: "AUX",
      zanussi: "Zanussi",
      hisense: "Hisense",
      funai: "Funai",
      centek: "Centek",
      chigo: "Chigo",
      tcl: "TCL",
      royal: "Royal Clima",
      dante: "Dante",
      energolux: "Energolux",
      pioneer: "Pioneer",
      shibaura: "Shibaura",
      lessar: "Lessar",
      quattroclima: "QuattroClima",
      systemair: "Systemair",
      hitachi: "Hitachi",
      fujitsu: "Fujitsu",
      mdv: "MDV",
      jax: "JAX",
      igc: "IGC",
      timberk: "Timberk",
      hyundai: "Hyundai",
      rover: "Rover",
      kitano: "Kitano",
      verona: "Verona",
      neoclima: "Neoclima",
    };

    const lowerUrl = cleanUrl.toLowerCase();
    for (const [key, brandName] of Object.entries(brandPatterns)) {
      if (lowerUrl.includes(key)) {
        detectedBrand = brandName;
        break;
      }
    }

    let fetchedOk = false;
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(cleanUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
          },
        });
        clearTimeout(timeout);

        if (response.ok) {
          const html = await response.text();
          fetchedOk = true;

          // 1. Extract model & title
          const titleMatch =
            html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
            html.match(/<meta\s+name=["']title["']\s+content=["'](.*?)["']/i) ||
            html.match(/<title[^>]*>(.*?)<\/title>/i) ||
            html.match(/<h1[^>]*>(.*?)<\/h1>/i);

          if (titleMatch && titleMatch[1]) {
            let cleanTitle = titleMatch[1]
              .replace(/<[^>]+>/g, "")
              .replace(/(\s*[-–—|]\s*)?(купить|цена|отзывы|характеристики|обзор|в daichi|в интернет-магазине|с доставкой|в москве|на авито|яндекс\.маркет|dns).*$/i, "")
              .replace(/купить.*/i, "")
              .replace(/цена.*/i, "")
              .replace(/в daichi.*/i, "")
              .replace(/в даичи.*/i, "")
              .replace(/в интернет-магазине.*/i, "")
              .replace(/в магазине.*/i, "")
              .replace(/на авито.*/i, "")
              .replace(/яндекс маркет.*/i, "")
              .replace(/dns.*/i, "")
              .trim();

            if (cleanTitle.length > 3) {
              detectedModel = cleanTitle;
            }
          }

          // Check if brand is clearly named inside the extracted model title
          const lowerTitle = detectedModel.toLowerCase();
          for (const [key, brandName] of Object.entries(brandPatterns)) {
            if (lowerTitle.includes(key)) {
              detectedBrand = brandName;
              break;
            }
          }

          // 2. Extract price - multi-stage prioritized selectors
          // Stage A0: Explicit itemprop="price" with content="..." attribute (Schema.org standardized offer in Rusklimat B2B and others)
          const itempropContentMatch =
            html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/content=["']([^"']+)["'][^>]*itemprop=["']price["']/i) ||
            html.match(/<meta\s+property=["']product:price:amount["']\s+content=["']([^"']+)["']/i);

          if (itempropContentMatch && itempropContentMatch[1]) {
            detectedPrice = extractValidPrice(itempropContentMatch[1]);
          }

          // Stage A: Rusklimat B2B / Daichi Business / Bitrix Retail price specific text and class containers
          if (!detectedPrice) {
            const rrcPatterns = [
              /Розничная цена[^<]*(?:<[^>]+>\s*)*([\d\s\u00A0&nbsp;.,]+)(?:₽|руб|RUB)?/i,
              /Рекомендованная розничная цена[^<]*(?:<[^>]+>\s*)*([\d\s\u00A0&nbsp;.,]+)(?:₽|руб|RUB)?/i,
              /Рекомендуемая розничная цена[^<]*(?:<[^>]+>\s*)*([\d\s\u00A0&nbsp;.,]+)(?:₽|руб|RUB)?/i,
              /<span[^>]*class="[^"]*price-numbers[^"]*"[^>]*>\s*([\d\s\u00A0&nbsp;.,]+)/i,
              /<div[^>]*class="[^"]*price-pane-old__value[^"]*"[^>]*>\s*([\d\s\u00A0&nbsp;.,]+)/i,
              /<div[^>]*class="[^"]*price-pane__val[^"]*"[^>]*>\s*([\d\s\u00A0&nbsp;.,]+)/i,
              /<div[^>]*class="[^"]*(?:product-price|price-current|current-price|price__val|price-value)[^"]*"[^>]*>\s*([\d\s\u00A0&nbsp;.,]+)/i,
            ];

            for (const pattern of rrcPatterns) {
              const m = html.match(pattern);
              if (m && m[1]) {
                const p = extractValidPrice(m[1]);
                if (p > 0) {
                  detectedPrice = p;
                  break;
                }
              }
            }
          }

          // Stage B: Standard Meta & Microdata (if Stage A yielded 0)
          if (!detectedPrice) {
            const ogPrice =
              html.match(/<meta\s+itemprop=["']price["']\s+content=["']([\d\.\s]+)["']/i) ||
              html.match(/<span[^>]+itemprop=["']price["'][^>]*>([\d\.\s&nbsp;.,]+)<\/span>/i) ||
              html.match(/<div[^>]+itemprop=["']price["'][^>]*>([\d\.\s&nbsp;.,]+)<\/div>/i);

            if (ogPrice && ogPrice[1]) {
              detectedPrice = extractValidPrice(ogPrice[1]);
            }
          }

          // Stage C: JSON-LD structured data check
          if (!detectedPrice) {
            const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
            let jsonMatch;
            while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
              try {
                const parsed = JSON.parse(jsonMatch[1]);
                const items = Array.isArray(parsed) ? parsed : [parsed];
                for (const item of items) {
                  const offers = item?.offers;
                  if (offers) {
                    const offerList = Array.isArray(offers) ? offers : [offers];
                    for (const off of offerList) {
                      const p = extractValidPrice(off?.price || off?.lowPrice);
                      if (p > 0) {
                        detectedPrice = p;
                        break;
                      }
                    }
                  }
                  if (detectedPrice > 0) break;
                }
              } catch {
                // ignore invalid json-ld syntax
              }
              if (detectedPrice > 0) break;
            }
          }

          // Stage D: Fallback scanning for dominant price near keyword "цена" or any formatted XX XXX ₽
          if (!detectedPrice) {
            const generalPriceMatch = html.match(/(?:цена|стоимость|купить)[^0-9<]{0,30}([\d]{2}[\u00A0\s&nbsp;]?[\d]{3})\s*(?:₽|руб|RUB)/i) ||
              html.match(/([\d]{2}\s*[\d]{3})\s*₽/);
            if (generalPriceMatch && generalPriceMatch[1]) {
              detectedPrice = extractValidPrice(generalPriceMatch[1]);
            }
          }
        }
      } catch {
        // network fetch failed or timed out, fallback to slug decoding below
      }
    }

    // Heuristic fallback if model name was not retrieved from HTML
    if (!detectedModel) {
      try {
        const urlObj = new URL(
          cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`
        );
        const segments = urlObj.pathname.split("/").filter(Boolean);
        const lastSegment = segments[segments.length - 1] || "";
        const decoded = decodeURIComponent(lastSegment)
          .replace(/[-_]+/g, " ")
          .replace(/\.html?/g, "");

        if (decoded && decoded.length > 3) {
          detectedModel = `${detectedBrand} ${decoded}`.trim();
        } else {
          detectedModel = `${detectedBrand} Сплит-система`;
        }
      } catch {
        detectedModel = `${detectedBrand} Сплит-система (инвертор)`;
      }
    }

    // Default realistic price if 0 was extracted
    if (!detectedPrice || detectedPrice < 5000) {
      if (detectedBrand === "Daikin" || detectedBrand === "Mitsubishi Electric") {
        detectedPrice = 64000;
      } else if (detectedBrand === "Ballu" || detectedBrand === "Electrolux") {
        detectedPrice = 34500;
      } else if (detectedBrand === "Axioma" || detectedBrand === "Daichi" || detectedBrand === "Gree") {
        detectedPrice = 31890;
      } else if (detectedBrand === "Shuft" || detectedBrand === "Zanussi") {
        detectedPrice = 29288;
      } else {
        detectedPrice = 28900;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        modelName: detectedModel,
        equipmentPrice: detectedPrice,
        equipmentBrand: detectedBrand,
        equipmentType: detectedType,
        equipmentUrl: cleanUrl,
        fetched: fetchedOk,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
