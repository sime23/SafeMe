# GPS Tracking Telemetry Backend

Locally hosted IoT backend for ingesting, validating, and serving real-time GPS telemetry from an ESP32 DevKit and NEO-7M module.

## 🛠️ Stack
- **Runtime**: Node.js & TypeScript
- **Framework**: Express 4.x
- **ORM**: Prisma 6.x
- **Database**: SQLite (100% Local file `prisma/dev.db`, zero cloud or server dependencies)
- **Validation**: Zod
- **Security & Rate Limiting**: Helmet, CORS, Express-Rate-Limit

---

## 🚀 Running the Server

```bash
# Install dependencies
npm install

# Push Prisma schema to PostgreSQL
npm run prisma:push

# Seed default device
npm run prisma:seed

# Start development server
npm run dev

# Or build & start production server
npm run build
npm start
```

The server binds to `0.0.0.0:5000` so that any device on your local Wi-Fi subnet (e.g., ESP32 DevKit) can send telemetry directly using your computer's local IPv4 address (e.g. `http://<YOUR_LOCAL_IP>:5000`).

---

## 🔑 Authentication
Device requests to the telemetry ingest endpoint require an API token.
Supply the token via either:
- Header `x-api-key: <TOKEN>`
- Header `Authorization: <TOKEN>` or `Authorization: Bearer <TOKEN>`

Default seeded device:
- **Device ID**: `ESP-32_Tracker`
- **Default Token**: `cd_sim_181126_WSOLo6` (Configurable in `.env`)

---

## 📡 API Endpoints Specification

### 1. Ingest Telemetry
* **Method**: `POST`
* **Path**: `/api/v1/tracking/telemetry`
* **Headers**:
  * `Content-Type: application/json`
  * `x-api-key: cd_sim_181126_WSOLo6` *(or `Authorization` header)*
* **Request Body**:
```json
{
  "deviceId": "ESP-32_Tracker",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "altitude": 920.5,
  "speed": 15.3,
  "heading": 185.0,
  "satellites": 9,
  "hdop": 1.05,
  "gpsTimestamp": "2026-11-18T15:19:32.021Z"
}
```
* **Validation Rules**:
  * `latitude`: Required number between `-90.0` and `90.0`.
  * `longitude`: Required number between `-180.0` and `180.0`.
  * Coordinates `(0, 0)` are rejected (indicates invalid/missing GNSS 3D fix).
  * `gpsTimestamp`: ISO 8601 string or parseable date.
* **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "Telemetry recorded successfully",
  "data": {
    "id": 1,
    "deviceId": "ESP-32_Tracker",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "altitude": 920.5,
    "speed": 15.3,
    "heading": 185,
    "satellites": 9,
    "hdop": 1.05,
    "gpsTimestamp": "2026-11-18T15:19:32.021Z",
    "receivedAt": "2026-11-18T15:20:02.477Z"
  }
}
```

---

### 2. Get Latest Coordinates
* **Method**: `GET`
* **Path**: `/api/v1/tracking/devices/:deviceId/latest`
* **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "deviceId": "ESP-32_Tracker",
    "latitude": 12.9725,
    "longitude": 77.5955,
    "altitude": 922,
    "speed": 22.1,
    "heading": 190,
    "satellites": 10,
    "hdop": 0.95,
    "gpsTimestamp": "2026-11-18T15:20:05.474Z",
    "receivedAt": "2026-11-18T15:20:06.501Z",
    "ageSeconds": 8
  }
}
```

---

### 3. Get Breadcrumb History (for Leaflet Polyline)
* **Method**: `GET`
* **Path**: `/api/v1/tracking/devices/:deviceId/history?limit=100&order=desc&from=...&to=...`
* **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 100,
    "totalPages": 1
  },
  "data": [
    {
      "id": 2,
      "deviceId": "ESP-32_Tracker",
      "latitude": 12.9725,
      "longitude": 77.5955,
      "altitude": 922,
      "speed": 22.1,
      "heading": 190,
      "satellites": 10,
      "hdop": 0.95,
      "gpsTimestamp": "2026-11-18T15:20:05.474Z",
      "receivedAt": "2026-11-18T15:20:06.501Z"
    }
  ]
}
```

---

### 4. Get Device Connection & Sensor Status
* **Method**: `GET`
* **Path**: `/api/v1/tracking/devices/:deviceId/status`
* **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "deviceId": "ESP-32_Tracker",
    "name": "ESP32 DevKit - NEO-7M Tracker",
    "isActive": true,
    "isOnline": true,
    "lastSeen": "2026-11-18T15:20:06.501Z",
    "totalRecords": 2,
    "latestCoordinates": {
      "latitude": 12.9725,
      "longitude": 77.5955,
      "altitude": 922,
      "speed": 22.1,
      "heading": 190,
      "gpsTimestamp": "2026-11-18T15:20:05.474Z",
      "receivedAt": "2026-11-18T15:20:06.501Z"
    },
    "fixQuality": {
      "satellites": 10,
      "hdop": 0.95,
      "rating": "Ideal"
    }
  }
}
```
