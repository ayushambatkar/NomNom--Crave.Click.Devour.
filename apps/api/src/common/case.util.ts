// Simple deep key transform utilities between snake_case and camelCase
export function toCamelCase(input: any): any {
  if (Array.isArray(input))
    return input.map(toCamelCase);
  if (
    input &&
    typeof input === 'object' &&
    !(input instanceof Date)
  ) {
    const out: any = {};
    for (const [k, v] of Object.entries(input)) {
      const ck = k.replace(/_([a-z])/g, (_, c) =>
        c.toUpperCase(),
      );
      out[ck] = toCamelCase(v);
    }
    return out;
  }
  return input;
}

export function toSnakeCase(input: any): any {
  if (Array.isArray(input))
    return input.map(toSnakeCase);
  if (
    input &&
    typeof input === 'object' &&
    !(input instanceof Date)
  ) {
    // If this is a non-plain object with a toJSON (e.g., Prisma Decimal), use it.
    const ctor = input.constructor?.name;
    if (
      typeof input.toJSON === 'function' &&
      ctor &&
      ctor !== 'Object'
    ) {
      // Convert Prisma Decimal to number to avoid exposing internal s/e/d structure
      const json = input.toJSON();
      // If toJSON returns a stringified number, coerce to number (safe for currency with 2 dp)
      if (
        typeof json === 'string' &&
        /^-?\d+(\.\d+)?$/.test(json)
      ) {
        return Number(json);
      }
      return json;
    }

    const out: any = {};
    for (const [k, v] of Object.entries(input)) {
      const sk = k
        .replace(/([A-Z])/g, '_$1')
        .replace(/__/g, '_')
        .toLowerCase();
      out[sk] = toSnakeCase(v);
    }
    return out;
  }
  return input;
}
