# 📸 SnapTrace - Learn Sentry Tracing with a Real App

**SnapTrace** is an educational media upload application that demonstrates Sentry distributed tracing best practices through a simple, beautiful photo sharing app. Upload images, watch them appear in a masonry gallery, and learn how to instrument your applications effectively.

![SnapTrace](https://img.shields.io/badge/SnapTrace-v2.0.0-667eea?style=for-the-badge&logo=camera&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-362D59?style=for-the-badge&logo=sentry&logoColor=white)

## 🎯 What This Example Teaches

This example demonstrates the **"Goldilocks Principle"** of tracing - not too many spans, not too few, but just right. You'll learn:

1. **When to create spans** vs when to use attributes
2. **How to trace async operations** within a single service
3. **How to design meaningful attributes** that enable powerful queries
4. **How to avoid over-instrumentation** that creates noise without value
5. **Real-world patterns** that scale from simple apps to complex systems

## 🏗️ Architecture - Simple & Educational

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

That's it! No complex setup, no worker configuration, just two services that teach you everything.

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

## 🚫 Anti-Patterns This Example Avoids

### ❌ Over-Instrumentation
**Don't**: Create a span for every function
```typescript
// BAD - Too many spans
startSpan('validateFile')
startSpan('checkFileSize')
startSpan('checkFileType')
startSpan('generatePreview')
```

**Do**: Use attributes on meaningful spans
```typescript
// GOOD - One span with attributes
startSpan('upload.receive', {
  attributes: {
    'validation.file_size': 'pass',
    'validation.file_type': 'pass',
    'validation.preview_generated': true
  }
})
```

### ❌ Span Explosion
**Don't**: Create separate spans for each processing step
```typescript
// BAD - Unnecessary span proliferation
startSpan('scan.virus')
startSpan('optimize.image')
startSpan('generate.thumbnail')
startSpan('convert.format')
```

**Do**: One processing span with detailed attributes
```typescript
// GOOD - Single span tells the whole story
startSpan('media.process', {
  attributes: {
    'processing.operations': ['optimize', 'thumbnail'],
    'optimization.level': 'high',
    'thumbnail.generated': true,
    'formats.created': ['webp', 'jpg']
  }
})
```

### ❌ Missing Context
**Don't**: Create spans with no attributes
```typescript
// BAD - What can we learn from this?
startSpan('process')
```

**Do**: Rich attributes that enable powerful queries
```typescript
// GOOD - Queryable, filterable, actionable
startSpan('media.process', {
  attributes: {
    'media.size_bucket': 'large',      // Filterable
    'processing.duration_ms': 2500,    // Measurable
    'customer.tier': 'premium',        // Segmentable
    'result.cached': false              // Debuggable
  }
})
```

## 📊 Powerful Queries Enabled

Because we use rich attributes instead of excessive spans, you can answer important questions:

### Performance Analysis
```sql
-- p95 upload time by file size
SELECT 
  percentile(span.duration, 95) as p95_duration,
  span.data['file.size_bucket']
FROM spans
WHERE op = 'file.upload'
GROUP BY span.data['file.size_bucket']
```

### Success Rates
```sql
-- Processing success rate by operation
SELECT 
  count_if(span.data['result.status'] = 'success') / count() as success_rate,
  span.data['processing.operations']
FROM spans  
WHERE op = 'media.process'
GROUP BY span.data['processing.operations']
```

### Business Metrics
```sql
-- Average storage saved through optimization
SELECT
  avg(span.data['result.size_saved_bytes']) as avg_bytes_saved,
  sum(span.data['result.size_saved_bytes']) as total_bytes_saved
FROM spans
WHERE op = 'media.process'
  AND span.data['result.status'] = 'success'
```

## 🎓 Learning Exercises

### Exercise 1: Add a New Attribute
Add a `compression.ratio` attribute to the processing span. Think about:
- Is this better as a new span or an attribute?
- What values make it queryable?
- How does it help debugging?

### Exercise 2: Implement Caching
Add caching detection to the upload flow:
- Should cache hits create new spans?
- What attributes would help you monitor cache effectiveness?
- How would you query cache hit rates?

### Exercise 3: Add User Context
Enhance spans with user segmentation:
- Add `user.tier` (free/pro/enterprise) attributes
- Track `user.monthly_uploads` count
- Monitor performance by user segment

## 🔄 How This Pattern Scales

### Current (Simple & Educational)
```
Frontend → Backend (with async processing)
- 3 spans across 2 services
- In-process async handling
- Perfect for learning and small apps
```

### Future (Production Scale)
```
Frontend → API Gateway → Backend → Queue → Workers → Storage
- Same 3 core span types, distributed across services
- Add spans only at service boundaries
- Rich attributes remain the same
```

The patterns you learn here apply whether you have 2 services or 200!

## 🛠️ Technical Details

> **Important**: This example uses Sentry SDK v10 which requires the backend to import `instrument.ts` before any other code. This ensures proper initialization of tracing and profiling.

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
- **No external dependencies**: No Redis, no S3, just Node.js
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

## 🤔 Frequently Asked Questions

### Q: Why only 3 spans?
**A**: These 3 spans represent the essential boundaries in most applications: user interaction, API handling, and async processing. More spans often add noise without insight.

### Q: Should I create a span for database queries?
**A**: Sentry's auto-instrumentation handles database queries. Create manual spans only for business-logic operations.

### Q: How do I know if I have too many spans?
**A**: If you have more than 10-15 spans in a typical trace, you're probably over-instrumenting. If span names describe implementation details rather than business operations, consolidate them.

### Q: When should I use a new span vs an attribute?
**A**: New span if: crossing a network boundary, starting async work, or beginning a major business operation. Attribute if: adding context, recording a metric, or noting a decision.

## 🚢 Deployment Considerations

### For Learning/Development
The current setup is perfect - just run `npm run dev`

### For Production
1. Build the frontend: `cd frontend && npm run build`
2. Run the backend with: `cd backend && npm start` (uses tsx directly)
3. Use PM2 or similar for process management
4. Add real cloud storage (S3, GCS) when needed
5. Add real queue (Bull, SQS) when scale demands it

## 🤝 Contributing

This is an educational example - contributions that make it clearer or teach better patterns are welcome! Please:

1. Keep the 3-span pattern
2. Don't add external service dependencies
3. Focus on teaching value over features
4. Include comments explaining decisions

## 📚 Additional Resources

- [Sentry Distributed Tracing Docs](https://docs.sentry.io/product/sentry-basics/distributed-tracing/)
- [OpenTelemetry Span Best Practices](https://opentelemetry.io/docs/concepts/signals/traces/)
- [When to Use Spans vs Metrics vs Logs](https://docs.sentry.io/product/sentry-basics/concepts/)

## 📄 License

MIT - Use this example to learn and build better instrumented applications!

---

**Remember**: Good tracing isn't about quantity - it's about capturing the right information at the right boundaries. Less is often more! 🎯