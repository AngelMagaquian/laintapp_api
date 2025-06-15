export class ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
  timestamp: string;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message?: string): ApiResponse<T> {
    return new ApiResponse({
      success: true,
      data,
      message,
      statusCode: 200,
    });
  }

  static error(message: string, statusCode: number = 400): ApiResponse<null> {
    return new ApiResponse({
      success: false,
      error: message,
      statusCode,
    });
  }
} 