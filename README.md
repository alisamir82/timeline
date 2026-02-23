# Timeline Planning Tool

A browser-based project timeline planning and visualization tool built with React and TypeScript. Create interactive Gantt-style timelines, manage task dependencies, and export your plans — all without a backend.

## Features

- **Interactive Gantt Timeline** — drag-and-resize task bars across day, week, month, and quarter zoom levels
- **Task Dependencies** — Finish-to-Start, Start-to-Start, Finish-to-Finish, and Start-to-Finish relationships with cycle detection
- **Multi-Project Support** — manage multiple projects within a single workspace
- **RAG Status Tracking** — Red/Amber/Green indicators for at-a-glance project health
- **Custom Fields** — add flexible attributes to tasks (text, number, date, dropdown)
- **Sticky Notes** — annotate tasks directly on the timeline
- **Filters & Saved Views** — search and filter tasks by status, owner, date range, and more
- **Export** — PNG, PDF, and CSV export with tight cropping to task extent
- **File Save/Open** — native File System Access API support with JSON file format
- **Auto-Save** — automatic backup to localStorage every 30 seconds
- **Dark Mode** — full dark theme support
- **Audit Log** — track changes for compliance
- **Offline** — works entirely in the browser with no server required

## Tech Stack

- **React 19** with TypeScript
- **Vite** for development and builds
- **Zustand** for state management
- **Tailwind CSS** for styling
- **date-fns** for date utilities
- **html2canvas** + **jsPDF** for image/PDF export
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173) with hot reload.

### Build

```bash
npm run build
```

Outputs to the `dist/` directory. Preview locally with:

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── AuditLog/          # Change tracking panel
│   ├── Export/             # PNG/PDF/CSV export utilities
│   ├── Filters/           # Search and filter UI
│   ├── LeftPanel/         # Task list sidebar
│   ├── ProjectManager/    # Project creation and switching
│   ├── TaskDetails/       # Task detail drawer
│   ├── Timeline/          # Gantt grid, task bars, dependencies, today line
│   └── Toolbar/           # Top menu bar
├── stores/
│   └── useProjectStore.ts # Zustand store with localStorage persistence
├── types/
│   └── index.ts           # TypeScript type definitions
├── utils/
│   ├── dates.ts           # Date formatting and timeline math
│   ├── dependencies.ts    # Dependency validation and cycle detection
│   ├── templates.ts       # Project templates
│   └── sampleData.ts      # Initial sample data
├── App.tsx                # Root component
└── main.tsx               # Entry point
```

## Data Persistence

All data stays in your browser. The app uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for native save/open when available, falling back to file download/upload. Auto-save writes to `localStorage` every 30 seconds as a backup.

## License

Private — all rights reserved.
