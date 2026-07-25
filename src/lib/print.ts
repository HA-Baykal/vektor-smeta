export function printElementById(elementId: string, title: string = "Документ") {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("Элемент для печати не найден");
    return;
  }

  try {
    // Create hidden iframe for printing - most reliable method
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

    // Collect styles but filter out problematic ones for print
    const styleElements = Array.from(document.querySelectorAll('style'));
    const styles = styleElements
      .map((el) => el.outerHTML)
      .join("\n");

    const printStyles = `
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: Arial, Helvetica, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: white !important; 
          color: black !important;
          font-size: 12px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5 !important; font-weight: bold; }
        h1, h2, h3 { color: black !important; margin: 10px 0; }
        .no-print { display: none !important; }
        @media print {
          body { margin: 0; padding: 10px; }
          @page { margin: 15mm; }
        }
      </style>
    `;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
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
          // For better compatibility, use small delay before print
          setTimeout(() => {
            try {
              iframeWindow.print();
            } catch (e) {
              // If iframe print fails, try window.print
              window.print();
            }
          }, 100);
        } else {
          window.print();
        }
      } catch (e) {
        console.error("Iframe print failed, fallback to window.print", e);
        window.print();
      }

      // Clean up iframe after print dialog closes
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 400);
  } catch (error) {
    console.error("Print failed:", error);
    // Ultimate fallback
    try {
      window.print();
    } catch (e) {
      alert("Не удалось открыть печать. Используйте выгрузку в Excel, DOCX или PDF.");
    }
  }
}

export function openPrintableInNewTab(elementId: string, fileName: string = "document") {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("Элемент не найден");
    return;
  }

  try {
    const styles = Array.from(document.querySelectorAll('style'))
      .map((el) => el.outerHTML)
      .join("\n");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${fileName}</title>
          ${styles}
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; background: white; color: black; max-width: 900px; margin: 0 auto; font-size: 14px; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; }
            .no-print { display: flex; }
            @media print {
              .no-print { display: none !important; }
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; padding: 12px; background: #f1f5f9; border-radius: 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <button onclick="window.print()" style="padding: 10px 16px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;">
              🖨️ Печать / PDF
            </button>
            <button onclick="window.close()" style="padding: 10px 16px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
              ✕ Закрыть
            </button>
            <span style="font-size: 11px; color: #64748b;">💡 Выберите "Сохранить как PDF" в диалоге печати</span>
          </div>
          ${element.innerHTML}
        </body>
      </html>
    `;

    // Method 1: Try window.open with about:blank and write directly (most compatible, less likely to be blocked when called from click)
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      newWindow.focus();
    } else {
      // Method 2: Fallback to Blob URL with anchor click
      const blob = new Blob([htmlContent], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    }
  } catch (error) {
    console.error("Failed to open in new tab:", error);
    // Last resort: try iframe print
    printElementById(elementId, fileName);
  }
}
