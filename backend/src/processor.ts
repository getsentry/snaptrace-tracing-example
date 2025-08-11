import * as Sentry from '@sentry/node';

// Processing configuration
const TRANSCODE_PRESETS = ['web-optimized', 'mobile', 'high-quality', 'thumbnail-only'] as const;
type TranscodePreset = typeof TRANSCODE_PRESETS[number];

// Simulated processing delays
const PROCESSING_DELAYS = {
  optimize: { min: 500, max: 1500 },
  thumbnail: { min: 300, max: 800 }
} as const;

// Helper function to simulate processing delay
const simulateDelay = (min: number, max: number): Promise<void> => {
  const duration = Math.floor(Math.random() * (max - min) + min);
  return new Promise(resolve => setTimeout(resolve, duration));
};

// Helper function to randomly select from array
const randomChoice = <T>(arr: readonly T[]): T => 
  arr[Math.floor(Math.random() * arr.length)];

export interface ProcessingJob {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  result?: {
    optimized: boolean;
    thumbnailCreated: boolean;
    sizeSaved?: number;
    error?: string;
  };
}

// Simple in-memory job store
const jobs = new Map<string, ProcessingJob>();

export function getJob(id: string): ProcessingJob | undefined {
  return jobs.get(id);
}

export function createJob(fileName: string, fileType: string, fileSize: number): ProcessingJob {
  const job: ProcessingJob = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
    fileName,
    fileType,
    fileSize,
    status: 'pending',
    createdAt: new Date()
  };
  
  jobs.set(job.id, job);
  return job;
}

export async function processMedia(job: ProcessingJob): Promise<void> {
  console.log(`📸 SnapTrace: Starting processing for ${job.fileName}`);
  
  // Update job status
  job.status = 'processing';
  jobs.set(job.id, job);

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
        
        // Simulate image optimization
        if (job.fileType.startsWith('image/')) {
          console.log('  🎨 Optimizing image...');
          await simulateDelay(PROCESSING_DELAYS.optimize.min, PROCESSING_DELAYS.optimize.max);
          operations.push('optimize');
          
          // Simulate thumbnail generation
          console.log('  🖼️  Generating thumbnail...');
          await simulateDelay(PROCESSING_DELAYS.thumbnail.min, PROCESSING_DELAYS.thumbnail.max);
          operations.push('thumbnail');
        }
        
        // Calculate simulated results
        const optimizationLevel = randomChoice(['low', 'medium', 'high']);
        const sizeSaved = Math.floor(job.fileSize * (0.2 + Math.random() * 0.3)); // 20-50% reduction
        const thumbnailCreated = Math.random() > 0.05; // 95% success rate
        
        // Set span attributes for the processing
        span?.setAttribute('processing.operations', operations);
        span?.setAttribute('processing.optimization_level', optimizationLevel);
        span?.setAttribute('processing.thumbnail_created', thumbnailCreated);
        span?.setAttribute('processing.duration_ms', Date.now() - startTime);
        span?.setAttribute('result.size_saved_bytes', sizeSaved);
        span?.setAttribute('result.size_reduction_percent', Math.round((sizeSaved / job.fileSize) * 100));
        span?.setAttribute('result.status', 'success');
        
        // Update job with results
        job.status = 'completed';
        job.completedAt = new Date();
        job.result = {
          optimized: true,
          thumbnailCreated,
          sizeSaved
        };
        
        console.log(`✅ SnapTrace: Processing completed for ${job.fileName} (saved ${(sizeSaved / 1024).toFixed(1)}KB)`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ SnapTrace: Processing failed for ${job.fileName}:`, errorMessage);
        
        span?.setAttribute('result.status', 'failed');
        span?.setAttribute('error.message', errorMessage);
        
        // Update job with error
        job.status = 'failed';
        job.completedAt = new Date();
        job.result = {
          optimized: false,
          thumbnailCreated: false,
          error: errorMessage
        };
        
        Sentry.captureException(error);
      } finally {
        jobs.set(job.id, job);
      }
    }
  );
}

function getSizeBucket(fileSize: number): 'small' | 'medium' | 'large' {
  if (fileSize > 10 * 1024 * 1024) return 'large';
  if (fileSize > 1024 * 1024) return 'medium';
  return 'small';
}