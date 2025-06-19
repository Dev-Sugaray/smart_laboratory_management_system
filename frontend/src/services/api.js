// A simple API service wrapper

const BASE_URL = '/api'; // Adjust if your API is hosted elsewhere

async function request(url, options = {}) {
  const token = localStorage.getItem('token'); // Or however you store your JWT

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${url}`, config);
    if (!response.ok) {
      // Attempt to parse error response from backend
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // Could not parse JSON, stick with HTTP status
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    // For 204 No Content, response.json() will fail.
    if (response.status === 204) {
        return null;
    }
    return response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error; // Re-throw to be caught by Vuex actions or components
  }
}

export default {
  get(url, options) {
    return request(url, { ...options, method: 'GET' });
  },
  post(url, data, options) {
    return request(url, { ...options, method: 'POST', body: JSON.stringify(data) });
  },
  put(url, data, options) {
    return request(url, { ...options, method: 'PUT', body: JSON.stringify(data) });
  },
  delete(url, options) {
    return request(url, { ...options, method: 'DELETE' });
  },
};
