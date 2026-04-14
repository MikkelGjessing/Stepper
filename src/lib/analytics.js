/**
 * Analytics module for Stepper
 *
 * Sends usage events to the configured Surdej Stepper analytics endpoint.
 * Analytics NEVER blocks normal extension functionality — all errors are
 * swallowed silently so that a failing endpoint cannot affect the UX.
 *
 * Usage:
 *   Analytics.init(settings);           // call after loading settings
 *   Analytics.track('event_type', { key: 'value' });
 */
const Analytics = (() => {
  let _baseUrl = 'http://localhost:5001';
  let _enabled = false;
  let _queue = [];
  let _flushTimer = null;

  const FLUSH_DELAY_MS = 2000;
  const MAX_BATCH_SIZE = 20;

  /**
   * Initialize (or re-initialize) analytics with the current extension settings.
   * Must be called once after settings are loaded so the module knows where to
   * send events.
   * @param {Object} settings - Extension settings object from Storage.getSettings()
   */
  function init(settings) {
    _enabled = !!(settings && settings.enableAnalytics);
    _baseUrl = (settings && settings.analyticsBaseUrl) || 'http://localhost:5001';
  }

  /**
   * Queue an analytics event for delivery.
   * Returns immediately; delivery is asynchronous and best-effort.
   * @param {string} eventType - Short identifier for the event (e.g. 'case_start')
   * @param {Object} [payload] - Optional key/value pairs to attach to the event
   */
  function track(eventType, payload) {
    if (!_enabled) return;
    try {
      const event = { eventType, timestamp: new Date().toISOString() };
      if (payload && typeof payload === 'object' && Object.keys(payload).length > 0) {
        event.payload = payload;
      }
      _queue.push(event);
      if (_queue.length >= MAX_BATCH_SIZE) {
        _flush();
      } else {
        _scheduleFlush();
      }
    } catch (_) {
      // Never propagate errors from analytics
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  function _scheduleFlush() {
    if (_flushTimer !== null) return;
    _flushTimer = setTimeout(() => {
      _flushTimer = null;
      _flush();
    }, FLUSH_DELAY_MS);
  }

  function _flush() {
    if (_queue.length === 0) return;
    if (!_baseUrl) return;
    const batch = _queue.splice(0); // drain queue atomically before the async call
    try {
      fetch(`${_baseUrl}/api/module/member-stepper/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true
      }).catch(() => {
        // Silently discard network / CORS errors
      });
    } catch (_) {
      // Never propagate errors from analytics
    }
  }

  return { init, track };
})();

// Expose globally so popup.js and options.js can use it without module bundling
if (typeof window !== 'undefined') {
  window.Analytics = Analytics;
}
