// MandiDarpan Unified API Service
// Connects to MandiMitra backend with resilient port fallback (5000 / 5001)

const PRIMARY_API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
const FALLBACK_API_URL = "https://mandimitra-backend.onrender.com".replace(/\/+$/, "");

let activeBaseUrl = PRIMARY_API_URL;

/**
 * Robust fetch wrapper that handles HTTP errors and port fallback
 */
async function fetchWithFallback(endpoint, options = {}) {
  try {
    const res = await fetch(`${activeBaseUrl}${endpoint}`, options);
    return res;
  } catch (err) {
    // If primary failed and was 5000, try 5001 (macOS AirPlay fallback)
    if (activeBaseUrl !== FALLBACK_API_URL) {
      try {
        const fallbackRes = await fetch(
          `${FALLBACK_API_URL}${endpoint}`,
          options,
        );
        activeBaseUrl = FALLBACK_API_URL; // sticky to working port
        return fallbackRes;
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

/**
 * 1. GET /api/prices/today
 */
export async function getTodayPrices({
  commodity,
  district,
  state,
  limit = 50,
} = {}) {
  const queryParams = new URLSearchParams();
  if (commodity?.trim()) queryParams.append("commodity", commodity.trim());
  if (district?.trim()) queryParams.append("district", district.trim());
  if (state?.trim()) queryParams.append("state", state.trim());
  if (limit) queryParams.append("limit", String(limit));

  try {
    const res = await fetchWithFallback(
      `/api/prices/today?${queryParams.toString()}`,
    );
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        status: data?.error?.code || "error",
        message:
          data?.error?.message ||
          data?.message ||
          `HTTP ${res.status}: Failed to fetch prices`,
        hint: data?.error?.hint,
        records: [],
      };
    }

    return {
      success: true,
      status: data.status || "success",
      count: data.count || 0,
      total: data.total || data.count || 0,
      commodity: data.commodity,
      district: data.district,
      state: data.state,
      message: data.message,
      records: Array.isArray(data.records) ? data.records : [],
    };
  } catch (err) {
    return {
      success: false,
      status: "network_error",
      message:
        "Unable to connect to MandiMitra backend server. Please verify backend is running.",
      details: err.message,
      records: [],
    };
  }
}

/**
 * 2. GET /api/prices/trend
 */
export async function getPriceTrend({
  commodity,
  district,
  state,
  days = 7,
  market,
} = {}) {
  const queryParams = new URLSearchParams();
  if (commodity?.trim()) queryParams.append("commodity", commodity.trim());
  if (district?.trim()) queryParams.append("district", district.trim());
  if (state?.trim()) queryParams.append("state", state.trim());
  if (days) queryParams.append("days", String(days));
  if (market?.trim()) queryParams.append("market", market.trim());

  try {
    const res = await fetchWithFallback(
      `/api/prices/trend?${queryParams.toString()}`,
    );
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        status: data?.error?.code || "error",
        message:
          data?.error?.message ||
          data?.message ||
          "Failed to fetch price trend",
        hint: data?.error?.hint,
      };
    }

    const hasData = Boolean(
      (data.recordsAvailable || data.history?.length || 0) >= 2 &&
      data.change?.latestPrice
    );
    const change = data.change || {};
    const calendarSeries = (data.calendarSeries || []).map((pt) => ({
      date: pt.date,
      modalPrice: pt.modalPrice !== undefined ? pt.modalPrice : pt.price,
      price: pt.price !== undefined ? pt.price : pt.modalPrice,
    }));

    const trend = data.trend || {
      hasData,
      dataPoints: data.recordsAvailable || data.history?.length || 0,
      direction: data.direction || "sthir",
      directionEnglish: data.directionEnglish || "stable",
      startDate: change.startDate || data.observationDates?.[0] || "",
      latestDate:
        change.latestDate ||
        data.observationDates?.[data.observationDates?.length - 1] ||
        "",
      startPrice: change.startPrice || 0,
      latestPrice: change.latestPrice || 0,
      priceChange: change.absolute !== undefined ? change.absolute : 0,
      percentChange: change.percentage !== undefined ? change.percentage : 0,
      explanation: `${data.market || data.district || "मंडी"} में ${data.commodity || "फसल"} का भाव ${change.startDate || ""} को ₹${change.startPrice || 0} से ${
        data.direction === "badha"
          ? "बढ़कर"
          : data.direction === "ghata"
          ? "घटकर"
          : "स्थिर रहकर"
      } ${change.latestDate || ""} को ₹${change.latestPrice || 0} प्रति क्विंटल दर्ज किया गया।`,
      calendarSeries,
    };

    return {
      ...data,
      trend,
    };
  } catch (err) {
    return {
      success: false,
      status: "network_error",
      message:
        "Failed to connect to trend service. Please check your backend connection.",
      details: err.message,
    };
  }
}

/**
 * 3. GET /api/mandis/compare
 */
export async function compareMandis({
  commodity,
  district,
  state,
  userLat,
  userLon,
  sortBy,
} = {}) {
  const queryParams = new URLSearchParams();
  if (commodity?.trim()) queryParams.append("commodity", commodity.trim());
  if (district?.trim()) queryParams.append("district", district.trim());
  if (state?.trim()) queryParams.append("state", state.trim());
  if (sortBy?.trim()) queryParams.append("sortBy", sortBy.trim());
  if (userLat !== undefined && userLat !== null) {
    queryParams.append("lat", String(userLat));
  }

  if (userLon !== undefined && userLon !== null) {
    queryParams.append("lng", String(userLon));
  }

  try {
    const res = await fetchWithFallback(
      `/api/mandis/compare?${queryParams.toString()}`,
    );
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        status: data?.error?.code || "error",
        message:
          data?.error?.message || data?.message || "Failed to compare mandis",
        hint: data?.error?.hint,
      };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      status: "network_error",
      message: "Failed to connect to mandi comparison service.",
      details: err.message,
    };
  }
}

/**
 * 4. POST /api/query (Gemma 4 AI Assistant)
 */
export async function queryGemma({ question }) {
  try {
    const res = await fetchWithFallback("/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ question: question.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        status: data?.error?.code || "error",
        message:
          data?.error?.message ||
          data?.message ||
          "AI assistant request failed",
        hint: data?.error?.hint,
        answer: data?.error?.message || "AI सेवा से उत्तर प्राप्त नहीं हो सका।",
      };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      status: "network_error",
      message: "Unable to communicate with MandiMitra AI assistant.",
      answer: "सर्वर से संपर्क नहीं हो पा रहा है। कृपया बैकएंड कनेक्शन जांचें।",
      details: err.message,
    };
  }
}

/**
 * Health check
 */
export async function checkBackendHealth() {
  try {
    const res = await fetchWithFallback("/api/health");
    if (res.ok) {
      const data = await res.json();
      return { isOnline: true, data };
    }
    return { isOnline: false };
  } catch {
    return { isOnline: false };
  }
}

// =========================================================================
// WhatsApp Price Alert System API Methods
// =========================================================================

/**
 * GET /api/alerts/status
 * Fetches WhatsApp configuration and scheduler status
 */
export async function getWhatsAppStatus() {
  try {
    const res = await fetchWithFallback("/api/alerts/status");
    if (!res.ok) {
      return { success: false, error: "Failed to fetch WhatsApp status" };
    }
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * GET /api/alerts
 * Lists all registered price alerts (with masked phone numbers)
 */
export async function getAlerts() {
  try {
    const res = await fetchWithFallback("/api/alerts");
    const data = await res.json();
    if (!res.ok) {
      return { success: false, alerts: [], error: data?.error?.message || "Failed to fetch alerts" };
    }
    return data;
  } catch (err) {
    return { success: false, alerts: [], error: err.message };
  }
}

/**
 * POST /api/alerts
 * Creates a new price alert with phone number and explicit consent
 */
export async function createAlert(alertData) {
  try {
    const res = await fetchWithFallback("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertData),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data?.error?.message || data?.message || "Failed to create alert",
        code: data?.error?.code
      };
    }
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * DELETE /api/alerts/:id
 * Removes an existing price alert
 */
export async function deleteAlert(id) {
  try {
    const res = await fetchWithFallback(`/api/alerts/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error?.message || "Failed to delete alert" };
    }
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * POST /api/alerts/:id/check
 * Manually trigger evaluation for a specific alert
 */
export async function checkAlert(id) {
  try {
    const res = await fetchWithFallback(`/api/alerts/${id}/check`, {
      method: "POST",
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * POST /api/alerts/check-all
 * Triggers evaluation cycle across all registered alerts
 */
export async function checkAllAlerts() {
  try {
    const res = await fetchWithFallback("/api/alerts/check-all", {
      method: "POST",
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * POST /api/alerts/test-send
 * Explicit action: sends test alert ONLY to verified test recipient
 */
export async function sendTestAlert() {
  try {
    const res = await fetchWithFallback("/api/alerts/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * GET /api/alerts/history
 * Fetches recent notification delivery logs
 */
export async function getAlertHistory(limit = 20) {
  try {
    const res = await fetchWithFallback(`/api/alerts/history?limit=${limit}`);
    const data = await res.json();
    if (!res.ok) {
      return { success: false, history: [], error: data?.error?.message || "Failed to fetch history" };
    }
    return data;
  } catch (err) {
    return { success: false, history: [], error: err.message };
  }
}
