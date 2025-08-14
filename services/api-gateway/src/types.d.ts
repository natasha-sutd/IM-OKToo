// Global type declarations for API Gateway
declare global {
  namespace Express {
    interface Request {
      body: any;
      query: any;
      params: any;
    }
    interface Response {
      json: (obj: any) => void;
      status: (code: number) => Response;
      redirect: (url: string) => void;
    }
  }
}

export {};
