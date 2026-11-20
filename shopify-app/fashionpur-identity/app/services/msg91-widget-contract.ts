type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" ? value as RecordValue : null;
}

/**
 * MSG91's normal Web Widget response contains the JWT in `access-token`.
 * `message` is commonly only "OTP verified successfully" and must never be
 * sent to the server as if it were a proof token.
 */
export function extractMsg91WidgetAccessToken(value: unknown): string | null {
  const response = asRecord(value);
  const nested = asRecord(response?.data);
  const candidates = [
    typeof value === "string" ? value : null,
    response?.["access-token"],
    response?.accessToken,
    response?.access_token,
    response?.token,
    nested?.["access-token"],
    nested?.accessToken,
    nested?.access_token,
    nested?.token,
    response?.message,
    nested?.message,
  ];
  return candidates.find((candidate): candidate is string =>
    typeof candidate === "string" && /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(candidate),
  ) ?? null;
}

/**
 * MSG91 documents `null` for default widgets. A custom mobile widget needs a
 * retry channel; Fashionpur's configured primary/retry channel is SMS (11).
 */
export function retryChannelForWidget(widgetData: unknown): "11" | null {
  const data = asRecord(widgetData);
  const widgetType = asRecord(data?.widgetType)?.value ?? data?.widgetType;
  return String(widgetType) === "2" ? "11" : null;
}
