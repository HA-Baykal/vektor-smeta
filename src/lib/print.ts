export function printElementById(elementId: string, title: string = "Документ") {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("Элемент для печати не найден");
    return;
  }

  // Check if inside Telegram Mini App
  const tg = (window as any).Telegram?.WebApp;
  const isInTelegram = !!tg;

  // For Telegram Mini App, window.print() often doesn't work
  // Try to use iframe method first, which works better in WebViews
  try {
    // Create hidden iframe for printing
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error("Cannot access iframe document");
    }

    // Copy styles from main document
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join("\n");

    const printStyles = `
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: white; 
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        @media print {
          body { margin: 0; padding: 15px; }
          .no-print { display: none !important; }
        }
      </style>
    `;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          ${styles}
          ${printStyles}
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for content to load, then print
    setTimeout(() => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          iframeWindow.focus();
          iframeWindow.print();
        } else {
          // Fallback to window.print()
          window.print();
        }
      } catch (e) {
        console.error("Iframe print failed, fallback to window.print", e);
        // Last resort: try window.print()
        window.print();
      }

      // Clean up iframe after print dialog closes (delay)
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);

    // For Telegram Mini App, also show hint
    if (isInTelegram) {
      setTimeout(() => {
        if (tg && tg.showPopup) {
          try {
            tg.showPopup({
              title: "Печать в Telegram",
              message: "В Telegram Mini App печать напрямую недоступна. Используйте кнопку 'Excel' для скачивания или откройте документ в браузере для сохранения в PDF через меню браузера.",
              buttons: [{ type: "ok" }],
            });
          } catch {}
        }
      }, 800);
    }
  } catch (error) {
    console.error("Print failed:", error);
    
    // Ultimate fallback - try window.print()
    try {
      // For Telegram, try openLink to external browser
      if (isInTelegram && tg && tg.openLink) {
        // Create a data URL or blob URL for the content?
        // For now, just try window.print and show message
        alert("Печать в Telegram Mini App ограничена. Пожалуйста, используйте кнопку 'Excel (.xlsx)' для выгрузки или откройте сайт во внешнем браузере для печати в PDF.");
        return;
      }
      window.print();
    } catch (e) {
      alert("Не удалось открыть печать. Попробуйте использовать выгрузку в Excel или скопировать текст сметы.");
    }
  }
}

export function openPrintableInNewTab(elementId: string, fileName: string = "document") {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("Элемент не найден");
    return;
  }

  const newWindow = window.open("", "_blank");
  if (!newWindow) {
    alert("Браузер заблокировал всплывающее окно. Разрешите всплывающие окна для этого сайта.");
    // Fallback to iframe method
    printElementById(elementId, fileName);
    return;
  }

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join("\n");

  newWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${fileName}</title>
        ${styles}
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: white; color: black; }
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 20px;" class="no-print">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
            🖨️ Распечатать / Сохранить как PDF
          </button>
          <button onclick="window.close()" style="margin-left: 10px; padding: 10px 20px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer;">
            Закрыть
          </button>
        </div>
        ${element.innerHTML}
      </body>
    </html>
  `);
  newWindow.document.close();
}
