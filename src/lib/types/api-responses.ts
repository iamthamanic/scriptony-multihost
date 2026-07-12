/**
 * API response wrapper types.
 */

export interface ListResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export interface SingleResponse<T> {
  item: T;
}

export interface CreateResponse<T> {
  item: T;
  message?: string;
}

export interface UpdateResponse<T> {
  item: T;
  message?: string;
}

export interface DeleteResponse {
  success: boolean;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  details?: any;
  code?: string;
}
