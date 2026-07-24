type PrismaConnectionError = {
  code?: string;
  errorCode?: string;
  message?: string;
};

const RETRYABLE_CODES = new Set(["P1001", "P1002", "P2024"]);

function isRetryablePrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const prismaError = error as PrismaConnectionError;
  const code = prismaError.code || prismaError.errorCode;
  if (code && RETRYABLE_CODES.has(code)) return true;

  const message = prismaError.message || "";
  return (
    message.includes("Can't reach database server") ||
    message.includes("Timed out fetching a new connection") ||
    message.includes("Server has closed the connection")
  );
}

export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryablePrismaConnectionError(error) || attempt === attempts) {
        throw error;
      }

      const delayMs = attempt === 1 ? 500 : 1500;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
