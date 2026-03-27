# P2-Stargazer-0326-final[README.md](https://github.com/user-attachments/files/26291159/README.md)
# StarGazer — Live Sky Observer

A real-time celestial observation dashboard built with React, Vite, and Express. Shows live sky conditions, planetary positions, notable targets, and upcoming astronomical events — all computed from scratch using orbital mechanics, no planetarium API required.

---

## Features

- **Sky Conditions** — cloud cover, AQI, moon phase & illumination, Bortle scale, sidereal time, 24-hour cloud and temperature forecasts
- **Planetary Ephemeris** — real-time altitude and azimuth for all planets, dual-axis bar chart, rise/set/transit times
- **Notable Targets** — filterable catalog of stars, deep-sky objects, and planets; shows which are currently above the horizon
- **Astronomical Events** — upcoming meteor showers, eclipses, solstices, and conjunctions
- **Rotating NASA Backgrounds** — cycles through 12 deep-space images from NASA's public image library
- **Location-aware** — all calculations adjust to the observer's latitude and longitude

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| Charts | Recharts |
| Backend | Express 5, TypeScript, tsx |
| Validation | Zod |
| Data fetching | TanStack Query |
| Package manager | pnpm (monorepo) |

---

## Project Structure

```
/
├── artifacts/
│   ├── stargazer/          # React + Vite frontend
│   │   └── src/
│   │       ├── pages/      # Dashboard page
│   │       └── components/
│   │           └── dashboard/
│   │               ├── SkyConditionsPanel.tsx
│   │               ├── SolarSystemPanel.tsx
│   │               ├── VisibleObjectsPanel.tsx
│   │               └── AstronomicalEventsPanel.tsx
│   └── api-server/         # Express backend
│       └── src/
│           └── routes/
│               ├── sky.ts      # Astronomy calculations
│               └── weather.ts  # Open-Meteo integration
└── lib/
    ├── api-zod/            # Shared Zod schemas
    └── api-client-react/   # Auto-generated API client
```

---

## External APIs

All astronomy is computed server-side in pure math — no planetarium API needed.

| API | What it provides | Key required |
|---|---|---|
| [Open-Meteo Forecast](https://open-meteo.com) | Temperature, wind, cloud cover, dew point | No |
| [Open-Meteo Air Quality](https://open-meteo.com) | AQI, atmospheric visibility | No |
| [NASA Image Library](https://images.nasa.gov) | Background space photography | No |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Install

```bash
pnpm install
```

### Run

Start the API server (terminal 1):

```bash
pnpm --filter @workspace/api-server run dev
```

Start the frontend (terminal 2):

```bash
pnpm --filter @workspace/stargazer run dev
```

The frontend dev server will print its local URL. The API runs on port 8080 by default.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes (auto-set) | Port for each service |
| `BASE_PATH` | Yes (auto-set) | URL base path for the frontend |

Both are set automatically when running on Replit. If running locally, set `PORT=21492` for the frontend and leave `BASE_PATH=/`.

---

## How It Works

The backend computes all celestial positions using Keplerian orbital elements and standard spherical astronomy transforms:

- **Planet positions** — heliocentric → geocentric → equatorial → horizontal coordinates
- **Star rise/set/transit** — hour angle method per observer location
- **Moon phase** — Julian date synodic cycle
- **Sky quality** — Bortle scale derived from moon illumination and sun altitude
- **Sidereal time** — Greenwich Mean Sidereal Time adjusted for observer longitude

Data refreshes every 60 seconds on the client via TanStack Query.

---

## License

MIT
