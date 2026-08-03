# WebSnap Pro

**Automated Full-Website Screenshot Tool** — Capture full-page screenshots of every page on any website with a single click.

## Features

- 🔍 **Smart Crawler** — Discovers all internal pages via links, sitemap.xml, robots.txt
- 📸 **Full-Page Screenshots** — Captures entire pages including lazy-loaded content
- 📱 **Multi-Device** — Desktop, Laptop, Tablet, and Mobile viewports
- 🖼️ **Preview Gallery** — Browse, preview, and download individual screenshots
- 📦 **ZIP Download** — Download all screenshots organized by device
- 📊 **Live Progress** — Real-time progress tracking via SSE
- 🌙 **Dark Mode** — Modern SaaS dashboard with dark/light themes
- 🔒 **Security** — Rate limiting, SSRF protection, input sanitization

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, Shadcn UI, Framer Motion |
| Backend | Express.js, TypeScript, Playwright, Prisma |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Image | Sharp, WebP/PNG/JPEG |
| Packaging | Archiver (ZIP) |

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone & Install

```bash
# Backend
cd backend
npm install
npx playwright install chromium

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

### 3. Initialize Database

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

### 5. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan` | Start a new scan |
| POST | `/api/crawl` | Crawl-only (discover pages) |
| GET | `/api/progress/:id` | SSE stream for live progress |
| GET | `/api/screenshots/:id` | List screenshots for a scan |
| GET | `/api/download/:id` | Download ZIP archive |
| DELETE | `/api/scan/:id` | Delete a scan |
| GET | `/api/scans` | List all scans |

## Project Structure

```
snapshot_tool/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── index.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   └── package.json
├── .env.example
└── README.md
```

## License

MIT
