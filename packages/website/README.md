Motif-ts Website: A Next.js 16 + TailwindCSS landing page with interactive workflow visualizations and time-travel debugging.

Tagline: Dead Simple. Fully Typed. Effortlessly Orchestrated.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Feature Overview

- Workflow Graph Visualization: Zoom/pan, node selection, tooltips, and live updates from workflow state.
- Redux DevTools Time Travel: Integrates Redux DevTools via middleware; includes an in-app timeline, diff view, and playback controls.
- Framework-agnostic core: APIs showcased without UI coupling; adapters integrate with any framework. React is supported today.

### Visualization Components

- `WorkflowShowcase`: Sets up a typed sample workflow and renders graph + time travel UI.
- `WorkflowGraph`: D3-based interactive graph (responsive SVG, zoom, pan, drag, tooltips).
- `TimeTravelDebugger`: Captures snapshots with middleware persist, allows import/restore, timeline navigation, and state diff.

### DevTools Integration

- Use `persist` and `devtools` middleware to export/import snapshots, and optionally connect Redux DevTools for time travel.

### Testing

- Unit tests for graph data extraction and state diff utilities.
- Run tests: `pnpm --filter website test`

### Accessibility

- WCAG AA-aligned visuals, focus-visible states, skip-to-content link, semantic regions for code and visualization.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Geist.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
