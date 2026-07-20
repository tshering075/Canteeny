const LOGO_URL = `${process.env.PUBLIC_URL || ''}/logo.png`;

let logoDataUrlCache = null;
let logoLoadPromise = null;

/** Load Canteeny logo from public/ as a data URL for jsPDF. */
export async function loadCanteenyLogoDataUrl() {
  if (logoDataUrlCache) return logoDataUrlCache;
  if (logoLoadPromise) return logoLoadPromise;

  logoLoadPromise = fetch(LOGO_URL)
    .then((response) => {
      if (!response.ok) throw new Error('Logo not found');
      return response.blob();
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    )
    .then((dataUrl) => {
      logoDataUrlCache = dataUrl;
      return dataUrl;
    })
    .catch(() => {
      logoDataUrlCache = null;
      return null;
    })
    .finally(() => {
      logoLoadPromise = null;
    });

  return logoLoadPromise;
}

/**
 * Branded PDF header: Canteeny logo, tenant name, report title.
 * Returns Y position for content below the header.
 */
export function drawBrandedReportHeader(
  doc,
  {
    title,
    tenantName = '',
    metaLines = [],
    subtitle = 'Sales report',
    pageWidth = 210,
    margin = 18,
    ink = [23, 23, 23],
    muted = [100, 116, 139],
    border = [226, 232, 240],
    accent = [62, 207, 142],
    logoDataUrl = null,
  }
) {
  const right = pageWidth - margin;
  const logoSize = 14;
  const textX = logoDataUrl ? margin + logoSize + 4 : margin;
  const tenant = (tenantName || '').trim();

  doc.setFillColor(...accent);
  doc.rect(0, 0, pageWidth, 3, 'F');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin, 8, logoSize, logoSize);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...ink);
  doc.text('Canteeny', textX, 16);

  let brandBottom = 20;
  if (tenant) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    doc.text(tenant, textX, 22);
    brandBottom = 26;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(subtitle, textX, tenant ? 27 : 22);
  brandBottom = Math.max(brandBottom, tenant ? 29 : 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...ink);
  doc.text(title, right, 18, { align: 'right' });

  const dividerY = Math.max(brandBottom + 4, 32);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.4);
  doc.line(margin, dividerY, right, dividerY);

  let y = dividerY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  (metaLines || []).forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });

  return y + 4;
}
