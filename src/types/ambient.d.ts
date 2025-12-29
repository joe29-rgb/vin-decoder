declare module 'multer';

declare module 'pdf-parse' {
  const pdf: (data: any, options?: any) => Promise<any>;
  export default pdf;
}

declare namespace Express {
  namespace Multer {
    interface File {
      buffer: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    }
  }
}
