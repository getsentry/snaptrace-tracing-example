# Build a beautiful sample Media Upload app (photo gallery) with Sentry span metrics (React + Node + Worker)

Goal
- Demonstrate upload UX on the client and async processing on the backend worker with end-to-end tracing.
- Use single-span examples that are easy to copy/paste and customize.
- Avoid nested spans. Rely on auto-instrumentation for network/DB/etc.

Tech stack
- Frontend: React (Vite or CRA)
- Backend API: Node.js + Express
- Worker: Node.js script to simulate background processing
- Simple in-memory queue (or event emitter) to pass jobs (with trace context)
- Sentry JavaScript SDK for React and Node

Functional requirements
- File input that lets a user choose a file and click “Upload”
- Backend:
  - `POST /api/uploads/signed-url` returns a mock signed URL + object key
  - `POST /api/uploads/start-processing` enqueues a job (include trace context in payload)
- Worker:
  - Listens for jobs, simulates scan/transcode/thumbnail with delays
  - Marks job done

Sentry instrumentation requirements (single-span patterns)
- Frontend:
  - When upload begins, start a single span:
    - name: "Upload media"
    - op: "file.upload"
    - attributes at start: `file.size_bytes` (int), `file.mime_type` (string)
  - Upload via returned signed URL (PUT) and then call `start-processing`
  - On completion, set attributes: `upload.success` (bool), `upload.duration_ms` (int)
- Backend (API):
  - `POST /api/uploads/signed-url`: single span with name "Signed URL", op "storage.sign", set `storage.provider`, `storage.bucket`
  - `POST /api/uploads/start-processing`: single span with name "Enqueue media job", op "queue.enqueue", set `queue.name` and include trace metadata on the job
- Worker:
  - For each job, start a single span with name "Process media", op "worker.job" and parent context from job payload
  - Set attributes summarizing work: `scan.engine` (enum), `transcode.preset` (enum), `thumbnail.created` (bool)
  - Do not create child spans in the example; rely on auto-instrumentation for any internal calls

Attribute guidance
- Low-cardinality only. No filenames, no user identifiers, no PII.
- Use enums/booleans/number buckets for attributes.

Deliverables
- `frontend/` React app with a simple upload form; Sentry init with `tracesSampleRate: 1.0` in dev
- `backend/` Express app implementing both endpoints; Sentry init with tracing
- `worker/` Node script consuming in-memory queue and processing jobs, with Sentry initialized
- Shared lightweight queue (e.g., a Node EventEmitter or minimal in-memory queue)
- README with setup and run steps for all three processes

Config and env
- `.env` for frontend and backend with DSNs
- Trace propagation metadata: include Sentry propagation context in the job message payload to stitch traces

User journey and data flow
1) User selects a file and clicks Upload
2) Frontend starts "Upload media" span and calls `/api/uploads/signed-url`
3) Frontend uploads file to mock signed URL (PUT)
4) Frontend calls `/api/uploads/start-processing` with `objectKey`
5) API enqueues a job with the current trace context
6) Worker starts a span (linked via parent) and simulates scan/transcode/thumbnail
7) Frontend span finishes; worker span separately completes

Success criteria (trace + span metrics)
- Frontend span shows upload duration and success flag
- API spans show storage signing and enqueue operations
- Worker span shows processing attributes
- Example queries:
  - p90 duration of `op:file.upload` by file size bucket
  - Failure counts for processing by `scan.engine`
  - Time-to-ready proxy by aggregating worker spans filtered on `transcode.preset`

Non-functional requirements
- Keep the example concise; minimal code and zero PII
- Single-span per action/handler; no nesting in example code
- Rely on auto-instrumentation to fill in details

Testing plan
- Upload multiple files of different sizes
- Confirm spans/attributes in Sentry for frontend, API, and worker
- Run suggested span-metrics queries

README checklist
- How to run frontend, backend, and worker together
- Where the spans are created and where attributes are set
- How to tweak delays/failure rates for demos
