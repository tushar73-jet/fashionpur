import { getMsg91WidgetConfig } from "../services/msg91-widget.server";
import { isAllowedStorefrontOrigin, options, response } from "../services/storefront-api.server";

/** Returns only MSG91's browser Widget configuration to the approved storefront origin. */
export async function loader({ request }: { request: Request }) {
  if (request.method === "OPTIONS") return options(request);
  if (request.method !== "GET") return response(request, { error: "Method not allowed." }, 405);
  if (!isAllowedStorefrontOrigin(request)) return response(request, { error: "Storefront origin is not allowed." }, 403);
  try {
    return response(request, getMsg91WidgetConfig());
  } catch (error) {
    return response(request, { error: error instanceof Error ? error.message : "OTP is unavailable." }, 503);
  }
}
