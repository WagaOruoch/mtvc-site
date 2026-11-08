# MTVC website

Static Astro website for Mathioya Technical & Vocational College. 
## Local setup

Use Node.js 20.19 or newer (or Node.js 22 LTS) and npm.

```text
npm install
npm run dev
```

Create a production build with `npm run build`. The generated site is in `dist/`.

To test the website and the custom MTVC CMS locally, use two terminals:

```text
npm run cms:local
npm run dev
```

Open the CMS at `http://127.0.0.1:4323/admin/` or click Staff portal on the website. The CMS is built and owned by MTVC: it has no Decap, GitHub login, OAuth app, or external CMS account. It writes Markdown files directly into `src/content/`. The public website remains at `http://127.0.0.1:4321/`; refresh it after saving CMS content.

## Project structure

- `src/pages/index.astro` contains the single-page public website and its in-page sections.
- `src/layouts/` contains shared page structure.
- `src/styles/` contains the small global CSS layer.
- `src/content/` contains staff-managed Markdown content and schemas.
- `cms-server.mjs` is the local MTVC CMS server and editor.
- `public/uploads/` is the CMS media destination.

Jobs, tenders, announcements, gallery albums, department requirements, intakes, and the service charter are Markdown content managed by the custom CMS. The homepage filters and presents current jobs, tenders, and announcements in its update modal and in-page sections. The local version saves immediately; a future hosted version can add MTVC-owned authentication and an approval state without changing the content format.

## Deployment

Deploy the repository with Cloudflare Pages using:

- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`

The website can be deployed as static output. A hosted staff editor will require an MTVC-owned server or function with authentication because a static website cannot safely write files by itself.

### Render (temporary V1 preview)

This repository includes [`render.yaml`](./render.yaml) for one-click Render setup as a static site.

- Service type: Static Site (Render blueprint)
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Node version: `22`

After connecting the GitHub repository in Render, choose **Blueprint** deployment and Render will apply this configuration.

## Open college confirmations

- Confirm the official phone number(s), office hours, address wording, and map location.
- Confirm each intake's dates and application Google Form URL.
- Provide ICT and Business requirements PDFs.
- Provide current gallery photos and captions.
- Confirm domain and DNS ownership.
- Confirm the GitHub organisation, repository, Cloudflare account, and OAuth app owner.
- Confirm current intake text and dates before publishing a banner.

## CMS hosting note

The local CMS is intentionally local and does not expose a public editing endpoint. Do not expose port 4323 to the internet without adding authentication, HTTPS, backups, and an approval workflow.
