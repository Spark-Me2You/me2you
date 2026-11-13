const REASON_MAX = 200;

/** The reason comes from the URL, so strip control characters and cap its length. */
export function sanitizeReason(raw: string | null): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = (raw ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || 'something went wrong').slice(0, REASON_MAX);
}
