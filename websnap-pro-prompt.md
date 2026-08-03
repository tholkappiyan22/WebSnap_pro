# WebSnap Pro — Automated Full-Website Screenshot Tool

## Project Overview

Build a full-stack web application called **WebSnap Pro** that automatically captures full-page screenshots of every page on a given website — similar to Chrome DevTools' "Capture full size screenshot" (Ctrl+Shift+P), but fully automated across an entire site instead of one page at a time.

A user simply enters a website URL and clicks **Scan**. The app then:
1. Crawls the site to discover all internal pages
2. Opens each page in a headless browser
3. Captures a full-page screenshot of each one
4. Lets the user preview, download individually, or download everything as a single ZIP

---

## Tech Stack

**Frontend**
- Next.js 15 (React, TypeScript)
- TailwindCSS + Shadcn UI
- Framer Motion (animations)
- Axios

**Backend**
- Node.js + Express.js (TypeScript)
- Playwright (primary screenshot engine) — Puppeteer as optional fallback
- Sharp (image processing), Cheerio (HTML parsing)
- JSZip / Archiver (ZIP generation)
- Redis (optional job queue)

**Database**
- Prisma ORM
- SQLite (dev) / PostgreSQL (production)

---

## Core Features

### 1. Landing Page
Modern, responsive, dark-mode-capable homepage with a hero section, URL input, scan button, live progress section, recent projects list, and download history.

### 2. URL Validation
Before crawling, validate:
- URL format & HTTPS support
- Website reachability
- Timeouts / SSL errors
Show clear error messages for each failure case.

### 3. Website Crawling
- Restrict crawling to the same domain only
- Skip external links, `mailto:`, `tel:`, `javascript:`, hash-only links, and social media links
- Auto-discover common pages (Home, About, Services, Products, Blog, Contact, Pricing) plus any other internal pages found
- Configurable max depth and max page count

### 4. Smart Discovery
Find URLs from anchor tags, `sitemap.xml`, `robots.txt`, nav menus, footers, pagination, breadcrumbs, redirects, and canonical tags.

### 5. Screenshot Engine (Playwright)
For each page:
- Launch headless Chromium
- Wait for network idle, fonts, images, animations, and lazy-loaded content to finish
- Auto-scroll to trigger lazy loading
- Capture with `page.screenshot({ fullPage: true })`

### 6. Multi-Device Capture
Support screenshot generation at multiple viewport sizes:
- Desktop (1920×1080)
- Laptop (1440×900)
- Tablet (768×1024)
- Mobile (390×844)

User selects: Desktop only / Desktop + Mobile / All devices.

### 7. Output Options
- Formats: PNG, JPEG, WebP
- Adjustable quality, lossless mode, transparent background option

### 8. Live Progress Tracking
Show pages discovered, pages completed, current page being processed, estimated time remaining, and a live progress bar.

### 9. Preview Gallery
After a scan completes, show a card per page with thumbnail, page title, URL, file size, and Preview/Download buttons.

### 10. ZIP Download
Package all screenshots into `website-name.zip`, organized by device folder:
```
example.com/
  desktop/
    home.png
    about.png
  mobile/
    home.png
    about.png
```

### 11. Screenshot Naming Convention
Convert URL paths into readable filenames:
- `/` → `home.png`
- `/about` → `about.png`
- `/products/mobile` → `products-mobile.png`

### 12. Duplicate & Loop Protection
Detect duplicate URLs, redirect loops, and same-canonical-page duplicates to prevent infinite crawling.

### 13. Configurable Crawl Settings
Max pages, max depth, capture timeout, pre-capture delay, wait strategy, viewport, and concurrency — all user-adjustable.

### 14. Advanced Wait Conditions
Wait for images, fonts, videos, canvas, SVG, CSS animations, and intersection-observer/lazy-loaded elements before capturing.

### 15. Optional Authentication Support
Allow cookie injection, Basic Auth, Bearer tokens, or a custom login script for capturing pages behind a login.

### 16. Dashboard
List of previous scans with date, site, page count, download, delete, and search.

### 17. Backend API
```
POST   /scan
POST   /crawl
GET    /progress/:id
GET    /screenshots/:id
GET    /download/:id
DELETE /scan/:id
```

### 18. Suggested Folder Structure
```
backend/
  src/
    controllers/
    routes/
    services/
    crawler/
    playwright/
    utils/
    database/
frontend/
  components/
  pages/
  hooks/
  lib/
  types/
```

### 19. Playwright Service Functions
`launchBrowser()`, `closeBrowser()`, `capturePage()`, `captureFullPage()`, `waitForImages()`, `autoScroll()`

### 20. Crawler Service Functions
`crawlWebsite()`, `extractLinks()`, `filterInternalLinks()`, `normalizeURL()`, `generateTree()`

### 21. UI/UX Style
Modern SaaS dashboard aesthetic: glassmorphism, rounded cards, dark mode, animated buttons, loading skeletons, progress timeline, gradients, minimal clutter.

### 22. Error Handling
Gracefully handle 404/500 responses, timeouts, browser crashes, failed navigation, and failed screenshots, with a retry mechanism.

### 23. Performance
Parallel screenshot capture, browser instance pooling, worker queue, caching, and memory optimization for large sites.

### 24. Security
Rate limiting, input sanitization, strict URL validation, and SSRF protection (block localhost and private IP ranges).

### 25. Logging
Track scan start/completion/failure timestamps, duration, error details, and screenshot counts per job.

### 26. Future Roadmap (not required for v1)
PDF export, image compression, visual regression/diff checking, scheduled screenshots, cloud storage integration, email delivery, public API access, and CI/CD (GitHub Action) integration.

---

## Deliverables

Please generate a complete, production-ready implementation including:

- Frontend: Next.js + TypeScript + Tailwind + Shadcn UI
- Backend: Express + TypeScript
- Playwright-based screenshot engine
- Prisma database layer
- Automatic crawler with smart discovery
- ZIP download packaging
- Full dashboard UI (responsive, dark mode)
- Robust error handling
- Clean, modular folder structure (SOLID principles, clean architecture)
- Environment configuration (`.env.example`)
- Docker + Docker Compose setup
- README with setup/run instructions
- Production build configuration
- Unit tests for core services (crawler, screenshot engine)
- API documentation via Swagger/OpenAPI

The codebase should be modular, well-commented, and structured for future SaaS-scale deployment.
