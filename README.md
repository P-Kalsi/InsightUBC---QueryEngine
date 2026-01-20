# Sections Insights - CPSC 310 Project

A full-stack application for managing and visualizing UBC course section datasets.

## Quick Start

### Prerequisites

- Node.js (v22+)
- Yarn (1.22.X)

### Running the Application

**Terminal 1 - Start Backend:**

```bash
cd project_team173
yarn install
yarn start
```

Backend runs on http://localhost:4321

**Terminal 2 - Start Frontend:**

```bash
cd project_team173/frontend
yarn install
yarn dev
```

Frontend runs on http://localhost:5173

### Running Tests

**Backend Tests:**

```bash
yarn test
```

**Frontend Tests:**

```bash
cd frontend
yarn test
```

---

## Project Structure

```
project_team173/
├── src/
│   ├── App.ts                 # Backend entry point
│   ├── rest/
│   │   └── Server.ts          # REST API endpoints
│   └── controller/
│       └── InsightFacade.ts   # Core dataset logic
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main React component
│   │   └── components/
│   │       ├── AddDatasetForm.tsx
│   │       ├── DatasetList.tsx
│   │       ├── DatasetCard.tsx
│   │       ├── InsightsView.tsx
│   │       ├── InsightsCompare.tsx
│   │       └── DarkModeToggle.tsx
│   └── package.json
├── test/
│   └── rest/
│       └── Server.spec.ts     # Backend tests
└── package.json
```

---

## REST API Endpoints

| Method | Endpoint                | Description                             |
| ------ | ----------------------- | --------------------------------------- |
| POST   | `/dataset/:id`          | Add a dataset (ZIP file as binary body) |
| DELETE | `/dataset/:id`          | Remove a dataset                        |
| GET    | `/datasets`             | List all datasets                       |
| GET    | `/dataset/:id/insights` | Get visualization data                  |

### Example Usage (curl)

Must be in the project_team173/test/resources/archives directory:
**Add a dataset:**

```bash
curl -X POST http://localhost:4321/dataset/myDataset -H "Content-Type: application/octet-stream" --data-binary @pair.zip
```

**List datasets:**

```bash
curl http://localhost:4321/datasets
```

**Get insights:**

```bash
curl http://localhost:4321/dataset/myDataset/insights
```

**Delete a dataset:**

```bash
curl -X DELETE http://localhost:4321/dataset/myDataset
```

---

## Features

- **Add Datasets:** Upload ZIP files containing UBC course section data
- **Remove Datasets:** Delete datasets with smooth animations
- **View Insights:** Three interactive charts per dataset:
  - Average Grade by Department (Bar Chart)
  - Courses by Department (Pie Chart)
  - Top 10 Courses by Average Grade (Line Chart)
- **Filter by Department:** Dynamically filter insights
- **Compare Datasets:** View up to 3 datasets side-by-side
- **Dark Mode:** Toggle with persistent preference

---

## Development Commands

### Backend (from project root)

| Command        | Description             |
| -------------- | ----------------------- |
| `yarn install` | Install dependencies    |
| `yarn build`   | Compile TypeScript      |
| `yarn start`   | Start the server        |
| `yarn test`    | Run backend tests       |
| `yarn cover`   | Run tests with coverage |

### Frontend (from /frontend)

| Command        | Description              |
| -------------- | ------------------------ |
| `yarn install` | Install dependencies     |
| `yarn dev`     | Start development server |
| `yarn build`   | Build for production     |
| `yarn test`    | Run frontend tests       |

---
