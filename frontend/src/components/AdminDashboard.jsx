
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [deletingProductId, setDeletingProductId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [reviewingPaymentId, setReviewingPaymentId] = useState(null);
  const [paymentError, setPaymentError] = useState("");

  // Search, filter, and pagination
  const [stockFilter, setStockFilter] = useState("ALL");
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const ordersPerPage = 5;

  const admin = JSON.parse(
    localStorage.getItem("admin") || "null"
  );

  // Fetch products
  function fetchProducts() {
    fetch(`${API_BASE_URL}/api/products`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        return response.json();
      })
      .then((data) => {
        setProducts(data);
      })
      .catch((error) => {
        console.error("Products API error:", error);
        alert("Could not load products.");
      })
      .finally(() => {
        setLoadingProducts(false);
      });
  }

  // Fetch all orders
  function fetchOrders() {
    const token = localStorage.getItem("adminToken");

    fetch(`${API_BASE_URL}/api/orders/admin/all`, {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }

        return response.json();
      })
      .then((data) => {
        setOrders(data);
      })
      .catch((error) => {
        console.error("Orders API error:", error);
        alert("Could not load orders.");
      })
      .finally(() => {
        setLoadingOrders(false);
      });
  }

  function fetchPendingPayments() {
    const token = localStorage.getItem("adminToken");

    fetch(`${API_BASE_URL}/api/payments/admin/pending`, {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to fetch payment submissions");
        }

        return response.json();
      })
      .then((data) => {
        setPendingPayments(data);
        setPaymentError("");
      })
      .catch((error) => {
        console.error("Payment submissions API error:", error);
        setPaymentError(error.message || "Could not load payment submissions.");
      })
      .finally(() => {
        setLoadingPayments(false);
      });
  }

  // Load dashboard data
  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchPendingPayments();
  }, []);

  async function reviewPayment(paymentId, decision) {
    setReviewingPaymentId(paymentId);
    setPaymentError("");

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `${API_BASE_URL}/api/payments/admin/${paymentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ decision }),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not review payment.");
      }

      setPendingPayments((currentPayments) =>
        currentPayments.filter((payment) => payment.id !== paymentId)
      );
    } catch (error) {
      console.error("Payment review error:", error);
      setPaymentError(error.message || "Could not review payment.");
    } finally {
      setReviewingPaymentId(null);
    }
  }

  // Delete product
  function deleteProduct(productId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingProductId(productId);

    const token = localStorage.getItem("adminToken");

    fetch(`${API_BASE_URL}/api/products/${productId}`, {
      method: "DELETE",
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to delete product");
        }

        setProducts((currentProducts) =>
          currentProducts.filter(
            (product) => product.id !== productId
          )
        );
      })
      .catch((error) => {
        console.error("Delete product error:", error);
        alert("Could not delete product. Check your backend endpoint.");
      })
      .finally(() => {
        setDeletingProductId(null);
      });
  }

  // Determine the next order status
  function getNextStatus(status) {
    if (status === "PLACED") return "CONFIRMED";
    if (status === "CONFIRMED") return "SHIPPED";
    if (status === "SHIPPED") return "DELIVERED";

    return null;
  }

  // Update order status
  function updateStatus(orderId, newStatus) {
    setUpdatingOrderId(orderId);

    const token = localStorage.getItem("adminToken");

    fetch(
      `${API_BASE_URL}/api/orders/${orderId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update order status");
        }

        return response.json();
      })
      .then((updatedOrder) => {
        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            order.id === orderId ? updatedOrder : order
          )
        );
      })
      .catch((error) => {
        console.error("Status update error:", error);
        alert("Could not update order status.");
      })
      .finally(() => {
        setUpdatingOrderId(null);
      });
  }

  // Filter orders by order ID and status
  const filteredOrders = orders.filter((order) => {
    const searchText = orderSearch.trim().toLowerCase();

    const matchesSearch = String(order.id)
      .toLowerCase()
      .includes(searchText);

    const matchesStatus =
      statusFilter === "ALL" ||
      order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Dashboard analytics
  const totalSales = orders
    .filter((order) => order.status === "DELIVERED")
    .reduce(
      (total, order) =>
        total + Number(order.totalAmount || 0),
      0
    );

  const pendingOrders = orders.filter(
    (order) => order.status === "PLACED"
  ).length;

  const shippedOrders = orders.filter(
    (order) => order.status === "SHIPPED"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "DELIVERED"
  ).length;

  const lowStockProducts = products.filter(
    (product) => Number(product.quantity) > 0 &&
                 Number(product.quantity) < 5
  ).length;

  const outOfStockProducts = products.filter(
    (product) => Number(product.quantity) <= 0
  ).length;

  // Pagination calculations
  const totalPages = Math.ceil(
    filteredOrders.length / ordersPerPage
  );

  const startIndex = (currentPage - 1) * ordersPerPage;

  const currentOrders = filteredOrders.slice(
    startIndex,
    startIndex + ordersPerPage
  );

  const filteredProducts = products.filter((product) => {
    const quantity = Number(product.quantity);

    if (stockFilter === "LOW") {
      return quantity > 0 && quantity < 5;
    }

    if (stockFilter === "OUT") {
      return quantity <= 0;
    }

    return true;
  });

  // Admin logout
  function handleLogout() {
    localStorage.removeItem("admin");
    localStorage.removeItem("adminToken");

    navigate("/admin-login");
  }

  return (
    <main className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>

          {admin && (
            <p>Welcome, {admin.name}</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
        >
          Admin Logout
        </button>
      </header>

      {/* Dashboard Statistics */}
      <section className="admin-section">
        <h2>Dashboard Overview</h2>

        <div className="admin-stats">
          <div className="admin-stat-card">
            <h3>Total Products</h3>
            <p>{products.length}</p>
          </div>

          <div className="admin-stat-card">
            <h3>Low-Stock Products</h3>
            <p>{lowStockProducts}</p>
          </div>

          <div className="admin-stat-card">
            <h3>Out-of-Stock Products</h3>
            <p>{outOfStockProducts}</p>
          </div>

          <div className="admin-stat-card">
            <h3>Total Orders</h3>
            <p>{orders.length}</p>
          </div>

          <div className="admin-stat-card">
            <h3>Pending Orders</h3>
            <p>{pendingOrders}</p>
          </div>

          <div className="admin-stat-card">
            <h3>Shipped Orders</h3>
            <p>{shippedOrders}</p>
          </div>

          <div className="admin-stat-card">
            <h3>Delivered Orders</h3>
            <p>{deliveredOrders}</p>
          </div>

          <div className="admin-stat-card">
            <h3>Delivered Sales</h3>
            <p>
              ₹{totalSales.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </section>

      {/* Product Management */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Product Management</h2>

          <button
            type="button"
            onClick={() => navigate("/admin/add-product")}
          >
            + Add Product
          </button>
        </div>

        <div className="admin-product-filters">
          <label htmlFor="stock-filter">Inventory</label>
          <select
            id="stock-filter"
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
          >
            <option value="ALL">All Products</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock</option>
          </select>
        </div>

        {loadingProducts ? (
          <p className="admin-empty">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="admin-empty">
            {products.length === 0
              ? "No products found."
              : "No products match this stock filter."}
          </p>
        ) : (
          <div className="admin-product-list">
            {filteredProducts.map((product) => (
              <article
                className="admin-product-card"
                key={product.id}
              >
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="admin-product-image"
                  />
                )}

                <h3>{product.name}</h3>

                <p>
                  <strong>Product ID:</strong> {product.id}
                </p>

                <p>
                  <strong>Price:</strong> ₹
                  {Number(product.price || 0).toLocaleString("en-IN")}
                </p>

                <div className="admin-stock">
                  <strong>Stock:</strong> {product.quantity}

                  {Number(product.quantity) <= 0 ? (
                    <span className="stock-badge out-of-stock">
                      Out of Stock
                    </span>
                  ) : Number(product.quantity) < 5 ? (
                    <span className="stock-badge low-stock">
                      Low Stock
                    </span>
                  ) : (
                    <span className="stock-badge in-stock">
                      In Stock
                    </span>
                  )}
                </div>

                <p>
                  <strong>Category:</strong>{" "}
                  {product.category || "Not available"}
                </p>

                <p>
                  <strong>Description:</strong>{" "}
                  {product.description || "Not available"}
                </p>

                <div className="admin-product-actions">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/admin/edit-product/${product.id}`
                      )
                    }
                  >
                    Edit Product
                  </button>

                  <button
                    type="button"
                    className="admin-delete-btn"
                    onClick={() => deleteProduct(product.id)}
                    disabled={deletingProductId === product.id}
                  >
                    {deletingProductId === product.id
                      ? "Deleting..."
                      : "Delete Product"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Manual payment review */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Payment Review</h2>
          <button
            type="button"
            onClick={fetchPendingPayments}
            disabled={loadingPayments}
          >
            Refresh
          </button>
        </div>

        <p className="admin-payment-note">
          Check each transaction in your payment provider before approving.
          Approval here is a manual record and is not verified by PhonePe.
        </p>

        {paymentError && (
          <p className="admin-payment-error" role="alert">
            {paymentError}
          </p>
        )}

        {loadingPayments ? (
          <p className="admin-empty">Loading payment submissions...</p>
        ) : pendingPayments.length === 0 ? (
          <p className="admin-empty">No payment submissions need review.</p>
        ) : (
          <div className="admin-payment-list">
            {pendingPayments.map((payment) => {
              const order = orders.find(
                (currentOrder) => currentOrder.id === payment.orderId
              );

              return (
                <article className="admin-order-card" key={payment.id}>
                  <h3>Payment for Order #{payment.orderId}</h3>
                  <p>
                    <strong>User ID:</strong> {payment.userId}
                  </p>
                  <p>
                    <strong>Order amount:</strong>{" "}
                    {order
                      ? `₹${Number(order.totalAmount || 0).toLocaleString("en-IN")}`
                      : "Order amount unavailable"}
                  </p>
                  <p>
                    <strong>Transaction reference:</strong>{" "}
                    {payment.reference}
                  </p>
                  <p>
                    <strong>Submitted:</strong>{" "}
                    {payment.submittedAt
                      ? new Date(payment.submittedAt).toLocaleString("en-IN")
                      : "Date unavailable"}
                  </p>

                  <div className="admin-payment-actions">
                    <button
                      type="button"
                      className="admin-payment-approve"
                      onClick={() => reviewPayment(payment.id, "APPROVED")}
                      disabled={reviewingPaymentId === payment.id}
                    >
                      {reviewingPaymentId === payment.id
                        ? "Saving..."
                        : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="admin-payment-reject"
                      onClick={() => reviewPayment(payment.id, "REJECTED")}
                      disabled={reviewingPaymentId === payment.id}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Order Management */}
      <section className="admin-section">
        <h2>Order Management</h2>

        {/* Search and status filters */}
        <div className="admin-order-filters">
          <input
            type="text"
            placeholder="Search by order ID..."
            value={orderSearch}
            onChange={(event) => {
              setOrderSearch(event.target.value);
              setCurrentPage(1);
            }}
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Orders</option>
            <option value="PLACED">Placed</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {loadingOrders ? (
          <p className="admin-empty">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="admin-empty">No orders found.</p>
        ) : filteredOrders.length === 0 ? (
          <p className="admin-empty">
            No matching orders found.
          </p>
        ) : (
          <>
            <p className="admin-results-count">
              Showing {startIndex + 1}–
              {Math.min(
                startIndex + ordersPerPage,
                filteredOrders.length
              )}{" "}
              of {filteredOrders.length} matching orders
            </p>

            <div className="admin-order-list">
              {currentOrders.map((order) => {
                const nextStatus = getNextStatus(order.status);

                return (
                  <article
                    className="admin-order-card"
                    key={order.id}
                  >
                    <h3>Order #{order.id}</h3>

                    <p>
                      <strong>User ID:</strong> {order.userId}
                    </p>

                    <p>
                      <strong>Total Amount:</strong> ₹
                      {Number(
                        order.totalAmount || 0
                      ).toLocaleString("en-IN")}
                    </p>

                    <p>
                      <strong>Status:</strong>{" "}
                      <span
                        className={`status-${String(
                          order.status || "unknown"
                        ).toLowerCase()}`}
                      >
                        {order.status || "Unknown"}
                      </span>
                    </p>

                    <p>
                      <strong>Order Date:</strong>{" "}
                      {order.orderDate
                        ? new Date(
                            order.orderDate
                          ).toLocaleString("en-IN")
                        : "Historical date unavailable"}
                    </p>

                    {nextStatus ? (
                      <button
                        type="button"
                        className="admin-status-btn"
                        onClick={() =>
                          updateStatus(order.id, nextStatus)
                        }
                        disabled={updatingOrderId === order.id}
                      >
                        {updatingOrderId === order.id
                          ? "Updating..."
                          : `Mark as ${nextStatus}`}
                      </button>
                    ) : (
                      <p>
                        {order.status === "DELIVERED"
                          ? "Order Delivered ✓"
                          : order.status === "CANCELLED"
                            ? "Order Cancelled"
                            : "No further status updates"}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="admin-pagination">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(1, page - 1)
                  )
                }
                disabled={currentPage === 1}
              >
                Previous
              </button>

              <span>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default AdminDashboard;
