class MinHeap {
  constructor() {
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0];
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  popMin() {
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return min;
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[parent].priority <= this.heap[idx].priority) break;
      [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
      idx = parent;
    }
  }

  _bubbleDown(idx) {
    const n = this.heap.length;
    while (true) {
      let left = 2 * idx + 1, right = 2 * idx + 2, smallest = idx;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < n && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === idx) break;
      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}

const TYPE_WEIGHT = { Placement: 30, Result: 20, Event: 10 };

function calculatePriority(notification) {
  const typeScore = TYPE_WEIGHT[notification.Type] || 0;
  const recencyScore = new Date(notification.Timestamp).getTime() / 1e10; // scaled down
  return typeScore + recencyScore;
}

class PriorityInbox {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.heap = new MinHeap();
  }

  addNotification(notification) {
    const priority = calculatePriority(notification);
    const item = { ...notification, priority };

    if (this.heap.size() < this.maxSize) {
      this.heap.push(item);
    } else if (priority > this.heap.peek().priority) {
      this.heap.popMin();
      this.heap.push(item);
    }
    // else: not important enough to make the top N, ignore
  }

  getTopN() {
    return [...this.heap.heap].sort((a, b) => b.priority - a.priority);
  }
}

// --- Demo usage ---
const inbox = new PriorityInbox(10);

const sampleNotifications = [
  { ID: "1", Type: "Placement", Message: "CSX Corporation hiring", Timestamp: "2026-04-22 17:51:18" },
  { ID: "2", Type: "Event", Message: "farewell", Timestamp: "2026-04-22 17:51:06" },
  { ID: "3", Type: "Result", Message: "mid-sem", Timestamp: "2026-04-22 17:50:54" },
  // add more sample notifications here to test with >10 items
];

sampleNotifications.forEach(n => inbox.addNotification(n));

console.log("Top notifications:");
console.log(inbox.getTopN());