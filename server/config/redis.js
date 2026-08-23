// Base connection, used by the Worker: a long-running background process
// that should keep retrying and buffering across a Redis outage rather
// than give up. maxRetriesPerRequest: null is required by BullMQ's Worker
// for its blocking commands - see
// https://docs.bullmq.io/guide/going-to-production#maxretriesperrequest
const redisConnection = {
  url: process.env.REDIS_URL,
  maxRetriesPerRequest: null
};

// The Queue (producer) is constructed from inside HTTP request handlers,
// where buffering/retrying would hang the request itself rather than the
// connection recovering unnoticed. Bound every knob that could otherwise
// retry forever so a dead Redis fails an enqueue call within ~5s instead
// of hanging it indefinitely - queues/email.queue.js never lets that
// failure block the caller's actual response either way.
export const producerConnection = {
  url: process.env.REDIS_URL,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  retryStrategy: () => null
};

export default redisConnection;
