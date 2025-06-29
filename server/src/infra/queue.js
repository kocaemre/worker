// Placeholder for future job queue implementation (e.g., BullMQ/Redis).
// Exporting noop enqueue function keeps API stable.

/**
 * Enqueue background task (no-op for now).
 * @param {string} name
 * @param {any} payload
 */
export const enqueue = async (name, payload) => {
  // eslint-disable-next-line no-unused-vars
  return Promise.resolve();
}; 