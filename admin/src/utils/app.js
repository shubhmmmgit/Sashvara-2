// Currency formatter
export function formatCurrency(amount, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch (e) {
    return `₹${amount}`;
  }
}

// Short date formatter
export function shortDate(ts) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}
