import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import "./Orders.css";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;
  const userId = user?.id;

  // Fetch user's orders
  useEffect(() => {
    if (userId == null) {
      return;
    }

    async function fetchOrders() {
      try {
        setLoading(true);

        const response = await apiFetch("/api/orders");

        if (!response.ok) {
          throw new Error("Failed to fetch orders.");
        }

        const data = await response.json();

        console.log("My Orders:", data);

        setOrders(data);
        setError("");
      } catch (err) {
        console.error("Orders API error:", err);
        setError(err.message || "Unable to load orders.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [userId]);

  // CSS class for the order status
  function getStatusClass(status) {
    return status ? status.toLowerCase() : "";
  }

  // Cancel an order
  async function cancelOrder(orderId) {
    const confirmed = window.confirm(
      `Are you sure you want to cancel Order #${orderId}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingOrderId(orderId);
      setMessage("");
      setError("");

      const response = await apiFetch(
        `/api/orders/${orderId}/cancel`,
        {
          method: "PUT",
        }
      );

      // Read response safely
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
          data.message ||
            data.error ||
            "Unable to cancel this order."
        );
      }

      // Update order status in the UI
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? { ...order, status: data.status || "CANCELLED" }
            : order
        )
      );

      setMessage(
        `Order #${orderId} cancelled successfully.`
      );
    } catch (err) {
      console.error("Cancel order error:", err);
      setError(err.message || "Unable to cancel this order.");
    } finally {
      setCancellingOrderId(null);
    }
  }

  // If the user is not logged in
  if (userId == null) {
    return (
      <main className="orders-page">
        <div className="orders-heading">
          <span className="orders-kicker">ORDER HISTORY</span>
          <h1>Your orders</h1>
        </div>
        <section className="orders-empty">
          <p>Please log in to view your orders.</p>
          <Link to="/login">Log in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="orders-page">
      <div className="orders-heading">
        <div>
          <span className="orders-kicker">ORDER HISTORY</span>
          <h1>Your orders</h1>
        </div>
        <Link className="orders-shop-link" to="/products">Continue shopping</Link>
      </div>

      {message && (
        <p className="orders-message" role="status">
          {message}
        </p>
      )}

      {error && (
        <p className="orders-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="orders-empty">Loading your orders...</p>
      ) : orders.length === 0 ? (
        <section className="orders-empty">
          <div className="orders-empty-icon" aria-hidden="true">↗</div>
          <h2>Your next great find is out there.</h2>
          <p>You have no orders yet. Once you place an order, you can track it here.</p>
          <Link to="/products">Explore products</Link>
        </section>
      ) : (
        <section className="orders-list" aria-label="Your orders">
          {orders.map((order) => {
          const status = String(
            order.status || ""
          ).toUpperCase();

          const canCancel =
            status === "PLACED" ||
            status === "CONFIRMED";

          return (
            <article className="order-card" key={order.id}>
              <div className="order-card-header">
                <div>
                  <span className="order-card-label">ORDER</span>
                  <h2>#{order.id}</h2>
                </div>
                <span className={`order-status ${getStatusClass(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <div className="order-card-meta">
                <p>
                  <span>Placed</span>
                  <strong>
                    {order.orderDate
                      ? new Date(order.orderDate).toLocaleDateString()
                      : "Not available"}
                  </strong>
                </p>
                <p>
                  <span>Total</span>
                  <strong>
                    ₹{Number(order.totalAmount ?? 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </p>
              </div>
              <div className="order-card-actions">
                <Link to={`/orders/${order.id}`}>View order details <span aria-hidden="true">→</span></Link>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => cancelOrder(order.id)}
                    disabled={
                      cancellingOrderId === order.id
                    }
                  >
                    {cancellingOrderId === order.id
                      ? "Cancelling..."
                      : "Cancel Order"}
                  </button>
                )}
              </div>
            </article>
          );
          })}
        </section>
      )}
    </main>
  );
}

export default Orders;