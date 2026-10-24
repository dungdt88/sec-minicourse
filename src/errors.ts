// Uncaught errors go to the mentor console's error log (NFR-12), never to a third-party service.
// Only the message and where it happened are sent, never form content.
import { playerApi } from './api';

let sent = 0;

export function installErrorReporting() {
  const report = (message: string, source: string) => {
    if (sent++ > 20) return; // one bad page should not flood the log
    void playerApi()
      .then((api) => api.reportError(null, message.slice(0, 300), { source, path: location.pathname, ua: navigator.userAgent.slice(0, 160) }))
      .catch(() => {});
  };
  window.addEventListener('error', (e) => report(e.message, `${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => report(String((e.reason as Error)?.message ?? e.reason), 'promise'));
}
