import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import { buildImageUrl } from "../config";
import "./Cart.css";

function Cart() {
  const [backendCart, setBackendCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch user's cart and products
  useEffect(() => {
    async function loadCart() {
      try {
        const user = JSON.parse(
          localStorage.getItem("user") || "null"
        );

        if (!user) {
          setError("Please log in to view your cart.");
          return;
        }

        const [cartResponse, productsResponse] =
          await Promise.all([
            apiFetch("/api/cart"),
            apiFetch("/api/products"),
          ]);

        if (!cartResponse.ok) {
          throw new Error("Failed to load your cart.");
        }

        if (!productsResponse.ok) {
          throw new Error("Failed to load products.");
        }

        const cartData = await cartResponse.json();
        const productsData = await productsResponse.json();

        setBackendCart(cartData);
        setProducts(productsData);
      } catch (error) {
        console.error("Cart loading error:", error);
        setError(error.message || "Could not load your cart.");
      } finally {
        setLoading(false);
      }
    }

    loadCart();
  }, []);

  // Notify Navbar when the cart changes
  function notifyCartUpdated() {
    window.dispatchEvent(new Event("cartUpdated"));
  }

  // Update quantity
  async function updateQuantity(cartItemId, newQuantity) {
    if (newQuantity < 1) {
      return;
    }

    try {
      const response = await apiFetch(
        `/api/cart/${cartItemId}`,
        {
          method: "PUT",
          body: {
            quantity: newQuantity,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update quantity.");
      }

      setBackendCart((currentCart) =>
        currentCart.map((item) =>
          item.id === cartItemId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );

      notifyCartUpdated();
      setError("");
    } catch (error) {
      console.error("Quantity update error:", error);
      setError(error.message || "Could not update quantity.");
    }
  }

  // Increase quantity
  function increaseQuantity(cartItemId, currentQuantity) {
    updateQuantity(cartItemId, currentQuantity + 1);
  }

  // Decrease quantity
  function decreaseQuantity(cartItemId, currentQuantity) {
    updateQuantity(cartItemId, currentQuantity - 1);
  }

  // Remove product from cart
  async function removeFromCart(cartItemId) {
    try {
      const response = await apiFetch(
        `/api/cart/${cartItemId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove cart item.");
      }

      setBackendCart((currentCart) =>
        currentCart.filter((item) => item.id !== cartItemId)
      );

      notifyCartUpdated();
      setError("");
    } catch (error) {
      console.error("Remove cart error:", error);
      setError(error.message || "Could not remove item.");
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="cart-page">
        <div className="cart-heading">
          <span className="cart-kicker">YOUR SELECTION</span>
          <h1>Your cart</h1>
        </div>
        <p className="cart-message">Loading your cart...</p>
      </main>
    );
  }

  // Error or login message
  if (error && backendCart.length === 0) {
    return (
      <main className="cart-page">
        <div className="cart-heading">
          <span className="cart-kicker">YOUR SELECTION</span>
          <h1>Your cart</h1>
        </div>
        <p className="cart-error" role="alert">{error}</p>
        <Link className="cart-primary-link" to="/products">Continue Shopping</Link>
      </main>
    );
  }

  // Calculate total
  const totalAmount = backendCart.reduce((total, cartItem) => {
    const product = products.find(
      (item) => item.id === cartItem.productId
    );

    return product
      ? total + product.price * cartItem.quantity
      : total;
  }, 0);

  return (
    <main className="cart-page">
      <div className="cart-heading">
        <div>
          <span className="cart-kicker">YOUR SELECTION</span>
          <h1>Your cart</h1>
        </div>
        <span className="cart-item-count">
          {backendCart.length} {backendCart.length === 1 ? "item" : "items"}
        </span>
      </div>

      {error && <p className="cart-error" role="alert">{error}</p>}

      {backendCart.length === 0 ? (
        <section className="cart-empty">
          <div className="cart-empty-icon" aria-hidden="true">⌑</div>
          <h2>Your cart is waiting for something good.</h2>
          <p>Browse the collection and add a few favorites.</p>
          <Link className="cart-primary-link" to="/products">Explore products</Link>
        </section>
      ) : (
        <div className="cart-layout">
          <section className="cart-items" aria-label="Items in your cart">
            {backendCart.map((cartItem) => {
              const product = products.find(
                (item) => item.id === cartItem.productId
              );

              if (!product) {
                return null;
              }

              const imageUrl = buildImageUrl(product.imageUrl);

              return (
                <article className="cart-item" key={cartItem.id}>
                  <div className="cart-item-image">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" />
                    ) : (
                      <span aria-hidden="true">✦</span>
                    )}
                  </div>
                  <div className="cart-item-details">
                    <h2>{product.name}</h2>
                    <p className="cart-item-price">
                      ₹{Number(product.price || 0).toLocaleString("en-IN")}
                    </p>
                    <button
                      className="cart-remove"
                      type="button"
                      onClick={() => removeFromCart(cartItem.id)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="cart-item-end">
                    <div className="cart-quantity" aria-label={`Quantity ${cartItem.quantity}`}>
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${product.name}`}
                        onClick={() => decreaseQuantity(cartItem.id, cartItem.quantity)}
                        disabled={cartItem.quantity <= 1}
                      >
                        −
                      </button>
                      <span>{cartItem.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${product.name}`}
                        onClick={() => increaseQuantity(cartItem.id, cartItem.quantity)}
                      >
                        +
                      </button>
                    </div>
                    <strong>
                      ₹{(product.price * cartItem.quantity).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                </article>
              );
            })}
            <Link className="cart-continue-link" to="/products">
              <span aria-hidden="true">←</span> Continue shopping
            </Link>
          </section>

          <aside className="cart-summary">
            <span className="cart-summary-kicker">ORDER SUMMARY</span>
            <h2>Almost yours.</h2>
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <strong>₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="cart-summary-row">
              <span>Delivery</span>
              <strong className="cart-free">Calculated at checkout</strong>
            </div>
            <div className="cart-summary-total">
              <span>Total</span>
              <strong>₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <Link className="cart-checkout-link" to="/checkout">
              Continue to checkout <span aria-hidden="true">→</span>
            </Link>
            <p className="cart-secure-note">Secure checkout · Your order is reserved for 30 minutes</p>
          </aside>
        </div>
      )}
    </main>
  );
}

export default Cart;