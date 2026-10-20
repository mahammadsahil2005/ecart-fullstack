
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8081"
).replace(/\/+$/, "");

export function buildApiUrl(path = "") {
  const normalizedPath = String(path || "").startsWith("/")
    ? String(path || "")
    : `/${String(path || "")}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

export function buildImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") {
    return "";
  }

  const normalizedUrl = imageUrl.trim();

  if (!normalizedUrl) {
    return "";
  }

  // Return absolute image URLs unchanged.
  if (/^https?:\/\//i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  // Build the image URL using the API base URL.
  return buildApiUrl(normalizedUrl.replace(/^\/+/, ""));
}
