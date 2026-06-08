const store = new Map();

export function cached(key, fetcher, ttlMs = 30_000) {
  const entry = store.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return Promise.resolve(entry.data);
  return fetcher().then(res => {
    store.set(key, { data: res, ts: Date.now() });
    return res;
  });
}

export function invalidate(key) { store.delete(key); }

export function invalidatePrefix(prefix) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
