import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { API_BASE_URL } from "../config";
import ProductCard from "./ProductCard";
import "./Products.css";

function Products({ cart, setCart, user }) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState("default");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. Fetch products from Spring Boot backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        return response.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        setError("Could not load products. Please try again.");
        setLoading(false);
      });
  }, []);

  // 2. Generate categories automatically
  const categories = [
    ...new Set(
      products
        .map((product) => product.category)
        .filter(
          (category) =>
            typeof category === "string" &&
            category.trim() !== ""
        )
    ),
  ];

  // 3. Add product to cart
  function addToCart(product) {
    if (!user) {
      alert("Please login first!");
      return;
    }

    apiFetch("/api/cart", {
      method: "POST",
      body: {
        userId: user.id,
        productId: product.id,
        quantity: 1,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const responseText = await response.text();
          let message = responseText;

          try {
            const errorData = JSON.parse(responseText);
            message = errorData.error || errorData.message || responseText;
          } catch {
            // Keep the plain-text server message.
          }

          throw new Error(message || "Could not reserve product stock.");
        }

        return response.json();
      })
      .then((data) => {
        console.log("Product added to backend cart:", data);
        setProducts((currentProducts) =>
          currentProducts.map((currentProduct) =>
            currentProduct.id === product.id
              ? {
                  ...currentProduct,
                  quantity: Math.max(
                    0,
                    Number(currentProduct.quantity) - 1
                  ),
                }
              : currentProduct
          )
        );

        const existingProduct = cart.find(
          (item) => item.id === product.id
        );

        if (existingProduct) {
          const updatedCart = cart.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                }
              : item
          );

          setCart(updatedCart);
        } else {
          setCart([
            ...cart,
            {
              ...product,
              quantity: 1,
            },
          ]);
        }

        window.dispatchEvent(new Event("cartUpdated"));

        alert("Product added to cart!");
      })
      .catch((error) => {
        console.error("Add to cart error:", error);
        alert(error.message || "Could not add product to cart. Please try again.");
      });
  }

  // 4. Handle search
  function handleSearchSubmit(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  // 5. Search and filter products
  const filteredProducts = products.filter((product) => {
    const searchText = search.trim().toLowerCase();
    const productCategory = String(product.category || "");

    const searchableText = [
      product.name,
      product.category,
      product.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(searchText);

    const matchesCategory =
      category === "All" || productCategory === category;

    return matchesSearch && matchesCategory;
  });

  // 6. Sort filtered products by price
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortOrder === "lowToHigh") {
      return Number(a.price) - Number(b.price);
    }

    if (sortOrder === "highToLow") {
      return Number(b.price) - Number(a.price);
    }

    return 0;
  });

  // 7. Display products
  return (
    <main className="products-page">
      <div className="products-heading">
        <div>
          <span className="products-kicker">THE E-CART EDIT</span>
          <h1>Find something good.</h1>
          <p>Everyday picks, ready to make your day a little better.</p>
        </div>
        {!loading && !error && (
          <span className="products-total-badge">
            {sortedProducts.length} {sortedProducts.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {/* Search Bar */}
      <form className="products-search" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          aria-label="Search products"
          placeholder="Search products..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />

        <button type="submit">Search</button>
      </form>

      {/* Category Filter */}
      <div className="products-filter-row">
        <label>
          <span>Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="All">All Categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Sort by</span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          >
            <option value="default">Recommended</option>
            <option value="lowToHigh">Price: Low to High</option>
            <option value="highToLow">Price: High to Low</option>
          </select>
        </label>
      </div>

      {/* Product Grid */}
      <div className="products-grid">
        {loading ? (
          <p>Loading products...</p>
        ) : error ? (
          <p>{error}</p>
        ) : sortedProducts.length === 0 ? (
          <p>No products found. Try another search.</p>
        ) : (
          sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              addToCart={addToCart}
            />
          ))
        )}
      </div>

      {/* Product Count */}
      {!loading && !error && (
        <p className="products-result-count">
          Showing {sortedProducts.length} of {products.length} products
        </p>
      )}
    </main>
  );
}

export default Products;