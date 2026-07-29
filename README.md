# Digitalizador de Tickets

PWA para digitalizar tickets/facturas como autónomo: foto -> OCR local -> confirmar -> guardado en Google Drive/Sheets. Ver el plan completo en `docs/plan.md`.

## Desarrollo

```
npm install
npm run dev
```

Abre http://localhost:5173 — en Chrome Android, usa "Añadir a pantalla de inicio" para instalarla.

## Build

```
npm run build
npm run preview
```

## Variables de entorno

Copia `.env.example` a `.env` y rellena `VITE_GOOGLE_CLIENT_ID` (se configura en el Milestone 5, ver plan).
