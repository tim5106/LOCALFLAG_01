declare global {
  namespace Express {
    interface Request {
      traceId: string;
      userId?: string;
      user?: { id: string; status: string; isDevTestUser?: boolean };
    }
  }
}

export {};

