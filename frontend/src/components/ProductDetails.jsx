import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api";
import { buildImageUrl } from "../config";
import "./ProductDetails.css";

function ProductDetails() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // Fetch product details
  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");
        setProduct(null);
        setImageError(false);
        setQuantity(1);

        const response = await apiFetch(`/api/products/${id}`);

        if (!response.ok) {
          throw new Error("Product not found");
        }

        const data = await response.json();

        if (!data || !data.id) {
          throw new Error("Product not found");
        }

        if (!cancelled) {
          setProduct(data);
        }
      } catch (error) {
        console.error("Product Details Error:", error);

        if (!cancelled) {
          setError("Could not load product. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <main className="product-details-message">
        <h1>Loading product...</h1>
        <p>Please wait while we load the product details.</p>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="product-details-message">
        <h1>{error}</h1>

        <Link to="/products" className="back-products">
          Back to Products
        </Link>
      </main>
    );
  }

  // Product not found
  if (!product) {
    return (
      <main className="product-details-message">
        <h1>Product not found</h1>

        <Link to="/products" className="back-products">
          Back to Products
        </Link>
      </main>
    );
  }

  const stock = Math.max(0, Number(product.quantity) || 0);
  const inStock = stock > 0;
  const imageUrl = buildImageUrl(product.imageUrl);

  // Add product to cart
  async function addToCart() {
    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (!user) {
      alert("Please login first!");
      return;
    }

    if (!inStock) {
      alert("This product is out of stock.");
      return;
    }

    if (quantity > stock) {
      alert(`Only ${stock} item(s) are available.`);
      return;
    }

    try {
      setAddingToCart(true);

      const response = await apiFetch("/api/cart", {
        method: "POST",
        body: {
          userId: user.id,
          productId: product.id,
          quantity: quantity,
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        let message = responseText;

        try {
          const errorData = JSON.parse(responseText);
          message = errorData.error || errorData.message || responseText;
        } catch {
          // Keep the plain-text server message.
        }

        throw new Error(message || "Failed to reserve product stock.");
      }

      const data = await response.json();

      console.log("Product added to cart:", data);
      setProduct((currentProduct) => ({
        ...currentProduct,
        quantity: Math.max(
          0,
          Number(currentProduct.quantity) - quantity
        ),
      }));

      window.dispatchEvent(new Event("cartUpdated"));

      alert("Product added to cart!");
    } catch (error) {
      console.error("Cart error:", error);

      alert(
        error.message || "Could not add product to cart. Please try again."
      );
    } finally {
      setAddingToCart(false);
    }
  }

  return (
    <main className="product-details-page">
      {/* Breadcrumb */}
      <nav className="product-breadcrumb">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/products">Products</Link>
        <span> / </span>
        <span>{product.name}</span>
      </nav>

      {/* Product Details */}
      <section className="product-details">
        {/* Product Image */}
        <div className="product-details-image">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={product.name}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="product-details-placeholder">
              🛍️
              <span>Image unavailable</span>
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="product-details-info">
          {product.category && (
            <p className="product-details-category">
              {product.category}
            </p>
          )}

          <h1>{product.name}</h1>

          <p className="product-details-price">
            ₹{Number(product.price || 0).toLocaleString("en-IN")}
          </p>

          <p
            className={`product-details-stock ${
              inStock ? "available" : "unavailable"
            }`}
          >
            {inStock ? "✓ In Stock" : "✕ Out of Stock"}
          </p>

          <div className="product-details-description">
            <h2>Product Description</h2>

            <p>
              {product.description ||
                "No description is available for this product."}
            </p>
          </div>

          {inStock && (
            <>
              <p className="product-details-available">
                {stock} item(s) available
              </p>

              {/* Quantity Selector */}
              <div className="quantity-control">
                <span className="quantity-label">Quantity:</span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.max(1, current - 1)
                    )
                  }
                  disabled={quantity <= 1 || addingToCart}
                  aria-label="Decrease quantity"
                >
                  −
                </button>

                <span className="quantity-number">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.min(stock, current + 1)
                    )
                  }
                  disabled={quantity >= stock || addingToCart}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <p className="product-details-total">
                Total: ₹
                {(
                  Number(product.price || 0) * quantity
                ).toLocaleString("en-IN")}
              </p>
            </>
          )}

          {/* Add to Cart */}
          <button
            type="button"
            className="add-cart-btn"
            onClick={addToCart}
            disabled={!inStock || addingToCart}
          >
            {!inStock
              ? "Out of Stock"
              : addingToCart
                ? "Adding to Cart..."
                : "Add to Cart"}
          </button>

          {/* Back to Products */}
          <Link
            className="back-products"
            to="/products"
          >
            ← Back to Products
          </Link>
        </div>
      </section>
    </main>
  );
}

export default ProductDetails;