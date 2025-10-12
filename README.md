Sagipero Admin (new scaffold)

This is a minimal Vite + React + Tailwind + Headless UI admin UI for Sagipero.
It preserves the same API and socket contracts as the previous admin UI (see `src/services/api.js` and `src/services/socket.js`).

Quick start (Windows PowerShell):

cd admin-web
npm install
npm run dev

Env variables:
- VITE_API_URL - base API URL (default: https://sagipero-backend-production.up.railway.app/api)
- VITE_API_WS - websocket base URL (default derived from VITE_API_URL)

Files of interest:
- `src/services/api.js` - axios client and `setAuthToken`
- `src/services/socket.js` - socket.io client wrapper
- `src/App.jsx` - top-level app and routing state
- `src/components` - UI pages and components (Login, MapView, EmergenciesTable, UsersList, AssignModal, EvacCenters)

Next steps / suggestions:
- Add form validation and stronger error handling
- Add unit tests and E2E tests
- Harden auth flows and token expiry handling (refresh tokens)
