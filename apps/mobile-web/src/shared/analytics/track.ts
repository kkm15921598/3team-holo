const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type UtmKey = (typeof UTM_KEYS)[number];

export type EventName =
  | "signup_step_view"
  | "signup_complete"
  | "page_view";

export type EventProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    __holoEvents?: Array<{ name: EventName; props: EventProps; ts: number }>;
  }
}

export function captureUtmFromUrl() {
  const params = new URLSearchParams(window.location.search);
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) localStorage.setItem(key, value);
  }
  if (!localStorage.getItem("first_seen_at")) {
    localStorage.setItem("first_seen_at", new Date().toISOString());
  }
}

export function readUtm(): Partial<Record<UtmKey, string>> {
  const out: Partial<Record<UtmKey, string>> = {};
  for (const key of UTM_KEYS) {
    const v = localStorage.getItem(key);
    if (v) out[key] = v;
  }
  return out;
}

export function track(name: EventName, props: EventProps = {}) {
  const enriched: EventProps = { ...readUtm(), ...props };
  const event = { name, props: enriched, ts: Date.now() };

  if (typeof window !== "undefined") {
    window.__holoEvents ??= [];
    window.__holoEvents.push(event);
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[track]", name, enriched);
  }

  // TODO: GA4 / PostHog 어댑터를 여기서 호출 (provider-agnostic)
}
