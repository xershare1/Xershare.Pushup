import { HttpError } from '../api/httpError'

export function formatError(error: unknown): string {
  if (error instanceof HttpError) {
    return error.message.trim() || `Request failed (${error.status})`
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Something went wrong.'
}
