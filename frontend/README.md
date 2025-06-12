# System Load AI Frontend

React TypeScript application với Vite build tool cho System Load AI monitoring và prediction dashboard.

## 🚀 Tech Stack

### Core Framework
- **React 18.2** - Modern React với hooks
- **TypeScript 4.9** - Type-safe development
- **Vite 4.0** - Lightning fast build tool
- **React Router DOM 6.8** - Client-side routing

### UI Libraries
- **Ant Design 5.0** - Enterprise-class UI design language
- **Radix UI** - Low-level UI primitives (@radix-ui/react-*)
- **Lucide React** - Beautiful icon library
- **Tailwind CSS 3.2** - Utility-first CSS framework
- **Recharts 2.4** - Composable charting library

### HTTP & API
- **Axios 1.3** - Promise-based HTTP client với interceptors
- **API Proxy** - Development proxy tới backend `/api`

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── App.tsx              # Main app component với routing
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles
│   ├── components/
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   └── SystemConnection.tsx  # Backend connection testing
│   ├── pages/
│   │   ├── Dashboard.tsx    # Main metrics dashboard
│   │   ├── Predictions.tsx  # AI prediction interface
│   │   ├── ResourceOptimization.tsx  # Resource analysis
│   │   ├── Reports.tsx      # System reports
│   │   └── SystemMetrics.tsx
│   └── services/
│       └── api.ts           # Complete backend API integration
├── public/                  # Static assets
├── dist/                    # Build output
└── Config Files
```

## 📱 Application Features

### Route Structure

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Dashboard | Real-time metrics monitoring |
| `/predictions` | Predictions | AI load prediction với multiple time horizons |
| `/optimization` | ResourceOptimization | System performance analysis |
| `/reports` | Reports | Historical reports và analytics |
| `/connection-test` | SystemConnection | Backend health check |

### API Integration

Complete integration với backend APIs:

#### System Load APIs
```typescript
// Real-time metrics
getCurrentMetrics()
collectMetrics()
getHistoricalMetrics(hours)

// AI predictions
getLoadPrediction()
trainModels()
getSystemStatistics(hours)
```

#### Multi-Model Prediction APIs
```typescript
// Time-specific predictions
predict1Hour(modelName)
predict6Hours(modelName) 
predict24Hours(modelName)

// Model management
trainPredictionModel(metricName, modelName)
getAvailablePredictionModels()
```

## 🛠️ Development

### Prerequisites

```bash
# Node.js 18+ required
node --version  # v18.x.x
npm --version   # v9.x.x
```

### Quick Start

```bash
# Install dependencies
npm ci

# Start development server
npm run dev

# Accessible at http://localhost:3000
```

### Build & Preview

```bash
# TypeScript compile + build
npm run build

# Preview production build
npm run preview
```

## ⚙️ Configuration

### Vite Config (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,  // Docker container support
    proxy: {
      "/api": {
        target: "http://backend:8080",  # Docker backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

### TypeScript Config

- **Target**: ESNext với modern features
- **JSX**: react-jsx runtime
- **Strict mode**: Full TypeScript strictness
- **Module Resolution**: Node.js style

### Tailwind CSS

- **Content**: `["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]`
- **Utilities**: Full Tailwind utility classes
- **Plugins**: Extensible plugin system

## 🐳 Docker Production

### Multi-stage Dockerfile

```dockerfile
# Stage 1: Build (Node 18 Alpine)
FROM node:18-alpine AS build
# npm ci + npm run build

# Stage 2: Serve (Nginx Alpine)  
FROM nginx:stable-alpine
# Custom nginx.conf + built app
```

### Nginx Configuration

- **Port**: 80
- **SPA Support**: `try_files $uri $uri/ /index.html`
- **Gzip Compression**: Enabled cho static assets
- **Health Check**: Built-in health endpoint

### Build & Run

```bash
# Build image
docker build -t system-load-frontend .

# Run container
docker run -p 80:80 system-load-frontend

# Health check
curl -f http://localhost/ || exit 1
```

## 🔌 API Service Layer

### Axios Configuration

```typescript
// Environment-aware base URL
const API_BASE_URL = process.env.NODE_ENV === "production" 
  ? "http://localhost:8080/api" 
  : "/api";  // Vite proxy

// Request/Response interceptors
// Built-in logging và error handling
```

### TypeScript Interfaces

Complete type definitions matching backend models:

```typescript
interface SystemMetrics {
  // CPU, Memory, Disk, Network metrics
  // Load scores và calculated values
}

interface PredictionResult {
  predictedLoad: number;
  isAnomaly: boolean;
  recommendations: string[];
  detailedPredictions: Array<{
    timestamp: string;
    predicted_value: number;
    lower_bound: number;
    upper_bound: number;
  }>;
}
```

## 🧪 Development Workflow

### Hot Reload Development

```bash
npm run dev
# Vite HMR với instant updates
# TypeScript checking
# API proxy tới backend:8080
```

### Production Build Process

```bash
npm run build
# 1. TypeScript compilation (tsc)
# 2. Vite build optimization
# 3. Asset bundling & minification
# 4. Output to dist/
```

### Environment Handling

- **Development**: Vite proxy `/api` → `backend:8080`
- **Production**: Direct API calls tới backend URL
- **Docker**: Nginx serving static files

## 🔧 Troubleshooting

### Development Issues

```bash
# Clear node_modules và reinstall
rm -rf node_modules package-lock.json
npm install

# Check proxy connectivity
curl http://localhost:3000/api/system-load/health

# Vite dev server logs
npm run dev --debug
```

### Build Issues

```bash
# TypeScript compilation errors
npx tsc --noEmit

# Clean build
rm -rf dist
npm run build

# Preview build locally
npm run preview
```

### Docker Issues

```bash
# Build logs
docker build -t frontend . --no-cache

# Container logs
docker logs <container-id>

# Health check
docker exec <container> curl -f http://localhost/
```

## 📊 Performance Features

### Bundle Optimization

- **Vite Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image và font optimization

### Runtime Performance

- **React 18**: Concurrent features
- **Recharts**: Efficient chart rendering
- **Ant Design**: Optimized component library
- **Lazy Loading**: Route-based code splitting

### Production Optimizations

- **Nginx Gzip**: Compressed static asset serving
- **HTTP Caching**: Browser cache optimization
- **Bundle Analysis**: Built-in Vite analyzer

Ứng dụng frontend hoàn chỉnh với production-ready setup, comprehensive API integration, và modern development experience!
