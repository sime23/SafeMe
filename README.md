# SafeMe

Real-time IoT GPS Tracking System & Enterprise Fleet Monitoring Dashboard.

## Architecture

- **Backend**: Express REST API + WebSocket (Socket.IO) + Prisma ORM + Neon Serverless PostgreSQL
- **Frontend**: React 19 + TypeScript + Leaflet / React Leaflet + OpenStreetMap
- **IoT Node**: ESP32 DevKit v1 + u-blox NEO-7M GNSS

## Features

- **Zero-Latency Real-Time Tracking**: Instant marker and route updates pushed directly over WebSockets via Socket.IO.
- **Enterprise Cockpit Dashboard**: Linear / Stripe-inspired visual design with strict tabular numeral alignment and semantic status indicators.
- **Neon Serverless PostgreSQL Integration**: High-availability cloud database storage.
- **Deploy Ready**:
  - Backend: Ready for Render / Railway / Fly.io (`render.yaml`, `Dockerfile`, `Procfile`).
  - Frontend: Ready for Vercel / Netlify (`vercel.json`, `_redirects`).

## Project Structure

```
├── backend/          # Node.js + Express + Prisma + Socket.IO API
│   ├── prisma/       # PostgreSQL schema & migrations
│   ├── src/          # API controllers, middleware, routes, sockets
│   ├── Dockerfile    # Container specification
│   ├── Procfile      # Process declaration
│   └── render.yaml   # Render deployment blueprint
├── frontend/         # React + TypeScript + Leaflet Dashboard
│   ├── src/          # Components, hooks, types, styles
│   ├── public/       # Static assets & SPA redirect rules
│   └── vercel.json   # Vercel deployment configuration
└── README.md
```
