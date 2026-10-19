import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildImageUrl } from "../config";

function ProductCard({ product, addToCart }) {
  const navigate = useNavigate();

  const [imageError, setImageError] = useState(false);

  // Open product details page
  function openProduct() {
    navigate(`/products/${product.id}`);
  }

  // Check product stock
  const stock = Number(product.quantity) || 0;
  const inStock = stock > 0;

  const imageUrl = buildImageUrl(product.imageUrl);

  return (
    <div className="product-card">

      {/* Product Image */}
      <div
        className="product-image"
        onClick={openProduct}
        role="button"
        tabIndex={0}
        aria-label={`View ${product.name} details`}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProduct();
          }
        }}
        style={{ cursor: "pointer" }}
      >
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={product.name || "Product"}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <span
            className="product-image-placeholder"
            aria-label="Product image unavailable"
          >
            🛍️
          </span>
        )}
      </div>

      {/* Product Name */}
      <h2
        onClick={openProduct}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            openProduct();
          }
        }}
        role="button"
        tabIndex={0}
        style={{ cursor: "pointer" }}
      >
        {product.name}
      </h2>

      {/* Product Description */}
      {product.description && (
        <p className="product-description">
          {product.description}
        </p>
      )}

      {/* Product Price */}
      <p className="product-price">
        ₹{Number(product.price || 0).toLocaleString("en-IN")}
      </p>

      {/* Stock Availability */}
      <p
        className={`product-stock ${
          inStock ? "in-stock" : "out-of-stock"
        }`}
      >
        {inStock ? "In Stock" : "Out of Stock"}
      </p>

      {/* Available Quantity */}
      {inStock && (
        <p className="product-quantity">
          Available: {stock}
        </p>
      )}

      {/* View Details */}
      <button
        type="button"
        className="view-details-btn"
        onClick={openProduct}
      >
        View Details
      </button>

      {/* Add to Cart */}
      <button
        type="button"
        className="add-to-cart-btn"
        onClick={() => addToCart(product)}
        disabled={!inStock}
      >
        {inStock ? "Add to Cart" : "Out of Stock"}
      </button>

    </div>
  );
}

export default ProductCard;