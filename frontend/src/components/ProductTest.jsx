import axios from "axios";
import { useEffect, useState } from "react";

function ProductTest() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1️⃣ Confirm environment variable
    console.log("VITE_API_HOST:", import.meta.env.VITE_API_HOST);

    // 2️⃣ Fetch products from backend
    axios
      .get(`${import.meta.env.VITE_API_HOST}/api/products?gender=Women&limit=10`)
      .then((res) => {
        console.log("Backend response:", res.data);
        setProducts(res.data.products || []); // adjust if your API returns different structure
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setError(err);
      });
  }, []);

  return (
    <div>
      <h1>Product Test</h1>
      {error && <p style={{ color: "red" }}>Failed to load products: Check console</p>}
      <ul>
        {products.map((p, idx) => (
          <li key={idx}>{p.name || p.title || JSON.stringify(p)}</li>
        ))}
      </ul>
    </div>
  );
}

export default ProductTest;
