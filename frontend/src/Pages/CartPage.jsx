import React from "react";
import CartDrawer from "../components/CartDrawer";
import { useCart } from "../context/CartContext";

const CartPage = () => {
  const { cartItems, setCartItems } = useCart();

  return (
    <CartDrawer asPage products={cartItems} setProducts={setCartItems} />
  );
};

export default CartPage;


