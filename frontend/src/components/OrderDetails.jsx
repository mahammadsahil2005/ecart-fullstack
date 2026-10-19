import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api";
import "./OrderDetails.css";

function OrderDetails() {
  const { orderId } = useParams();

  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;
  const userId = user?.id;

  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [order, setOrder] = useState(null);

  const [requestState, setRequestState] = useState({
    orderId: null,
    error: "",
  });

  const loading = requestState.orderId !== orderId;

  const error =
    requestState.orderId === orderId
      ? requestState.error
      : "";

  // Fetch order details
  useEffect(() => {
    if (userId == null) {
      return;
    }

    let cancelled = false;

    async function fetchOrderDetails() {
      let requestError = "";

      // Clear details from a previously viewed order
      setOrder(null);
      setOrderItems([]);
      setProducts([]);

      try {
        // 1. Fetch the user's orders using the JWT token
        const ordersResponse = await apiFetch("/api/orders");

        if (!ordersResponse.ok) {
          throw new Error("Failed to fetch orders.");
        }

        const ordersData = await ordersResponse.json();

        // Find the requested order in this user's order list
        const currentOrder = ordersData.find(
          (item) => Number(item.id) === Number(orderId)
        );

        if (!currentOrder) {
          throw new Error(
            "Order not found. Please check your order ID."
          );
        }

        if (cancelled) return;

        setOrder(currentOrder);

        // 2. Fetch order items using the JWT token
        const itemsResponse = await apiFetch(
          `/api/order-items/order/${orderId}`
        );

        if (!itemsResponse.ok) {
          throw new Error("Failed to fetch order items.");
        }

        const itemsData = await itemsResponse.json();

        if (cancelled) return;

        setOrderItems(itemsData);

        // 3. Fetch products
        const productsResponse = await apiFetch(
          "/api/products"
        );

        if (!productsResponse.ok) {
          throw new Error("Failed to fetch products.");
        }

        const productsData = await productsResponse.json();

        if (cancelled) return;

        setProducts(productsData);

        console.log("Order Items:", itemsData);
        console.log("Products:", productsData);
      } catch (err) {
        console.error("Order details error:", err);

        requestError =
          err.message || "Unable to load order details.";
      } finally {
        if (!cancelled) {
          setRequestState({
            orderId,
            error: requestError,
          });
        }
      }
    }

    fetchOrderDetails();

    return () => {
      cancelled = true;
    };
  }, [orderId, userId]);

  // Order status steps
  const statuses = [
    "PLACED",
    "CONFIRMED",
    "SHIPPED",
    "DELIVERED",
  ];

  function getStatusIndex(status) {
    return statuses.indexOf(
      String(status || "").toUpperCase()
    );
  }

  // Login required
  if (userId == null) {
    return (
      <main className="order-details">
        <h1>Order Details</h1>
        <p>Please log in to view your order.</p>

        <Link to="/login">Login</Link>
        {" | "}
        <Link to="/orders">Back to My Orders</Link>
      </main>
    );
  }

  // Loading screen
  if (loading) {
    return (
      <main className="order-details">
        <h1>Order Details</h1>
        <p>Loading order details...</p>
      </main>
    );
  }

  // Error screen
  if (error) {
    return (
      <main className="order-details">
        <h1>Order Details</h1>
        <p role="alert">{error}</p>

        <Link to="/orders">Back to My Orders</Link>
      </main>
    );
  }

  // Order not found
  if (!order) {
    return (
      <main className="order-details">
        <h1>Order not found</h1>

        <Link to="/orders">Back to My Orders</Link>
      </main>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);

  // Support common API property names
  const fullName =
    order.fullName ??
    order.full_name ??
    order.name ??
    "Not available";

  const phone =
    order.phone ??
    order.phoneNumber ??
    "Not available";

  const street =
    order.street ??
    order.address ??
    "Not available";

  const city = order.city ?? "Not available";

  const state = order.state ?? "Not available";

  const pincode =
    order.pincode ??
    order.pinCode ??
    "Not available";

  const orderDate =
    order.orderDate ??
    order.createdAt ??
    order.created_at;

  return (
    <main className="order-details">
      <h1>Order #{order.id}</h1>

      {/* Order Information */}
      <section className="order-info">
        <p>
          <strong>Date:</strong>{" "}
          {orderDate
            ? new Date(orderDate).toLocaleString()
            : "Not available"}
        </p>

        <p>
          <strong>Total:</strong>{" "}
          ₹{Number(order.totalAmount ?? 0).toFixed(2)}
        </p>

        <p>
          <strong>Status:</strong>{" "}
          {order.status ?? "Not available"}
        </p>
      </section>

      {/* Delivery Address */}
      <section className="delivery-address">
        <h2>Delivery Address</h2>

        <p>
          <strong>Name:</strong> {fullName}
        </p>

        <p>
          <strong>Phone:</strong> {phone}
        </p>

        <p>
          <strong>Street:</strong> {street}
        </p>

        <p>
          <strong>City:</strong> {city}
        </p>

        <p>
          <strong>State:</strong> {state}
        </p>

        <p>
          <strong>Pincode:</strong> {pincode}
        </p>
      </section>

      {/* Order Status Tracker */}
      <section className="order-tracker-section">
        <h2>Order Tracking</h2>

        <div className="order-tracker">
          {statuses.map((status, index) => {
            const completed =
              currentStatusIndex >= 0 &&
              index <= currentStatusIndex;

            return (
              <div
                key={status}
                className={`tracker-step ${
                  completed ? "completed" : ""
                }`}
              >
                <div className="tracker-circle">
                  {completed ? "✓" : index + 1}
                </div>

                <p>{status}</p>
              </div>
            );
          })}
        </div>

        {String(order.status).toUpperCase() ===
          "CANCELLED" && (
          <p className="order-cancelled">
            This order has been cancelled.
          </p>
        )}
      </section>

      {/* Order Items */}
      <section className="order-items-section">
        <h2>Order Items</h2>

        {orderItems.length === 0 ? (
          <p>No items found for this order.</p>
        ) : (
          orderItems.map((item) => {
            const product = products.find(
              (product) =>
                Number(product.id) ===
                Number(item.productId ?? item.product_id)
            );

            const quantity = Number(item.quantity ?? 0);

            const price = Number(
              item.price ?? product?.price ?? 0
            );

            return (
              <div
                className="order-item"
                key={item.id}
              >
                <h3>
                  {product
                    ? product.name
                    : `Product #${
                        item.productId ??
                        item.product_id ??
                        "Unknown"
                      }`}
                </h3>

                <p>
                  <strong>Price:</strong> ₹
                  {price.toFixed(2)}
                </p>

                <p>
                  <strong>Quantity:</strong> {quantity}
                </p>

                <p>
                  <strong>Subtotal:</strong> ₹
                  {(price * quantity).toFixed(2)}
                </p>

                {!product && (
                  <p>
                    Product details could not be loaded,
                    but the order item exists.
                  </p>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Navigation */}
      <div className="order-navigation">
        <Link to="/orders">Back to My Orders</Link>

        {" | "}

        <Link to="/products">Continue Shopping</Link>
      </div>
    </main>
  );
}

export default OrderDetails;