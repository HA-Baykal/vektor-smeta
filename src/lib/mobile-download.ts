export async function downloadBlob(blob: Blob, fileName: string) {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isInTelegram = !!(window as any).Telegram?.WebApp;

  // Try Web Share API with files for mobile - best for Telegram Mini App and mobile browsers
  try {
    const file = new File([blob], fileName, { type: blob.type });
    // @ts-ignore
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      // @ts-ignore
      await navigator.share({
        files: [file],
        title: fileName,
      });
      return true;
    }
  } catch (e) {
    console.log("Web Share API failed or cancelled, fallback to download", e);
    // If user cancelled share, don't fallback
    if ((e as any)?.name === "AbortError") {
      return true;
    }
  }

  // For mobile, try to use anchor download with direct click - must be synchronous
  try {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    
    // For iOS, need to add to body and trigger
    document.body.appendChild(a);
    
    // Create and dispatch click event that is considered user gesture
    const clickEvent = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(clickEvent);
    
    // Fallback: direct click() call
    setTimeout(() => {
      a.click();
    }, 100);

    // Clean up after delay
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      window.URL.revokeObjectURL(url);
    }, 2000);

    return true;
  } catch (e) {
    console.error("Anchor download failed", e);
  }

  // Last resort: open blob URL in new tab (for PDF viewing, not download)
  try {
    const url = window.URL.createObjectURL(blob);
    const newWindow = window.open(url, "_blank");
    if (!newWindow) {
      // If popup blocked, try location href
      window.location.href = url;
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } else {
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    }
    return true;
  } catch (e) {
    console.error("Open blob URL failed", e);
    alert(`Не удалось скачать файл ${fileName}. Попробуйте использовать кнопку Excel или скопировать текст. На телефоне используйте меню "Поделиться" в браузере.`);
    return false;
  }
}

export function openPrintableForMobile(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("Элемент не найден");
    return;
  }

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isInTelegram = !!(window as any).Telegram?.WebApp;

  try {
    const styles = Array.from(document.querySelectorAll('style'))
      .map((el) => el.outerHTML)
      .join("\n");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
          <title>${fileName}</title>
          ${styles}
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; padding: 12px; background: white; color: black; font-size: 12px; line-height: 1.4; max-width: 100%; overflow-x: hidden; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 4px 6px; word-break: break-word; }
            img { max-width: 100%; height: auto; }
            .no-print { position: sticky; top: 0; z-index: 100; background: white; padding: 12px; border-bottom: 2px solid #e2e8f0; margin: -12px -12px 12px -12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
            @media print {
              .no-print { display: none !important; }
              body { padding: 8px; font-size: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" style="flex: 1; min-width: 120px; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;">
              🖨️ Печать / Сохранить PDF
            </button>
            <button onclick="window.close(); if(!window.closed) { history.back(); }" style="padding: 12px 16px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
              ✕ Закрыть
            </button>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 12px; padding: 8px; background: #f1f5f9; border-radius: 8px;">
            💡 На телефоне: нажмите "Печать / Сохранить PDF" → в диалоге выберите "Сохранить как PDF" или используйте меню браузера "Поделиться → Сохранить в файлы"
          </div>
          ${element.innerHTML}
        </body>
      </html>
    `;

    // For mobile, use Blob URL approach which is more reliable than about:blank
    const blob = new Blob([htmlContent], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);

    // Try to open in new tab
    const newWindow = window.open(blobUrl, "_blank");
    
    if (!newWindow) {
      // Fallback: try to create overlay in current page for mobile
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "white";
      overlay.style.zIndex = "9999";
      overlay.style.overflow = "auto";
      overlay.style.padding = "0";
      overlay.innerHTML = htmlContent;
      
      // Add close button to overlay
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕ Закрыть предпросмотр";
      closeBtn.style.position = "fixed";
      closeBtn.style.top = "10px";
      closeBtn.style.right = "10px";
      closeBtn.style.zIndex = "10000";
      closeBtn.style.padding = "10px 16px";
      closeBtn.style.background = "#1e293b";
      closeBtn.style.color = "white";
      closeBtn.style.border = "none";
      closeBtn.style.borderRadius = "8px";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.fontWeight = "bold";
      closeBtn.onclick = () => {
        document.body.removeChild(overlay);
        URL.revokeObjectURL(blobUrl);
      };
      
      overlay.appendChild(closeBtn);
      document.body.appendChild(overlay);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } else {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    }
  } catch (e) {
    console.error("Failed to open printable:", e);
    alert("Не удалось открыть предпросмотр. Попробуйте скачать Excel или используйте компьютер для печати.");
  }
}
