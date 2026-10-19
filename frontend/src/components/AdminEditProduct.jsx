import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL, buildImageUrl } from "../config";

function AdminEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing product details
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Product not found");
        }

        return response.json();
      })
      .then((product) => {
        setName(product.name ?? "");
        setPrice(String(product.price ?? ""));
        setDescription(product.description ?? "");
        setQuantity(String(product.quantity ?? ""));
        setCategory(product.category ?? "");
        setImageUrl(product.imageUrl ?? "");
      })
      .catch((error) => {
        console.error("Fetch product error:", error);
        alert("Could not load product details.");
        navigate("/admin");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, navigate]);

  // Save updated product
  function handleSubmit(event) {
    event.preventDefault();

    const updatedProduct = {
      name: name.trim(),
      price: Number(price),
      description: description.trim(),
      quantity: Number(quantity),
      category: category.trim(),
      imageUrl: imageUrl.trim(),
    };

    setSaving(true);
    const adminToken = localStorage.getItem("adminToken");

    if (!adminToken) {
      setSaving(false);
      navigate("/admin-login", {
        replace: true,
        state: { message: "Please sign in as an admin to update products." },
      });
      return;
    }

    fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(adminToken
          ? { Authorization: `Bearer ${adminToken}` }
          : {}),
      },
      body: JSON.stringify(updatedProduct),
    })
      .then(async (response) => {
        if (!response.ok) {
          const responseText = await response.text();
          let message = responseText;

          try {
            const errorData = JSON.parse(responseText);
            message = errorData.message || errorData.error || responseText;
          } catch {
            // Keep the plain-text server response.
          }

          const error = new Error(
            message || `Product update failed (HTTP ${response.status}).`
          );
          error.status = response.status;
          throw error;
        }

        return response.json();
      })
      .then(() => {
        alert("Product updated successfully!");
        navigate("/admin");
      })
      .catch((error) => {
        console.error("Update product error:", error);

        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem("admin");
          localStorage.removeItem("adminToken");
          navigate("/admin-login", {
            replace: true,
            state: {
              message: "Your admin session expired. Please sign in again.",
            },
          });
          return;
        }

        alert(error.message || "Could not update product. Please try again.");
      })
      .finally(() => {
        setSaving(false);
      });
  }

  if (loading) {
    return <p>Loading product details...</p>;
  }

  return (
    <main className="add-product-page">
      <div className="add-product-card">
        <h1>Edit Product</h1>

        <form onSubmit={handleSubmit}>
          <label>Product Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label>Price (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />

          <label>Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />

          <label>Quantity</label>
          <input
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />

          <label>Category</label>
          <input
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            required
          />

          <label>Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://example.com/image.jpg"
          />

          {imageUrl && (
            <div>
              <p>Image Preview</p>
              <img
                src={buildImageUrl(imageUrl)}
                alt="Product preview"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
                style={{
                  width: "150px",
                  height: "150px",
                  objectFit: "contain",
                }}
              />
            </div>
          )}

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Update Product"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin")}
          >
            Cancel
          </button>
        </form>
      </div>
    </main>
  );
}

export default AdminEditProduct;