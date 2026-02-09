// backend/server/utils/pdf.js
import puppeteer from "puppeteer";

/**
 * Compute tax breakdown given total taxable value and gstRate.
 * If intraState true => split equally into CGST+SGST.
 * If not => IGST only.
 */
function computeTax(taxableAmount, gstRate = 0) {
  const gst = (taxableAmount * gstRate) / 100;
  const half = gst / 2;
  return {
    taxableAmount,
    gstRate,
    gst: Number(gst.toFixed(2)),
    cgst: Number(half.toFixed(2)),
    sgst: Number(half.toFixed(2)),
    igst: Number(gst.toFixed(2)),
  };
}

/**
 * Build invoice HTML. Keep it simple & printable.
 * seller: { name, gstin, address, state }
 * order: order object from DB (cartItems, total, etc.)
 */
function buildInvoiceHtml(order, seller = {}, options = {}) {
  const company = seller.name || process.env.SELLER_NAME || "Your Shop";
  const companyGst = seller.gstin || process.env.SELLER_GSTIN || "";
  const companyAddress = seller.address || process.env.SELLER_ADDRESS || "";
  const sellerState = (seller.state || process.env.SELLER_STATE || "").toLowerCase().trim();

  const gstRate = Number(process.env.GST_RATE || options.gstRate || 18); // default 18%
  const buyerState = (order.state || "").toLowerCase().trim();
  const intraState = buyerState && sellerState && (buyerState === sellerState);

  // compute totals and taxable value (assuming order.total is inclusive of taxes OR not?)
  // We will assume order.total is the taxable subtotal (pre-tax). If your app stores totals including tax,
  // change logic accordingly. Here we compute tax on sum of (price * qty).
  const taxable = (order.cartItems || []).reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 1)), 0);
  const taxes = computeTax(taxable, gstRate);
  const totalWithTax = Number((taxable + taxes.gst).toFixed(2));

  // format currency quickly
  const fmt = (v) => (options.formatCurrency ? options.formatCurrency(v) : `₹${v.toFixed(2)}`);

  const itemsRows = (order.cartItems || []).map((it, i) => {
    const lineTotal = (Number(it.price || 0) * Number(it.qty || 1));
    return `
      <tr>
        <td style="padding:8px;border:1px solid #eee">${i + 1}</td>
        <td style="padding:8px;border:1px solid #eee">${it.name || ""}</td>
        <td style="padding:8px;border:1px solid #eee;text-align:center">${it.qty || 1}</td>
        <td style="padding:8px;border:1px solid #eee;text-align:right">${fmt(Number(it.price || 0))}</td>
        <td style="padding:8px;border:1px solid #eee;text-align:right">${fmt(lineTotal)}</td>
      </tr>
    `;
  }).join("");

  const docNumber = order.orderNumber || order._id;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${docNumber}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #222; padding: 24px; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 18px; }
          .company { font-weight:700; font-size:18px; }
          .meta { text-align:right; font-size:12px; color:#555; }
          table { width:100%; border-collapse:collapse; margin-top:12px; }
          th { text-align:left; padding:10px; background:#fafafa; font-weight:600; border:1px solid #eee; }
          td { padding:8px; border:1px solid #eee; vertical-align:top; }
          .right { text-align:right; }
          .small { font-size:12px; color:#555; }
          .totals { width: 320px; margin-left:auto; margin-top:12px; }
          .totals td { border:none; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">${company}</div>
            <div class="small">${companyAddress}</div>
            <div class="small">GSTIN: ${companyGst}</div>
            <div style="margin-top:8px" class="small">Bill To: <strong>${order.firstName || ""} ${order.lastName || ""}</strong></div>
            <div class="small">${order.address || ""} ${order.apartment || ""}</div>
            <div class="small">${order.city || ""} • ${order.state || ""} • ${order.pincode || ""}</div>
            <div class="small">Email: ${order.email || ""} • Phone: ${order.phone || ""}</div>
          </div>

          <div class="meta">
            <div><strong>Invoice</strong></div>
            <div>Invoice #: <strong>${docNumber}</strong></div>
            <div>Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}</div>
            <div>Payment: ${order.paymentMethod || "cod"}</div>
            <div>State: ${intraState ? "Intra-state (CGST+SGST)" : "Inter-state (IGST)"}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th>Item</th>
              <th style="width:80px;text-align:center">Qty</th>
              <th style="width:120px;text-align:right">Rate</th>
              <th style="width:120px;text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <table class="totals">
          <tbody>
            <tr>
              <td class="small">Taxable value:</td>
              <td class="right">${fmt(taxes.taxableAmount)}</td>
            </tr>

            <tr>
              <td class="small">GST (${taxes.gstRate}%)</td>
              <td class="right">${fmt(taxes.gst)}</td>
            </tr>

            ${intraState ? `
              <tr>
                <td class="small">CGST (${(taxes.gstRate/2).toFixed(2)}%)</td>
                <td class="right">${fmt(taxes.cgst)}</td>
              </tr>
              <tr>
                <td class="small">SGST (${(taxes.gstRate/2).toFixed(2)}%)</td>
                <td class="right">${fmt(taxes.sgst)}</td>
              </tr>
            ` : `
              <tr>
                <td class="small">IGST (${taxes.gstRate}%)</td>
                <td class="right">${fmt(taxes.igst)}</td>
              </tr>
            `}

            <tr>
              <td class="small"><strong>Total (incl. taxes)</strong></td>
              <td class="right"><strong>${fmt(totalWithTax)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:18px;font-size:12px;color:#555">
          <div><strong>Notes:</strong> Thank you for your purchase. This is a system-generated invoice.</div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate a PDF buffer for an invoice.
 * @param {Object} order - Order object (with cartItems, total, etc.)
 * @param {Object} seller - Optional seller meta (name, gstin, address, state)
 * @param {Object} opts - { gstRate, formatCurrency }
 * @returns {Promise<Buffer>}
 */
export async function generateInvoicePdfBuffer(order, seller = {}, opts = {}) {
  const html = buildInvoiceHtml(order, seller, opts);
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const buffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", bottom: "18mm", left: "12mm", right: "12mm" },
  });

  await browser.close();
  return buffer;
}
