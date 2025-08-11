# Media Upload with Background Processing (React + Express)

Example Repository: [SnapTrace](https://github.com/getsentry/snaptrace)

**Challenge:** Track user-perceived upload time, server-side validation, and async media processing (optimization, thumbnail generation) while maintaining trace continuity across async boundaries.

**Solution:** Start a client span for the entire upload experience, create a backend span for upload validation, and a separate span for async media processing. Use rich attributes instead of excessive spans to capture processing details.

## Frontend (React) — Instrument Upload Action

```typescript
// In your UploadForm component's upload handler
const handleUpload = async () => {
  if (!selectedFile) return;

  // Start Sentry span for entire upload operation
  await Sentry.startSpan(
    {
      name: 'Upload media',
      op: 'file.upload',
      attributes: {
        'file.size_bytes': selectedFile.size,
        'file.mime_type': selectedFile.type,
      }
    },
    async (span) => {
      const uploadStartTime = Date.now();
      
      try {
        // Single API call to upload and start processing
        const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size
          })
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const uploadData = await uploadResponse.json();
        
        // Set success attributes
        span?.setAttribute('upload.success', true);
        span?.setAttribute('upload.duration_ms', Date.now() - uploadStartTime);
        span?.setAttribute('job.id', uploadData.jobId);
        
        // Update UI to show processing status
        updateUploadStatus(uploadId, 'processing');
        
      } catch (error) {
        span?.setAttribute('upload.success', false);
        span?.setAttribute('upload.error', error instanceof Error ? error.message : 'Unknown error');
        setUploadStatus('error');
      }
    }
  );
};
```

**Where to put this in your app:**
- In the upload button click handler or form submit handler
- In drag-and-drop onDrop callback
- Auto-instrumentation will capture fetch spans; the explicit span adds business context

## Backend — Upload Validation and Async Processing

```typescript
// Import Sentry instrumentation first (required for v10)
import './instrument';
import express from 'express';
import * as Sentry from '@sentry/node';

// POST /api/upload - Receive and validate upload, then trigger async processing
app.post('/api/upload', async (req: Request<{}, {}, UploadRequest>, res: Response) => {
  const { fileName, fileType, fileSize } = req.body;

  // Span 2: Backend validates and accepts upload
  await Sentry.startSpan(
    {
      op: 'upload.receive',
      name: 'Receive upload',
      attributes: {
        'file.name': fileName,
        'file.size_bytes': fileSize,
        'file.mime_type': fileType,
        'validation.passed': true
      }
    },
    async (span) => {
      try {
        // Validate the upload
        if (!fileName || !fileType || !fileSize) {
          span?.setAttribute('validation.passed', false);
          span?.setAttribute('validation.error', 'Missing required fields');
          return res.status(400).json({ error: 'Missing required fields' });
        }

        if (fileSize > 50 * 1024 * 1024) { // 50MB limit
          span?.setAttribute('validation.passed', false);
          span?.setAttribute('validation.error', 'File too large');
          return res.status(400).json({ error: 'File too large (max 50MB)' });
        }

        // Create a job for processing
        const job = createJob(fileName, fileType, fileSize);
        span?.setAttribute('job.id', job.id);

        // Start async processing (Span 3 will be created here)
        setImmediate(async () => {
          await processMedia(job);
        });

        // Respond immediately with job ID
        res.json({
          jobId: job.id,
          status: 'accepted',
          message: 'Upload received and processing started'
        });

      } catch (error) {
        span?.setAttribute('validation.passed', false);
        span?.setAttribute('error.message', error instanceof Error ? error.message : 'Unknown error');
        Sentry.captureException(error);
        res.status(500).json({ error: 'Failed to process upload' });
      }
    }
  );
});

// Async media processing (runs in background via setImmediate)
export async function processMedia(job: ProcessingJob): Promise<void> {
  await Sentry.startSpan(
    {
      op: 'media.process',
      name: 'Process media',
      attributes: {
        'media.size_bytes': job.fileSize,
        'media.mime_type': job.fileType,
        'media.size_bucket': getSizeBucket(job.fileSize),
        'job.id': job.id
      }
    },
    async (span) => {
      try {
        const startTime = Date.now();
        const operations: string[] = [];
        
        // Simulate image optimization and thumbnail generation
        if (job.fileType.startsWith('image/')) {
          // Note: No separate spans for these operations - use attributes instead
          await optimizeImage(); // Simulated delay
          operations.push('optimize');
          
          await generateThumbnail(); // Simulated delay
          operations.push('thumbnail');
        }
        
        // Calculate results
        const sizeSaved = Math.floor(job.fileSize * 0.3); // 30% reduction
        const thumbnailCreated = Math.random() > 0.05; // 95% success rate
        
        // Rich attributes instead of multiple spans
        span?.setAttribute('processing.operations', operations);
        span?.setAttribute('processing.optimization_level', 'high');
        span?.setAttribute('processing.thumbnail_created', thumbnailCreated);
        span?.setAttribute('processing.duration_ms', Date.now() - startTime);
        span?.setAttribute('result.size_saved_bytes', sizeSaved);
        span?.setAttribute('result.size_reduction_percent', 30);
        span?.setAttribute('result.status', 'success');
        
        // Update job status
        job.status = 'completed';
        
      } catch (error) {
        span?.setAttribute('result.status', 'failed');
        span?.setAttribute('error.message', error instanceof Error ? error.message : 'Unknown error');
        Sentry.captureException(error);
      }
    }
  );
}
```

## Sentry Initialization (instrument.ts)

```typescript
// backend/src/instrument.ts - Must be imported before any other code
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN || 'YOUR_BACKEND_DSN_HERE',
  integrations: [
    nodeProfilingIntegration()
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  environment: process.env.NODE_ENV || 'development'
});
```

## How the Trace Works Together

- **Frontend span** (`file.upload`) captures the entire user experience from file selection to server response
- **Backend validation span** (`upload.receive`) tracks server-side validation and job creation
- **Async processing span** (`media.process`) runs in background with rich attributes for all processing operations
- No unnecessary spans for individual operations (optimization, thumbnail) - these are attributes instead
- Trace continuity maintained through Sentry's automatic context propagation

## What to Monitor with Span Metrics

### Performance Metrics
- **p95 upload duration** by `file.size_bytes` bucket (small/medium/large)
  ```sql
  SELECT percentile(span.duration, 95) 
  WHERE op:file.upload 
  GROUP BY file.size_bucket
  ```

### Success Rates
- **Processing success rate** by file type
  ```sql
  SELECT count_if(result.status = 'success') / count() 
  WHERE op:media.process 
  GROUP BY media.mime_type
  ```

### Business Value
- **Average storage saved** through optimization
  ```sql
  SELECT avg(result.size_saved_bytes) 
  WHERE op:media.process 
  AND result.status = 'success'
  ```

### Error Analysis
- **Validation failure reasons**
  ```sql
  SELECT count() 
  WHERE op:upload.receive 
  AND validation.passed = false 
  GROUP BY validation.error
  ```

## Key Implementation Notes

1. **Three Spans Only**: Resist the temptation to create spans for every operation. Use attributes for details.

2. **Rich Attributes**: Include business metrics (`size_saved_bytes`), technical details (`optimization_level`), and outcomes (`validation.passed`).

3. **Async Pattern**: Use `setImmediate()` for in-process async work. The processing span runs independently but maintains trace context.

4. **Sentry v10**: Backend requires `instrument.ts` imported first. Uses `Sentry.setupExpressErrorHandler()` for automatic error capture.

5. **No External Dependencies**: No Redis queue or S3 storage needed - perfect for learning and small applications.

## Common Pitfalls to Avoid

❌ **Don't create separate spans for**:
- File validation checks
- Individual processing steps (optimize, thumbnail)
- Progress updates

✅ **Do use attributes for**:
- Processing operations performed
- File metadata and metrics
- Success/failure states
- Performance measurements

This pattern scales from simple applications to complex distributed systems by adding spans only at service boundaries while keeping rich attributes consistent.