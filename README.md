# 📸 SnapTrace - Learn Sentry Tracing For Media Upload Perofrmance

**SnapTrace** is an educational media upload application that demonstrates Sentry distributed tracing best practices through a simple, beautiful photo sharing app. Upload images, watch them appear in a masonry gallery, and learn how to instrument your applications effectively.

![SnapTrace](https://img.shields.io/badge/SnapTrace-v2.0.0-667eea?style=for-the-badge&logo=camera&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-362D59?style=for-the-badge&logo=sentry&logoColor=white)

## 🚀 Quick Start

### Prerequisites
- Node.js 20.6+ (for native .env support)
- npm or yarn
- A Sentry account with DSNs for frontend and backend

### Setup in 60 Seconds

```bash
# 1. Clone and install
git clone <repository-url>
cd snaptrace
npm run install:all

# 2. Configure Sentry (copy and edit .env files)
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
# Add your Sentry DSNs to the .env files

# 3. Start everything
npm run dev

# 4. Open the app
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐
│    Frontend     │ ──────> │     Backend     │
│  (React + Vite) │         │ (Express + Jobs)│
│ localhost:5173  │ <────── │ localhost:3001  │
└─────────────────┘         └─────────────────┘
        │                           │
        └───────────────────────────┘
                    │
            ┌──────────────┐
            │    Sentry    │
            │   (Tracing)  │
            └──────────────┘

📊 The 3 Essential Spans:
1. file.upload    → User uploads file (Frontend)
2. upload.receive → Server validates upload (Backend)  
3. media.process  → Async processing (Backend)
```

## 📚 The 3-Span Pattern Explained

### Why These 3 Spans?

We carefully chose 3 spans that represent the most common and important boundaries in web applications:

#### Span 1: `file.upload` (Frontend)
**Purpose**: Track the entire user experience from file selection to server response  
**Key Learning**: User-facing operations deserve their own span  
**What's NOT a separate span**: File validation, preview generation, progress updates  

```typescript
Sentry.startSpan({
  op: 'file.upload',
  name: 'Upload media',
  attributes: {
    'file.size_bytes': 2048576,        // Metric
    'file.mime_type': 'image/jpeg',    // Category
    'upload.success': true,             // Outcome
    'upload.duration_ms': 1234          // Performance
  }
})
```

#### Span 2: `upload.receive` (Backend)
**Purpose**: Track server-side validation and job initiation  
**Key Learning**: API boundaries are natural span boundaries  
**What's NOT a separate span**: Individual validation checks, job queue operations  

```typescript
Sentry.startSpan({
  op: 'upload.receive',
  name: 'Receive upload',
  attributes: {
    'file.name': 'photo.jpg',          // Identity
    'validation.passed': true,          // Outcome
    'job.id': '123-abc',               // Correlation
    'file.size_bytes': 2048576         // Metric
  }
})
```

#### Span 3: `media.process` (Backend Async)
**Purpose**: Track background processing as one logical operation  
**Key Learning**: Group related async work into single spans with rich attributes  
**What's NOT a separate span**: Optimization, thumbnail generation, format conversion  

```typescript
Sentry.startSpan({
  op: 'media.process',
  name: 'Process media',
  attributes: {
    'processing.operations': ['optimize', 'thumbnail'],  // What happened
    'processing.duration_ms': 2500,                     // How long
    'result.size_saved_bytes': 1024000,                // Business value
    'result.status': 'success'                         // Outcome
  }
})
```

## 📊 Queries Enabled

Because we use attributes, you can answer important questions directly in Sentry Trace Explorer:

### Performance Analysis
- **Dataset**: Spans
- **Filter**: `op:file.upload`
- **Y-Axis**: `p95(span.duration)`
- **Group by**: `span.data["file.mime_type"]`
- Optional: switch to time series to see trends of `p95(span.duration)` over time.

To analyze processing time by size bucket:
- **Dataset**: Spans
- **Filter**: `op:media.process`
- **Y-Axis**: `p95(span.duration)`
- **Group by**: `span.data["media.size_bucket"]`

### Success Rates
- **Dataset**: Spans
- **Filter**: `op:media.process`
- **Columns/Functions**:
  - `count()`
  - `count_if(span.data["result.status"] == "success")` as `successes`
  - Add a Formula column: `successes / count()` as `success_rate`
- **Group by**: `span.data["processing.operations"]`

### Business Metrics
- **Dataset**: Spans
- **Filter**: `op:media.process` and `span.data["result.status"]:success`
- **Y-Axis**: 
  - `avg(span.data["result.size_saved_bytes"])` as `avg_bytes_saved`
  - `sum(span.data["result.size_saved_bytes"])` as `total_bytes_saved`
- **Optional breakdowns**: `span.data["media.size_bucket"]`, `span.data["processing.optimization_level"]`

## 🛠️ Technical Details

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build**: Vite for instant HMR
- **UI**: Framer Motion animations, Masonry gallery layout
- **Styling**: Modern CSS with gradient backgrounds
- **Tracing**: Sentry React SDK v10 with browser tracing integration

### Backend (Express + TypeScript)
- **Framework**: Express with TypeScript
- **Runtime**: Node.js 20.6+ with native .env support via `--env-file` flag
- **Processing**: Async job handling with `setImmediate()`
- **Tracing**: Sentry Node SDK v10 with profiling
- **Initialization**: Separate `instrument.ts` file imported first for proper Sentry setup
- **Error Handling**: Uses `Sentry.setupExpressErrorHandler()` for automatic error capturing

### Key Design Decisions
- **No proxy**: Frontend makes direct API calls (real-world pattern)
- **TypeScript throughout**: Type safety and better IDE support
- **Single backend service**: Simpler to understand and run

## 📈 Monitoring Your Spans

### Development
1. Upload several images of different sizes
2. Open Sentry Performance dashboard
3. Find your traces (filter by `op:file.upload`)
4. Explore the waterfall view
5. Check span attributes

### Key Metrics to Track
- **Upload Performance**: p50, p95, p99 of `file.upload` duration
- **Processing Success**: Success rate of `media.process` spans
- **File Size Impact**: Performance correlation with `file.size_bucket`
- **Optimization Effectiveness**: Average `result.size_saved_bytes`

## 🚢 Deployment Considerations

### For Learning/Development
The current setup is perfect - just run `npm run de