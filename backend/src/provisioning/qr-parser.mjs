export function parseProvisioningQr(input) {
  if (typeof input !== "string" || input.trim() === "") {
    return {
      ok: false,
      code: "qr_missing",
      details: ["Provide qr or device_id"]
    };
  }

  const raw = input.trim();

  if (/^[a-z0-9-]+$/i.test(raw) && raw.startsWith("sb00-")) {
    return {
      ok: true,
      deviceId: raw
    };
  }

  try {
    const url = new URL(raw);
    const deviceId = url.searchParams.get("device_id") ?? url.searchParams.get("d");
    if (deviceId) {
      return {
        ok: true,
        deviceId: deviceId.trim()
      };
    }
  } catch {
    // Not a URL. Continue to fallback parsers.
  }

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.device_id === "string" && parsed.device_id.trim() !== "") {
        return {
          ok: true,
          deviceId: parsed.device_id.trim()
        };
      }
    } catch {
      return {
        ok: false,
        code: "qr_invalid_json",
        details: ["QR payload JSON could not be parsed"]
      };
    }
  }

  if (raw.includes("device_id=")) {
    const params = new URLSearchParams(raw);
    const deviceId = params.get("device_id");
    if (deviceId) {
      return {
        ok: true,
        deviceId: deviceId.trim()
      };
    }
  }

  return {
    ok: false,
    code: "qr_invalid",
    details: ["Unsupported QR payload format"]
  };
}
