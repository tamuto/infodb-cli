export function substituteEnvVariables<T = any>(input: T): T {
  return recursiveSubstitute(input) as T;
}

function recursiveSubstitute(value: any): any {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
      const envValue = process.env[envVar];
      if (envValue === undefined) {
        throw new Error(`Environment variable ${envVar} is not defined`);
      }
      return envValue;
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => recursiveSubstitute(item));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = recursiveSubstitute(nested);
    }
    return result;
  }

  return value;
}
