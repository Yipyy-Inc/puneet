// ============================================================================
// A multipart upload that reports how far it has got.
//
// §5t's dropzone shows an upload as a file row with a DETERMINATE bar, and
// `fetch` cannot report upload progress — so this is XMLHttpRequest, the one
// browser API that can. It answers like a fetch the caller then reads: the
// status and the parsed JSON body, with a network failure or an abort thrown.
// ============================================================================

export interface UploadAnswer<T> {
  status: number;
  body: T | null;
}

export function uploadWithProgress<T>(
  url: string,
  form: FormData,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<UploadAnswer<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(1, event.loaded / event.total));
      }
    };
    xhr.onload = () => {
      let body: T | null = null;
      try {
        body = xhr.responseText ? (JSON.parse(xhr.responseText) as T) : null;
      } catch {
        body = null;
      }
      onProgress(1);
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () =>
      reject(new Error("The upload did not reach the server."));
    xhr.onabort = () =>
      reject(new DOMException("The upload was stopped.", "AbortError"));

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("The upload was stopped.", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(form);
  });
}
