/**
 * Convert a server-action FormData into the JSON shape the Express API
 * expects. Repeated fields (gallery items, media URLs) stay arrays.
 */
export function formDataToObject(formData: FormData): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const keys = new Set<string>();
  formData.forEach((_value, key) => keys.add(key));

  for (const key of keys) {
    const values = formData.getAll(key).map((value) =>
      typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : value.name,
    );
    result[key] = values.length > 1 ? values : (values[0] ?? '');
  }
  return result;
}
