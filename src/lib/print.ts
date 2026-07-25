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
    // Use Blob URL to avoid popup blocker issues
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
            body { font-family: Arial, sans-serif; padding: 20px; background: white; color: black; max-width: 900px; margin: 0 auto; }
            .no-print { display: block; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-radius: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;">
              🖨️ Распечатать / Сохранить как PDF
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
              Закрыть
            </button>
            <span style="font-size: 12px; color: #64748b; align-self: center;">💡 В диалоге печати выберите "Сохранить как PDF"</span>
          </div>
          ${element.innerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    
    // Try to open via window.open with blob URL - less likely to be blocked as it's same-origin
    const newWindow = window.open(blobUrl, "_blank");
    
    if (!newWindow) {
      // If blocked, try to create a temporary link and click it
      const link = document.createElement("a");
      link.href = blobUrl;
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL after some time
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } else {
      // Clean up blob URL after load
      newWindow.addEventListener('load', () => {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      });
    }
  } catch (error) {
    console.error("Failed to open in new tab:", error);
    // Fallback to iframe print
    printElementById(elementId, fileName);
  }
}
