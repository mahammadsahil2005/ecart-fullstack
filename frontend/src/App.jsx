import { useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Products from "./components/Products";
import ProductDetails from "./components/ProductDetails";
import Cart from "./components/Cart";
import Login from "./components/Login";
import Register from "./components/Register";
import Checkout from "./components/Checkout";
import Orders from "./components/Orders";
import OrderDetails from "./components/OrderDetails";
import ProtectedRoute from "./components/ProtectedRoute";

import AdminLogin from "./components/AdminLogin";
import AdminRegister from "./components/AdminRegister";
import AdminDashboard from "./components/AdminDashboard";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminAddProduct from "./components/AdminAddProduct";
import AdminEditProduct from "./components/AdminEditProduct";

// Read the saved user safely
function getSavedUser() {
  try {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      return null;
    }

    const parsedUser = JSON.parse(savedUser);

    // Require both a user ID and a saved JWT token
    if (
      !parsedUser ||
      parsedUser.id == null ||
      !localStorage.getItem("token")
    ) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return null;
    }

    return parsedUser;
  } catch (error) {
    console.error("Could not read saved user:", error);

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    return null;
  }
}

function App() {
  const [cart, setCart] = useState([]);

  const [user, setUser] = useState(getSavedUser);

  return (
    <BrowserRouter>
      <Navbar
        user={user}
        setUser={setUser}
      />

      <Routes>
        {/* Home */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* Products */}
        <Route
          path="/products"
          element={
            <Products
              cart={cart}
              setCart={setCart}
              user={user}
            />
          }
        />

        {/* Product Details */}
        <Route
          path="/products/:id"
          element={<ProductDetails />}
        />

        {/* Cart */}
        <Route
          path="/cart"
          element={
            <ProtectedRoute user={user}>
              <Cart />
            </ProtectedRoute>
          }
        />

        {/* Checkout */}
        <Route
          path="/checkout"
          element={
            <ProtectedRoute user={user}>
              <Checkout />
            </ProtectedRoute>
          }
        />

        {/* Orders */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute user={user}>
              <Orders />
            </ProtectedRoute>
          }
        />

        {/* Order Details */}
        <Route
          path="/orders/:orderId"
          element={
            <ProtectedRoute user={user}>
              <OrderDetails />
            </ProtectedRoute>
          }
        />

        {/* User Login */}
        <Route
          path="/login"
          element={
            <Login setUser={setUser} />
          }
        />

        {/* User Register */}
        <Route
          path="/register"
          element={<Register />}
        />

        {/* Admin Login */}
        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin-register"
          element={<AdminRegister />}
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />

        {/* Admin Add Product */}
        <Route
          path="/admin/add-product"
          element={
            <AdminProtectedRoute>
              <AdminAddProduct />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/edit-product/:id"
          element={
            <AdminProtectedRoute>
              <AdminEditProduct />
            </AdminProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;