import { API_BASE_URL, buildApiUrl } from "./config";

export { API_BASE_URL };

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
  };

  const hasBody = options.body !== undefined && options.body !== null;

  // Add JSON content type when sending a body,
  // unless the caller has already provided one.
  if (
    hasBody &&
    !Object.keys(headers).some(
      (key) => key.toLowerCase() === "content-type"
    ) &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof URLSearchParams)
  ) {
    headers["Content-Type"] = "application/json";
  }

  // Attach the JWT token when available.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestOptions = {
    ...options,
    headers,
  };

  if (
    hasBody &&
    typeof requestOptions.body !== "string" &&
    !(requestOptions.body instanceof FormData) &&
    !(requestOptions.body instanceof URLSearchParams)
  ) {
    requestOptions.body = JSON.stringify(requestOptions.body);
  }

  const response = await fetch(buildApiUrl(endpoint), requestOptions);

  // Handle expired, missing, or invalid authentication.
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    throw new Error(
      "Your session is invalid or has expired. Please log in again."
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response;
}
