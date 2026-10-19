import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import "./Navbar.css";

function Navbar({ user, setUser }) {
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  // Fetch the total quantity of items in the cart
  async function fetchCartCount() {
    const userData = localStorage.getItem("user");
    const loggedInUser = userData
      ? JSON.parse(userData)
      : null;

    if (!loggedInUser) {
      setCartCount(0);
      return;
    }

    try {
      const response = await apiFetch("/api/cart");

      if (!response.ok) {
        throw new Error("Failed to fetch cart.");
      }

      const data = await response.json();

      const totalQuantity = data.reduce(
        (total, item) =>
          total + Number(item.quantity || 0),
        0
      );

      setCartCount(totalQuantity);
    } catch (error) {
      console.error("Navbar cart error:", error);
      setCartCount(0);
    }
  }

  // Refresh cart count when the user or cart changes
  useEffect(() => {
    function refreshCartCount() {
      fetchCartCount();
    }

    refreshCartCount();

    window.addEventListener(
      "cartUpdated",
      refreshCartCount
    );

    return () => {
      window.removeEventListener(
        "cartUpdated",
        refreshCartCount
      );
    };
  }, [user]);

  // Logout
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setCartCount(0);
    setUser(null);

    window.dispatchEvent(new Event("cartUpdated"));

    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <span className="logo-mark" aria-hidden="true">e</span>
        <span>E-Cart</span>
      </Link>

      <div className="nav-links">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/products">Shop</NavLink>
        <NavLink to="/cart" className="nav-cart">
          Cart <span className="cart-count">{cartCount}</span>
        </NavLink>

        {user && (
          <NavLink to="/orders">My Orders</NavLink>
        )}

        {user ? (
          <div className="nav-account">
            <span className="nav-greeting">Hi, {user.name}</span>
            <button
              type="button"
              className="nav-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="nav-account nav-guest">
            <NavLink to="/login">Log in</NavLink>
            <NavLink to="/register" className="nav-register">Create account</NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;