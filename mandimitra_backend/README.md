# MandiMitra Backend

MandiMitra Backend is an Express.js API designed to empower Indian farmers and traders with real-time agricultural mandi prices, historical price trends, nearby mandi comparisons, and an AI advisory assistant powered by Gemma 4.

---

## 1. Installation & Startup

### Prerequisites
- **Node.js** (v18 or higher recommended; verified on Node.js v24)
- **npm** (comes bundled with Node.js)

### Setup Instructions

```bash
# 1. Navigate to backend directory
cd mandimitra-backend

# 2. Install dependencies
npm install

# 3. Create your local environment configuration
cp .env.example .env
```

### Running the Server

- **Development Mode** (auto-reloads on file changes using Nodemon):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```
- **Automated Regression Test Suite**:
  ```bash
  npm test
  ```

> **macOS AirPlay Notice**: macOS uses port 5000 for AirPlay Receiver by default. The server automatically falls back to port 5001 if port 5000 is occupied. You can also specify `PORT=5001` in your `.env`.

---

## 2. Environment Configuration (`.env`)

Template placeholders in `.env.example`:

```env
PORT=5001
DATA_GOV_API_KEY=PASTE_YOUR_DATA_GOV_API_KEY_HERE
GEMMA_API_KEY=PASTE_YOUR_GEMMA_PROVIDER_API_KEY_HERE
GEMMA_API_BASE_URL=PASTE_VERIFIED_PROVIDER_ENDPOINT_HERE
GEMMA_MODEL_ID=PASTE_VERIFIED_GEMMA_4_MODEL_ID_HERE
```

### Rules & Secrets Handling
- `.env` is listed in `.gitignore` and must **never** be committed to version control.
- Credentials and API keys are never exposed in logs or API error responses.
- The server and health check route run normally even without setting external API keys.

---

## 3. Data Source (data.gov.in)

- **Resource Title**: Current Daily Price of Various Commodities from Various Markets (Mandi)
- **Resource ID**: `9ef84268-d588-465a-a308-a864a43d0070`
- **Base Endpoint**: `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`
- **Data Attributes**: State, District, Market, Commodity, Variety, Arrival_Date, Min_Price, Max_Price, Modal_Price.

---

## 4. API Endpoints & Usage

### A. Health Check
- **Route**: `GET /api/health`
- **Description**: Verifies that the server is alive and functioning. Operates independently of third-party keys.
- **Example Request**:
  ```bash
  curl http://localhost:5001/api/health
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "message": "MandiMitra backend is operational",
    "timestamp": "2026-10-21T06:17:48.639Z"
  }
  ```

---

### B. Today's Mandi Prices
- **Route**: `GET /api/prices/today`
- **Query Parameters**:
  - `commodity` *(optional)*: Commodity name (e.g., `Wheat`, `Onion`, `Tomato`)
  - `district` *(optional)*: District name (e.g., `Lucknow`)
  - `state` *(optional)*: State name (e.g., `Uttar Pradesh`)
  - `limit` *(optional, default 50)*: Number of records to retrieve
- **Example Request**:
  ```bash
  curl "http://localhost:5001/api/prices/today?commodity=Wheat&district=Lucknow"
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 2,
    "commodity": "Wheat",
    "district": "Lucknow",
    "records": [
      {
        "state": "Uttar Pradesh",
        "district": "Lucknow",
        "market": "Lucknow Mandi",
        "commodity": "Wheat",
        "variety": "Dara",
        "arrivalDate": "2026-10-21",
        "minPrice": 2250,
        "maxPrice": 2350,
        "modalPrice": 2300,
        "latitude": 26.8467,
        "longitude": 80.9462
      }
    ]
  }
  ```
- **Unconfigured API Key Response (503 Service Unavailable)**:
  ```json
  {
    "success": false,
    "error": {
      "code": "DATA_GOV_UNCONFIGURED",
      "message": "DATA_GOV_API_KEY is not configured or contains placeholder in .env.",
      "hint": "Please set DATA_GOV_API_KEY in your .env file to enable live data.gov.in queries."
    }
  }
  ```

---

### C. Price Trend Analysis
- **Route**: `GET /api/prices/trend`
- **Query Parameters**:
  - `commodity` *(required)*: e.g., `Wheat`
  - `district` *(optional)*: e.g., `Lucknow`
  - `days` *(optional, default 7)*: Number of days
- **Example Request**:
  ```bash
  curl "http://localhost:5001/api/prices/trend?commodity=Wheat&district=Lucknow&days=7"
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "commodity": "Wheat",
    "district": "Lucknow",
    "trend": {
      "hasData": true,
      "insufficientHistory": false,
      "dataPoints": 3,
      "startDate": "2026-10-15",
      "latestDate": "2026-10-21",
      "startPrice": 2100,
      "latestPrice": 2300,
      "priceChange": 200,
      "percentChange": 9.52,
      "direction": "badha",
      "directionEnglish": "rising",
      "minPrice": 2100,
      "maxPrice": 2300,
      "avgPrice": 2200
    }
  }
  ```
- **Insufficient History Response (200 OK with notice)**:
  ```json
  {
    "success": true,
    "commodity": "Wheat",
    "district": "Lucknow",
    "trend": {
      "hasData": true,
      "insufficientHistory": true,
      "dataPoints": 1,
      "currentPrice": 2300,
      "latestDate": "2026-10-21",
      "message": "Insufficient historical data (at least 2 observations required to establish a trend)."
    }
  }
  ```

---

### D. Mandi Price Comparison & Distance
- **Route**: `GET /api/mandis/compare`
- **Query Parameters**:
  - `commodity` *(required)*: e.g., `Wheat`
  - `district` *(optional)*: e.g., `Lucknow`
  - `lat` *(optional)*: Farmer's latitude (e.g., `26.8467`)
  - `lng` *(optional)*: Farmer's longitude (e.g., `80.9462`)
- **Example Request**:
  ```bash
  curl "http://localhost:5001/api/mandis/compare?commodity=Wheat&lat=26.8467&lng=80.9462"
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "commodity": "Wheat",
    "userCoordinatesProvided": true,
    "totalMandis": 2,
    "bestMandi": {
      "market": "Lucknow Mandi",
      "district": "Lucknow",
      "modalPrice": 2350
    },
    "priceSpread": {
      "maxPrice": 2350,
      "minPrice": 2200,
      "difference": 150
    },
    "mandis": [
      {
        "market": "Lucknow Mandi",
        "district": "Lucknow",
        "modalPrice": 2350,
        "distanceKm": 4.25,
        "distanceAvailable": true
      },
      {
        "market": "Barabanki Mandi",
        "district": "Barabanki",
        "modalPrice": 2200,
        "distanceKm": 28.6,
        "distanceAvailable": true
      }
    ]
  }
  ```

---

### E. AI Query Endpoint (Gemma 4)
- **Route**: `POST /api/query`
- **Request Headers**: `Content-Type: application/json`
- **Example Request**:
  ```bash
  curl -X POST http://localhost:5001/api/query \
    -H "Content-Type: application/json" \
    -d '{"question": "Lucknow mein gehun ka bhav badha ya ghata?"}'
  ```

#### Strict Grounding Pipeline
```text
Question 
   ↓
Gemma 4 Intent Extraction (Crop translation, Operation detection)
   ↓
Validate Intent (Treat AI output as untrusted input)
   ↓
Check Required Fields (Ask clarification if crop is missing)
   ↓
Fetch Real Mandi Records (from data.gov.in service)
   ↓
Deterministic JavaScript Math (Never let model compute numbers)
   ↓
Gemma 4 Natural Language Explanation (Grounded strictly in verified numbers)
   ↓
Structured Response
```

- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "question": "Lucknow mein gehun ka bhav badha ya ghata?",
    "intent": {
      "operation": "price_trend",
      "commodity": "Wheat",
      "district": "Lucknow",
      "days": 7
    },
    "groundedData": {
      "trend": {
        "priceChange": 200,
        "percentChange": 9.52,
        "direction": "badha",
        "latestPrice": 2300,
        "startPrice": 2100
      }
    },
    "answer": "Lucknow mandi mein pichhle 7 dinon mein gehun ka bhav badha hai. 15 October ko bhav ₹2,100 tha jo ab badhkar ₹2,300 prati quintal ho gaya hai (lagbhag ₹200 ya 9.5% ki badhotri)."
  }
  ```
- **Unconfigured Gemma Provider Response (503 Service Unavailable)**:
  ```json
  {
    "success": false,
    "error": {
      "code": "GEMMA_PROVIDER_UNCONFIGURED",
      "message": "Gemma 4 provider is not configured. Missing in .env: GEMMA_API_KEY, GEMMA_API_BASE_URL, GEMMA_MODEL_ID",
      "missing": ["GEMMA_API_KEY", "GEMMA_API_BASE_URL", "GEMMA_MODEL_ID"],
      "hint": "Please configure GEMMA_API_KEY, GEMMA_API_BASE_URL, and GEMMA_MODEL_ID in .env. Non-AI endpoints remain fully functional."
    }
  }
  ```

---

## 5. How to Configure a Compatible Gemma 4 Provider

The backend uses standard OpenAI-compatible `/chat/completions` protocol supported by major inference providers hosting Gemma 4 (e.g. Groq, Together AI, HuggingFace Inference Endpoints, OpenRouter, Google Vertex AI / AI Studio).

### Setup in `.env`:
1. Obtain an API key from your verified inference provider.
2. Provide the base URL and the exact verified model ID:
   ```env
   GEMMA_API_KEY=your_actual_provider_api_key
   GEMMA_API_BASE_URL=https://api.yourprovider.com/v1
   GEMMA_MODEL_ID=google/gemma-4-it
   ```

---

## 6. Known Limitations

### A. Haversine Distance Limitations
- Haversine computes great-circle **straight-line distance** ("as the crow flies") using Earth's spherical approximation ($R = 6,371 \text{ km}$).
- It **does not** account for actual road networks, ghats, bridges, road quality, or traffic congestion. Actual driving distance will be longer.
- Mandi coordinates may be unavailable for rural sub-yards, in which case `distanceKm: null` and `distanceAvailable: false` are safely returned.

### B. Historical Data Limitations
- Government Agmarknet records rely on daily reporting by Agricultural Produce Market Committees (APMCs).
- When a mandi does not hold auctions on Sundays, holidays, or bandhs, daily observations may have gaps.
- At least two chronological price records are strictly required to compute a price trend. If only one observation exists, the system flags `insufficientHistory: true` and refuses to invent or extrapolate fake numbers.

---

## 7. Verification Status & Test Report

| Feature / Scenario | Status | Verification Method |
|---|---|---|
| `GET /api/health` | **VERIFIED** | Live server test (HTTP 200) |
| Missing/Placeholder `DATA_GOV_API_KEY` | **VERIFIED** | Automated test (HTTP 503 structured error) |
| Live data.gov.in Government Network Call | **VERIFIED** | Verified with live Agmarknet queries (Paddy in Lucknow, Wheat in Kanpur) |
| Missing query parameters (`commodity`) | **VERIFIED** | Automated test (HTTP 400 validation error) |
| Invalid parameters (negative days) | **VERIFIED** | Automated test (HTTP 400 validation error) |
| Invalid geographic coordinates | **VERIFIED** | Automated test (HTTP 400 invalid coordinates) |
| Missing/Placeholder Gemma 4 Credentials | **VERIFIED** | Automated test (HTTP 503 explaining missing keys) |
| Pure JavaScript Mathematical Calculations | **VERIFIED** | Deterministic unit tests for price changes, %, min, max, avg |
| Insufficient History Handling (<2 records) | **VERIFIED** | Unit test verifying `insufficient_data` status |
| Calendar Gaps as Null (No Interpolation) | **VERIFIED** | Unit test verifying missing dates are represented as null |
| Haversine Distance Formula | **VERIFIED** | Tested with known geographic coordinates (Lucknow -> Kanpur) |
| Like-for-Like Mandi Comparison | **VERIFIED** | Unit test verifying different varieties & grades are never mixed |
| Automatic Basis Deterministic Tie-Breaking | **VERIFIED** | Unit test verifying FAQ prioritization and alphabetical ordering |
| Intent Extraction & Hindi Crop Translation | **VERIFIED** | Unit test mapping *gehun* -> Wheat, *pyaz* -> Onion |
| Follow-up Clarification for Missing Crop | **VERIFIED** | Unit test verifying polite follow-up prompt |
| Untrusted Model Intent Sanitization | **VERIFIED** | Unit test rejecting disallowed operations and out-of-range days |
| 404 Catch-All & Centralized Error Handler | **VERIFIED** | Automated test verifying structured JSON response |
| Live Gemma 4 Cloud Inference Provider | **UNVERIFIED** *(Expected)* | Requires developer's personal `GEMMA_API_KEY` in `.env` |
