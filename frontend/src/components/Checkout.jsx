import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import PhonePePayment from "./PhonePePayment";
import "./Checkout.css";

function Checkout() {
  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  // Handle input changes
  function handleChange(event) {
    const { name, value } = event.target;

    setAddress((currentAddress) => ({
      ...currentAddress,
      [name]: value,
    }));
  }

  // Validate delivery address
  function validateAddress() {
    const {
      fullName,
      phone,
      street,
      city,
      state,
      pincode,
    } = address;

    if (
      !fullName.trim() ||
      !phone.trim() ||
      !street.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      return "Please fill in all delivery address fields.";
    }

    if (!/^[0-9]{10}$/.test(phone.trim())) {
      return "Please enter a valid 10-digit phone number.";
    }

    if (!/^[0-9]{6}$/.test(pincode.trim())) {
      return "Please enter a valid 6-digit PIN code.";
    }

    return "";
  }

  // Place order
  async function handleCheckout(event) {
    event.preventDefault();
    setError("");

    if (!user || !user.id) {
      setError("Please log in before placing your order.");
      return;
    }

    const validationError = validateAddress();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch(
        `/api/checkout/${user.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            fullName: address.fullName.trim(),
            phone: address.phone.trim(),
            street: address.street.trim(),
            city: address.city.trim(),
            state: address.state.trim(),
            pincode: address.pincode.trim(),
          }),
        }
      );

      // Handle empty or non-JSON error responses safely
      const responseText = await response.text();

      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to place your order."
        );
      }

      setOrder(data);

      // Notify Navbar that the cart may have changed
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Checkout error:", err);

      setError(
        err.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Order confirmation screen
  if (order) {
    return (
      <main className="checkout-page">
        <section className="checkout-success">
          <div className="success-icon">✓</div>

          <h1>Order Placed Successfully!</h1>

          <p>Thank you for shopping with us.</p>

          <h2>Order #{order.id}</h2>

          <p>
            Order Status: <strong>{order.status}</strong>
          </p>

          <PhonePePayment
            amount={order.totalAmount}
            orderId={order.id}
          />

          <p>
            Total Amount:{" "}
            <strong>
              ₹{Number(order.totalAmount).toFixed(2)}
            </strong>
          </p>

          <div className="delivery-summary">
            <h3>Delivery Address</h3>

            <p>{order.fullName || address.fullName}</p>

            <p>{order.street || address.street}</p>

            <p>
              {order.city || address.city},{" "}
              {order.state || address.state} -{" "}
              {order.pincode || address.pincode}
            </p>

            <p>
              Phone: {order.phone || address.phone}
            </p>
          </div>

          <Link to="/products" className="checkout-button">
            Continue Shopping
          </Link>
        </section>
      </main>
    );
  }

  // Checkout form
  return (
    <main className="checkout-page">
      <div className="checkout-header">
        <h1>Checkout</h1>

        <p>
          Enter your delivery details to place your order.
        </p>
      </div>

      {!user && (
        <div className="checkout-error">
          Please log in before checking out.{" "}
          <Link to="/login">Login</Link>
        </div>
      )}

      <div className="checkout-layout">
        <section className="checkout-form-section">
          <h2>Delivery Address</h2>

          {error && (
            <div className="checkout-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleCheckout}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                value={address.fullName}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>

              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={address.phone}
                onChange={handleChange}
                autoComplete="tel"
                maxLength={10}
                inputMode="numeric"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="street">Street Address</label>

              <textarea
                id="street"
                name="street"
                placeholder="House number, street, area"
                value={address.street}
                onChange={handleChange}
                autoComplete="street-address"
                rows={3}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>

                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="Enter city"
                  value={address.city}
                  onChange={handleChange}
                  autoComplete="address-level2"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="state">State</label>

                <input
                  id="state"
                  name="state"
                  type="text"
                  placeholder="Enter state"
                  value={address.state}
                  onChange={handleChange}
                  autoComplete="address-level1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="pincode">PIN Code</label>

              <input
                id="pincode"
                name="pincode"
                type="text"
                placeholder="6-digit PIN code"
                value={address.pincode}
                onChange={handleChange}
                autoComplete="postal-code"
                maxLength={6}
                inputMode="numeric"
                required
              />
            </div>

            <button
              type="submit"
              className="checkout-button"
              disabled={loading || !user}
            >
              {loading ? "Placing Order..." : "Place Order"}
            </button>
          </form>
        </section>

        <aside className="checkout-summary">
          <h2>Order Summary</h2>

          <p>
            Your cart items will be checked by the server
            before your order is placed.
          </p>

          <p>
            <strong>Payment:</strong> Not processed by
            this checkout code.
          </p>

          <Link to="/cart" className="back-to-cart">
            ← Back to Cart
          </Link>
        </aside>
      </div>
    </main>
  );
}

export default Checkout;