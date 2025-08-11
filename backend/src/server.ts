import './instrument';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import { createJob, processMedia, getJob } from './processor';

const app = express();

Sentry.setupExpressErrorHandler(app);

const PORT = process.env.PORT || 3001;

// CORS configuration - allow direct connections from frontend
const corsOptions = {
  origin: [
    'http://localhost:5173',  // Vite default port
    'http://localhost:5174',  // Vite fallback port
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'sentry-trace', 'baggage'],
  exposedHeaders: ['sentry-trace', 'baggage']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

// POST /api/upload - Receive upload and start processing
app.post('/api/upload', async (req: Request<{}, {}, UploadRequest>, res: Response) => {
  const { fileName, fileType, fileSize } = req.body;

  // Span 2: upload.receive - Backend validates and accepts upload
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
          res.status(400).json({ error: 'Missing required fields' });
          return;
        }

        if (fileSize > 50 * 1024 * 1024) { // 50MB limit
          span?.setAttribute('validation.passed', false);
          span?.setAttribute('validation.error', 'File too large');
          res.status(400).json({ error: 'File too large (max 50MB)' });
          return;
        }

        if (!fileType.startsWith('image/')) {
          span?.setAttribute('validation.passed', false);
          span?.setAttribute('validation.error', 'Invalid file type');
          res.status(400).json({ error: 'Only images are supported' });
          return;
        }

        // Create a job for processing
        const job = createJob(fileName, fileType, fileSize);
        span?.setAttribute('job.id', job.id);

        console.log(`📸 SnapTrace: Received upload for ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

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
        console.error('❌ SnapTrace: Failed to receive upload:', error);
        span?.setAttribute('validation.passed', false);
        span?.setAttribute('error.message', error instanceof Error ? error.message : 'Unknown error');
        Sentry.captureException(error);
        res.status(500).json({ error: 'Failed to process upload' });
      }
    }
  );
});

// GET /api/status/:jobId - Check processing status
app.get('/api/status/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  const job = getJob(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    fileName: job.fileName,
    fileSize: job.fileSize,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    result: job.result
  });
});

// GET /api/health - Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    app: 'SnapTrace Backend',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ SnapTrace Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SnapTrace Backend`);
  console.log(`📸 Server running on http://localhost:${PORT}`);
  console.log(`✨ Ready to receive uploads\n`);
});

export default app;