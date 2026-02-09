export function normalizeProduct(p) {
  if (!p) return null;

  const images = Array.isArray(p.images) ? p.images : [];
  const variants = Array.isArray(p.variants) ? p.variants : [];

  const cheapestVariant =
    variants.length > 0
      ? variants.reduce((min, v) =>
          (v.sell_price ?? Infinity) < (min.sell_price ?? Infinity) ? v : min
        )
      : null;

  return {
    id: p.product_id || p._id,
    name: p.product_name || p.name || "Unnamed Product",
    images,
    main_image: images[0] || null,
    variants,
    displayPrice: cheapestVariant?.sell_price ?? null,
    displayMrp: cheapestVariant?.mrp ?? null,
    sizesAvailable: variants.map(v => v.size),
    raw: p,
  };
}
