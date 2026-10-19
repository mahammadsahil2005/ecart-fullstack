import { useState } from "react";
import { API_BASE_URL } from "../config";
import "./AdminAddProduct.css";

function AdminAddProduct() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");

  // Image upload states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setImageFile(file);

    // Preview the selected image
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || uploading) return;

    setSaving(true);

    try {
      let uploadedImageUrl = "";

      // Step 1: Upload image, if selected
      if (imageFile) {
        setUploading(true);

        const formData = new FormData();
        formData.append("file", imageFile);
        const adminToken = localStorage.getItem("adminToken");

        const uploadResponse = await fetch(
          `${API_BASE_URL}/api/upload`,
          {
            method: "POST",
            headers: adminToken
              ? { Authorization: `Bearer ${adminToken}` }
              : {},
            body: formData
          }
        );

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            uploadData.error || "Image upload failed."
          );
        }

        uploadedImageUrl = uploadData.imageUrl;
        setUploading(false);
      }

      // Step 2: Save product with the uploaded image URL
      const product = {
        name: name.trim(),
        price: Number(price),
        description: description.trim(),
        quantity: Number(quantity),
        category: category.trim(),
        imageUrl: uploadedImageUrl
      };
      const adminToken = localStorage.getItem("adminToken");

      const response = await fetch(
        `${API_BASE_URL}/api/products`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminToken
              ? { Authorization: `Bearer ${adminToken}` }
              : {}),
          },
          body: JSON.stringify(product)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to add product."
        );
      }

      alert("Product added successfully!");

      setName("");
      setPrice("");
      setDescription("");
      setQuantity("");
      setCategory("");
      setImageFile(null);
      setImagePreview("");

      const fileInput = document.getElementById("product-image");

      if (fileInput) {
        fileInput.value = "";
      }

    } catch (error) {
      console.error("Add product error:", error);
      alert(error.message || "Could not add product.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <main className="add-product-page">
      <div className="add-product-card">
        <h1>Add Product</h1>

        <form
          className="add-product-form"
          onSubmit={handleSubmit}
        >
          <div>
            <label>Product Name</label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter product name"
              required
            />
          </div>

          <div>
            <label>Price (₹)</label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(event) =>
                setPrice(event.target.value)
              }
              placeholder="Enter product price"
              required
            />
          </div>

          <div>
            <label>Description</label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Enter product description"
              required
            />
          </div>

          <div>
            <label>Quantity</label>

            <input
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(event) =>
                setQuantity(event.target.value)
              }
              placeholder="Enter available quantity"
              required
            />
          </div>

          <div>
            <label>Category</label>

            <input
              type="text"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              placeholder="Example: Electronics"
              required
            />
          </div>

          <div>
            <label htmlFor="product-image">
              Product Image
            </label>

            <input
              id="product-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
            />

            <small>
              JPG, PNG, or WebP. Maximum size: 5 MB.
            </small>

            {imagePreview && (
              <div style={{ marginTop: "12px" }}>
                <p>Image Preview</p>

                <img
                  src={imagePreview}
                  alt="Product preview"
                  style={{
                    width: "180px",
                    height: "180px",
                    objectFit: "contain",
                    border: "1px solid #ddd",
                    borderRadius: "8px"
                  }}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="add-product-submit"
            disabled={saving}
          >
            {uploading
              ? "Uploading Image..."
              : saving
              ? "Saving Product..."
              : "Add Product"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default AdminAddProduct;