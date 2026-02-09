// server/routes/adminInvoice.js
import express from "express";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import Order from "../models/order.js";

const router = express.Router();
const INVOICE_DIR = path.join(process.cwd(), "data", "invoices");

function fmt(num) {
  // Ensure numeric and 2 decimals
  const n = Number(num || 0);
  return n.toFixed(2);
}

function currencySign(num) {
  // e.g. Rs. 123.45
  return `Rs. ${fmt(num)}`;
}

// Replace generateInvoicePdfBuffer in server/routes/adminInvoice.js with this function
// replace the existing generateInvoicePdfBuffer with this function
// replace generateInvoicePdfBuffer with this implementation
// Replace generateInvoicePdfBuffer with the function below
async function generateInvoicePdfBuffer(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 36, size: "A4" });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // helpers
      const fmt = (n) => Number(n || 0).toFixed(2);
      const money = (n) => `Rs. ${fmt(n)}`;

      // header
      doc.info.Title = `Invoice - ${order._id}`;
      doc.info.Author = "Sashvara";
      doc.fontSize(18).font("Helvetica-Bold").text("Sashvara", { align: "center" });
      doc.moveDown(0.12);
      doc.fontSize(13).text("TAX INVOICE", { align: "center" });
      doc.moveDown(0.6);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const leftX = doc.page.margins.left;
      const rightX = leftX + pageWidth;

      doc.moveTo(leftX, doc.y).lineTo(rightX, doc.y).strokeColor("#444").lineWidth(0.5).stroke();
      doc.moveDown(1);

      // three-column header (shipping / sold by / invoice details)
      const colGap = 12;
      const colWidth = Math.floor((pageWidth - colGap * 2) / 3);
      const col1X = leftX;
      const col2X = col1X + colWidth + colGap;
      const col3X = col2X + colWidth + colGap;
      const topY = doc.y;

      doc.font("Helvetica-Bold").fontSize(8.5).text("SHIPPING ADDRESS:", col1X, topY);
      doc.font("Helvetica").fontSize(8);
      const shipLines = [];
      if (order.shippingAddress && typeof order.shippingAddress === "object") {
        const a = order.shippingAddress;
        if (a.name) shipLines.push(a.name);
        if (a.address) shipLines.push(a.address);
        if (a.city || a.postalCode) shipLines.push(`${a.city || ""} ${a.postalCode || ""}`.trim());
        if (a.state || a.country) shipLines.push(`${a.state || ""} ${a.country || ""}`.trim());
        if (a.phone) shipLines.push(`Ph: ${a.phone}`);
      } else {
        if (order.firstName || order.lastName) shipLines.push(`${order.firstName || ""} ${order.lastName || ""}`.trim());
        if (order.address) shipLines.push(order.address);
        if (order.city || order.postalCode) shipLines.push(`${order.city || ""} ${order.postalCode || ""}`.trim());
        if (order.state || order.country) shipLines.push(`${order.state || ""} ${order.country || ""}`.trim());
        if (order.phone) shipLines.push(`Ph: ${order.phone}`);
      }
      doc.text(shipLines.join("\n"), col1X, topY + 12, { width: colWidth });

      doc.font("Helvetica-Bold").fontSize(8.5).text("SOLD BY:", col2X, topY);
      doc.font("Helvetica").fontSize(8);
      const soldByLines = [
        "Sashvara",
        "Block A, E-14, Kunwar singh nagar",
        "West Delhi 110041",
        "Delhi",
        "India",
        "State Code: 07",
        "Ph: 7982977359",
        "GSTIN No. 07QKFPS4003E1Z2",
        "Email: teamsashvara@gmail.com",
      ];
      doc.text(soldByLines.join("\n"), col2X, topY + 12, { width: colWidth });

      doc.font("Helvetica-Bold").fontSize(8.5).text("INVOICE DETAILS:", col3X, topY);
      doc.font("Helvetica").fontSize(8);
      const invDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—";
      const invoiceDetails = [
        `INVOICE NO. : ${order._id}`,
        `INVOICE DATE : ${invDate}`,
        `ORDER NO. : ${order.orderNumber || ""}`,
        `ORDER DATE : ${invDate}`,
        `CHANNEL : ${order.channel || "Website"}`,
        `SHIPPED BY : ${order.carrier || order.shippingMethod || "—"}`,
        `AWB NO. : ${order.awbNo || ""}`,
        `PAYMENT METHOD : ${order.paymentMethod || order.payment || "—"}`,
      ];
      doc.text(invoiceDetails.join("\n"), col3X, topY + 12, { width: colWidth });

      doc.moveDown(1.0);

      // table: NEW column distribution (shifted left)
      doc.font("Helvetica").fontSize(8);
      // new pct distribution (sno, product, hsn, qty, unitPrice, unitDisc, taxable, cgst, sgst, total)
      const pct = { sno: 4, product: 36, hsn: 10, qty: 5, unitPrice: 9, unitDisc: 7, taxable: 11, cgst: 7, sgst: 7, total: 4 };
      const colW = {};
      Object.keys(pct).forEach((k) => (colW[k] = Math.floor((pct[k] / 100) * pageWidth)));

      // ensure numeric columns have enough minimum width for currency
      const sampleMoney = "Rs. 123456.78";
      const minMoneyW = Math.ceil(doc.widthOfString(sampleMoney, { size: 8 })) + 8;
      ["unitPrice", "unitDisc", "taxable", "cgst", "sgst", "total"].forEach((k) => {
        if (colW[k] < minMoneyW) colW[k] = minMoneyW;
      });

      // recompute x positions
      const x = {};
      x.sno = leftX;
      x.product = x.sno + colW.sno + 6;
      x.hsn = x.product + colW.product + 6;
      x.qty = x.hsn + colW.hsn + 6;
      x.unitPrice = x.qty + colW.qty + 6;
      x.unitDisc = x.unitPrice + colW.unitPrice + 6;
      x.taxable = x.unitDisc + colW.unitDisc + 6;
      x.cgst = x.taxable + colW.taxable + 6;
      x.sgst = x.cgst + colW.cgst + 6;
      x.total = x.sgst + colW.sgst + 6;

      // header row
      doc.font("Helvetica-Bold").fontSize(8);
      const headerY = doc.y;
      doc.text("S.NO.", x.sno, headerY, { width: colW.sno, align: "left" });
      doc.text("PRODUCT NAME", x.product, headerY, { width: colW.product, align: "left" });
      doc.text("HSN", x.hsn, headerY, { width: colW.hsn, align: "left" });
      doc.text("QTY", x.qty, headerY, { width: colW.qty, align: "center" });
      doc.text("UNIT PRICE", x.unitPrice, headerY, { width: colW.unitPrice, align: "right" });
      doc.text("UNIT DISC", x.unitDisc, headerY, { width: colW.unitDisc, align: "right" });
      doc.text("TAXABLE", x.taxable, headerY, { width: colW.taxable, align: "right" });
      doc.text("CGST", x.cgst, headerY, { width: colW.cgst, align: "right" });
      doc.text("SGST", x.sgst, headerY, { width: colW.sgst, align: "right" });
      doc.text("TOTAL", x.total, headerY, { width: colW.total, align: "right" });

      doc.moveDown(0.5);
      doc.moveTo(leftX, doc.y).lineTo(rightX, doc.y).strokeColor("#ddd").lineWidth(0.5).stroke();
      doc.moveDown(0.6);

      // items: same logic as before (measure each cell and reserve max height)
      const items = order.cartItems || [];
      let cursorY = doc.y;
      let idx = 0;
      let grandTaxable = 0;
      let grandCGST = 0;
      let grandSGST = 0;
      let grandLineGross = 0;

      function computeShippingByPayment(method) {
        if (!method) return 0;
        const m = String(method).toLowerCase();
        if (m.includes("upi")) return 30;
        if (m.includes("cod")) return 70;
        if (m.includes("partial")) return 45;
        return 0;
      }
      const shippingFromOrder = Number(order.shippingCharges ?? order.shippingCharge ?? 0);
      const shippingByMapping = computeShippingByPayment(order.paymentMethod || order.payment);
      const shipping = shippingFromOrder > 0 ? shippingFromOrder : shippingByMapping;

      const DEFAULT_LOW_GST = 5;
      const DEFAULT_HIGH_GST = 12;

      for (const it of items) {
        idx++;
        const name = it.name || it.productName || "Item";
        const sku = it.sku || it.SKU || "";
        const hsn = it.hsn || it.HSN || "";
        const qty = Number(it.qty || 1);
        const rawUnitPrice = Number(it.price ?? it.sell_price ?? it.mrp ?? 0);

        let unitDiscount = 0;
        if (typeof it.unitDiscount !== "undefined") unitDiscount = Number(it.unitDiscount || 0);
        else if (typeof it.discount !== "undefined") {
          if (it.discountIsLine) unitDiscount = Number(it.discount || 0) / Math.max(qty, 1);
          else unitDiscount = Number(it.discount || 0);
        }

        const unitFinalPriceInclusive = rawUnitPrice - unitDiscount;
        let taxPercent = typeof it.taxPercent !== "undefined" ? Number(it.taxPercent) : null;
        if (taxPercent === null || Number.isNaN(taxPercent)) {
          taxPercent = unitFinalPriceInclusive < 1000 ? DEFAULT_LOW_GST : DEFAULT_HIGH_GST;
        }

        const unitTaxable = unitFinalPriceInclusive / (1 + taxPercent / 100);
        const taxableValue = unitTaxable * qty;
        const taxAmount = (unitFinalPriceInclusive * qty) - taxableValue;
        const cgst = taxAmount / 2;
        const sgst = taxAmount / 2;
        const lineGross = unitFinalPriceInclusive * qty;

        grandTaxable += taxableValue;
        grandCGST += cgst;
        grandSGST += sgst;
        grandLineGross += lineGross;

        // prepare strings
        const fontSizeBody = 8;
        const fontSizeSku = 7.5;
        const cgstStr = `${fmt(cgst)} (${fmt(taxPercent / 2)}%)`;
        const sgstStr = `${fmt(sgst)} (${fmt(taxPercent / 2)}%)`;
        const unitPriceStr = money(rawUnitPrice);
        const unitDiscStr = money(unitDiscount);
        const taxableStr = money(taxableValue);
        const totalStr = money(lineGross);
        const qtyStr = String(qty);
        const hsnStr = hsn || "";

        // measure
        doc.font("Helvetica").fontSize(fontSizeBody);
        const nameH = doc.heightOfString(name, { width: colW.product, align: "left" });
        const skuH = sku ? doc.heightOfString(`SKU: ${sku}`, { width: colW.product, size: fontSizeSku }) : 0;
        const nameBlockH = nameH + skuH;

        const hsnH = doc.heightOfString(hsnStr, { width: colW.hsn, size: fontSizeBody });
        const qtyH = doc.heightOfString(qtyStr, { width: colW.qty, size: fontSizeBody });
        const unitPriceH = doc.heightOfString(unitPriceStr, { width: colW.unitPrice, size: fontSizeBody });
        const unitDiscH = doc.heightOfString(unitDiscStr, { width: colW.unitDisc, size: fontSizeBody });
        const taxableH = doc.heightOfString(taxableStr, { width: colW.taxable, size: fontSizeBody });
        const cgstH = doc.heightOfString(cgstStr, { width: colW.cgst, size: fontSizeBody });
        const sgstH = doc.heightOfString(sgstStr, { width: colW.sgst, size: fontSizeBody });
        const totalH = doc.heightOfString(totalStr, { width: colW.total, size: fontSizeBody });

        const rowHeight = Math.max(
          nameBlockH,
          hsnH,
          qtyH,
          unitPriceH,
          unitDiscH,
          taxableH,
          cgstH,
          sgstH,
          totalH,
          doc.currentLineHeight()
        ) + 8;

        if (cursorY + rowHeight > doc.page.height - doc.page.margins.bottom - 120) {
          doc.addPage();
          cursorY = doc.y;
        }

        // draw
        doc.font("Helvetica").fontSize(fontSizeBody).fillColor("#000");
        doc.text(String(idx), x.sno, cursorY, { width: colW.sno, align: "left" });
        doc.text(name, x.product, cursorY, { width: colW.product, align: "left" });
        if (sku) {
          doc.font("Helvetica").fontSize(fontSizeSku).fillColor("#666")
            .text(`SKU: ${sku}`, x.product, cursorY + nameH, { width: colW.product, align: "left" });
          doc.fillColor("#000").fontSize(fontSizeBody);
        }
        doc.text(hsnStr, x.hsn, cursorY, { width: colW.hsn, align: "left" });
        doc.text(qtyStr, x.qty, cursorY, { width: colW.qty, align: "center" });
        doc.text(unitPriceStr, x.unitPrice, cursorY, { width: colW.unitPrice, align: "right" });
        doc.text(unitDiscStr, x.unitDisc, cursorY, { width: colW.unitDisc, align: "right" });
        doc.text(taxableStr, x.taxable, cursorY, { width: colW.taxable, align: "right" });
        doc.text(cgstStr, x.cgst, cursorY, { width: colW.cgst, align: "right" });
        doc.text(sgstStr, x.sgst, cursorY, { width: colW.sgst, align: "right" });
        doc.text(totalStr, x.total, cursorY, { width: colW.total, align: "right" });

        cursorY += rowHeight;
        doc.y = cursorY;
      } // end items

      // totals block
      const totalsW = 220;
      const totalsLeft = rightX - totalsW - 6;
      let tY = cursorY + 8;
      if (tY + 160 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        tY = doc.y + 8;
      }

      doc.font("Helvetica").fontSize(9);
      doc.text("Shipping Charges", totalsLeft, tY, { width: totalsW - 20, align: "left" });
      doc.text(money(shipping), totalsLeft, tY, { width: totalsW, align: "right" });
      tY += 14;
      doc.text("Taxable Value (Sum)", totalsLeft, tY, { width: totalsW - 20, align: "left" });
      doc.text(money(grandTaxable), totalsLeft, tY, { width: totalsW, align: "right" });
      tY += 14;
      doc.text("Total CGST", totalsLeft, tY, { width: totalsW - 20, align: "left" });
      doc.text(money(grandCGST), totalsLeft, tY, { width: totalsW, align: "right" });
      tY += 14;
      doc.text("Total SGST", totalsLeft, tY, { width: totalsW - 20, align: "left" });
      doc.text(money(grandSGST), totalsLeft, tY, { width: totalsW, align: "right" });
      tY += 18;
      const netTotal = grandLineGross + shipping;
      doc.font("Helvetica-Bold").fontSize(11).text("NET TOTAL (In Value)", totalsLeft, tY, { width: totalsW - 20, align: "left" });
      doc.text(money(netTotal), totalsLeft, tY, { width: totalsW, align: "right" });

      // reverse charge & signature
      doc.moveDown(3);
      doc.font("Helvetica").fontSize(8).text("Whether tax is payable under reverse charge - No");
      doc.moveDown(1.6);
      const sigX = leftX;
      const sigY = doc.y;
      doc.rect(sigX, sigY, 160, 70).stroke();
      doc.fontSize(8).text("Authorized Signature for", sigX, sigY + 74);
      doc.text("Sashvara", sigX, sigY + 86);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}




// Optional health/test endpoint
router.get("/_health", (req, res) => res.json({ success: true, mounted: true }));

// GET /api/invoices/:orderId/pdf
router.get("/:orderId/pdf", async (req, res) => {
  try {
    const { orderId } = req.params;
    // ensure invoice dir exists
    fs.mkdirSync(INVOICE_DIR, { recursive: true });

const filePath = path.join(INVOICE_DIR, `${orderId}.pdf`);

// ALWAYS regenerate invoice so new layout applies to ALL downloads
// (we still write to disk so subsequent requests are fast and to keep optional caching)
const order = await Order.findById(orderId).lean();
if (!order) {
  return res.status(404).json({ success: false, error: "Order not found" });
}

const pdfBuffer = await generateInvoicePdfBuffer(order);

// write/overwrite cache (optional; keeps files on disk)
try {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
  fs.writeFileSync(filePath, pdfBuffer);
} catch (e) {
  console.warn("Failed to cache invoice file:", e.message);
}

res.setHeader("Content-Type", "application/pdf");
res.setHeader("Content-Disposition", `inline; filename=invoice-${orderId}.pdf`);
return res.send(pdfBuffer);

  } catch (err) {
    console.error("GET /api/invoices/:orderId/pdf error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
