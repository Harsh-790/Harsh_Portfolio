/**
 * MongoDB ObjectIds are exactly 24 hexadecimal characters.
 */
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export function isMongoObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}