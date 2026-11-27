// isOk is fetch's `res.ok`. body is null when the answer is not JSON, such as the dev proxy's
// page for a stopped API.
export type ProgressResponse = { isOk: boolean; status: number; body: unknown }

// Progress is a percentage: the bar's maximum and the « Finalisation… » step too.
export const FULL_PERCENT = 100
const SUCCESS_STATUS_MIN = 200
const SUCCESS_STATUS_MAX = 299
// A 10 MB photo on a slow mobile link takes well under a minute; past two, the link is dead and
// the queue moves on instead of waiting forever.
const UPLOAD_TIMEOUT_MS = 120_000

function toResponse(request: XMLHttpRequest): ProgressResponse {
  const { status, response } = request
  const isOk = status >= SUCCESS_STATUS_MIN && status <= SUCCESS_STATUS_MAX
  return { isOk, status, body: response }
}

// XMLHttpRequest rather than fetch: only it reports how much of the body has left. A same-origin
// request sends the session cookie, as fetch does. null: the network failed, nothing came back,
// timed out, or the signal stopped it (the user logged out).
export function postWithProgress(
  url: string,
  body: FormData,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<ProgressResponse | null> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(null)
      return
    }
    const request = new XMLHttpRequest()
    request.open('POST', url)
    request.responseType = 'json'
    request.timeout = UPLOAD_TIMEOUT_MS
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * FULL_PERCENT))
      }
    }
    request.onload = () => resolve(toResponse(request))
    request.onerror = () => resolve(null)
    request.onabort = () => resolve(null)
    request.ontimeout = () => resolve(null)
    signal.addEventListener('abort', () => request.abort(), { once: true })
    request.send(body)
  })
}
