# Notification System Design
# Stage 1

## Core Actions
- View all notifications
- View only unread notifications
- Mark a single notification as read
- Mark all notifications as read
- Delete a notification
- Receive new notifications in real-time

## REST API Endpoints

### 1. Get all notifications
**GET** `/notifications`

Query param `status=unread` returns only unread notifications.

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "f1a2-...",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "isRead": false,
      "createdAt": "2026-06-23T10:15:30Z"
    }
  ]
}
```

### 2. Mark one notification as read
**PATCH** `/notifications/{id}/read`

**Response (200):**
```json
{
  "id": "f1a2-...",
  "isRead": true,
  "message": "Notification marked as read"
}
```

### 3. Mark all notifications as read
**PATCH** `/notifications/read-all`

**Response (200):**
```json
{
  "updatedCount": 12,
  "message": "All notifications marked as read"
}
```

### 4. Delete a notification
**DELETE** `/notifications/{id}`

**Response (200):**
```json
{
  "id": "f1a2-...",
  "message": "Notification deleted"
}
```

## Real-Time Notification Mechanism

Chosen approach: **Server-Sent Events (SSE)**

**Reasoning:** Notifications only flow server → client; the client never needs to push real-time data back. SSE is simpler to implement than WebSockets and is sufficient for one-directional push use cases like this. WebSockets would be the right choice only if bidirectional real-time communication were needed.

**Endpoint:**
**GET** `/notifications/stream`

**Headers:**
# Stage 2

## Database Choice: PostgreSQL (Relational/SQL)

**Reasoning:** Notifications have a fixed, predictable structure (id, type, message, read status, timestamp) and we need to filter/sort reliably (e.g., unread notifications, sorted by date). A relational DB handles this well with strong consistency.

## Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  student_id INT NOT NULL,
  notification_type VARCHAR(20) NOT NULL, -- 'Placement', 'Event', 'Result'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Scaling Problem
As students and notifications grow (e.g. 50,000 students, millions of rows), queries filtering by `student_id` or `is_read` become slow without help.

**Solution:** Add an index on frequently filtered columns:
```sql
CREATE INDEX idx_student_unread ON notifications(student_id, is_read);
```

## Sample Queries

Get unread notifications for a student:
```sql
SELECT * FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC;
```

Mark all as read:
```sql
UPDATE notifications
SET is_read = true
WHERE student_id = 1042;
```
# Stage 3

## Is the query accurate?
Yes, functionally correct — but slow at scale.

## Why is it slow?
With 5,000,000 rows and no index, the database scans the **entire table** every time (a "full table scan") to find matching rows, instead of jumping straight to them.

## Fix
Add a composite index matching the query's filter + sort columns:
```sql
CREATE INDEX idx_student_read_created ON notifications(studentID, isRead, createdAt DESC);
```
This lets the database find matching rows directly and retrieve them already sorted, instead of scanning everything.

## Is "add an index on every column" good advice?
No. Indexes speed up reads but slow down writes (every INSERT/UPDATE must also update every index), and consume extra storage. Indexes should only be added on columns actually used in WHERE/ORDER BY clauses — not blindly on everything.

## Query: Placement notifications in the last 7 days
```sql
SELECT * FROM notifications
WHERE notificationType = 'Placement'
AND createdAt >= NOW() - INTERVAL '7 days'
ORDER BY createdAt DESC;
```
# Stage 4

## Problem
Fetching notifications from the DB on every page load, for every student, overwhelms the database under load.

## Solution: Caching
Use an in-memory cache (e.g., Redis) to store each student's recent notifications. On page load, check the cache first; only query the DB on a cache miss.

**Flow:**
1. Request comes in for student's notifications
2. Check Redis cache for that student's data
3. If found (cache hit) → return immediately, no DB hit
4. If not found (cache miss) → query DB, store result in cache, return it
5. When a new notification is created, invalidate (clear) that student's cache entry so the next fetch refreshes it

## Tradeoffs
- **Pro:** Drastically reduces DB load, faster responses
- **Con:** Risk of slightly stale data if not invalidated promptly; added complexity of keeping cache in sync with DB
# Stage 5

## Shortcomings of the original implementation
1. **No error handling** — if `send_email` fails, the loop doesn't catch it; the doc states 200 students' emails failed midway with no record or retry.
2. **Sequential processing** — handling 50,000 students one at a time is slow.
3. **Tightly coupled steps** — email, DB save, and push are bundled together per student; one failing shouldn't block the others.

## Should DB save and email sending happen together?
No. They should be decoupled. DB save (the source of truth) should happen first and reliably; email/push delivery should be handled separately, asynchronously, with retry logic — a failed email shouldn't mean the notification didn't "happen."

## Redesigned approach
1. Save all notifications to DB first (fast, reliable, batched)
2. Push each notification onto a message queue (e.g., RabbitMQ/SQS)
3. Separate worker processes consume the queue, sending emails and push notifications independently, with retries on failure
4. Failed deliveries are logged and retried, without blocking other students

## Revised pseudocode
```
function notify_all(student_ids, message):
    for student_id in student_ids:
        save_to_db(student_id, message)
        queue.push({student_id, message})

function email_worker():
    for job in queue.consume():
        try:
            send_email(job.student_id, job.message)
        except:
            retry_queue.push(job)
```
# Stage 6

## Approach: Min-Heap of size N
priority_score = type_weight + recency_score

To efficiently maintain the top N priority notifications as new ones continuously arrive, a min-heap of fixed size N is used.

**Priority calculation:**
- type_weight: Placement = 30, Result = 20, Event = 10
- recency_score: derived from timestamp, so newer notifications score slightly higher within the same type

**How new notifications are handled:**
- If the heap has fewer than N items, the new notification is simply added.
- If the heap is full, the new notification's priority is compared to the heap's minimum (the least important of the current top N). If it's higher, the minimum is removed and the new one is inserted.
- If it's lower, the new notification is discarded from the top-N view (it still exists in the full notification list, just not in the priority inbox).

**Why this is efficient:**
Each insertion/removal operation on a heap costs O(log N). Since N is fixed and small (e.g., 10), this is effectively constant time, even as thousands of new notifications stream in — far better than re-sorting the entire notification list on every new arrival.

**Submission includes:** `priority_inbox.js` (working code) and output screenshot showing the top 10 notifications, both pushed to the same GitHub repository.