function hasKey(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeTimestamp(value) {
  if (typeof value === "number") {
    if (value > 1_000_000_000_000) {
      return new Date(value);
    }
    return new Date(value * 1000);
  }

  if (typeof value === "string") {
    if (/^\d+$/.test(value)) {
      return normalizeTimestamp(Number(value));
    }

    return new Date(value);
  }

  return new Date(Number.NaN);
}

function normalizeGpsFixState(value) {
  if (typeof value !== "string" || !value) {
    return "none";
  }

  const normalized = value.toLowerCase();
  if (["3d", "fix", "fixed"].includes(normalized)) {
    return "3d";
  }

  if (normalized === "2d") {
    return "2d";
  }

  return "none";
}

export function validateTelemetryEnvelope(input, expectedTopicPrefix) {
  const payload = input?.payload ?? input;
  const topic = input?.topic ?? null;
  const errors = [];
  const requiredKeys = [
    "device_id",
    "timestamp",
    "temperature_c",
    "turbidity_raw",
    "battery_percent",
    "battery_mv",
    "lat",
    "lng"
  ];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      errors: ["payload_must_be_object"]
    };
  }

  for (const key of requiredKeys) {
    if (!hasKey(payload, key)) {
      errors.push(`missing_${key}`);
    }
  }

  const timestamp = normalizeTimestamp(payload.timestamp);
  if (Number.isNaN(timestamp.getTime())) {
    errors.push("invalid_timestamp");
  }

  const temperatureC = normalizeNumber(payload.temperature_c);
  const turbidityRaw = normalizeNumber(payload.turbidity_raw);
  const batteryPercent = normalizeNumber(payload.battery_percent);
  const batteryMv = normalizeNumber(payload.battery_mv);
  const lat = normalizeNumber(payload.lat);
  const lng = normalizeNumber(payload.lng);
  const signalQuality = normalizeNumber(payload.signal_quality);

  for (const [name, value] of [
    ["temperature_c", temperatureC],
    ["turbidity_raw", turbidityRaw],
    ["battery_percent", batteryPercent],
    ["battery_mv", batteryMv],
    ["lat", lat],
    ["lng", lng],
    ["signal_quality", signalQuality]
  ]) {
    if (Number.isNaN(value)) {
      errors.push(`invalid_${name}`);
    }
  }

  if ((lat === null) !== (lng === null)) {
    errors.push("lat_lng_pair_invalid");
  }

  if (batteryPercent !== null && (batteryPercent < 0 || batteryPercent > 100)) {
    errors.push("battery_percent_out_of_range");
  }

  if (batteryMv !== null && batteryMv <= 0) {
    errors.push("battery_mv_out_of_range");
  }

  if (typeof payload.device_id !== "string" || payload.device_id.trim() === "") {
    errors.push("invalid_device_id");
  }

  if (topic && typeof topic === "string" && expectedTopicPrefix && !topic.startsWith(expectedTopicPrefix)) {
    errors.push("topic_prefix_mismatch");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    normalized: {
      deviceId: payload.device_id.trim(),
      recordedAt: timestamp.toISOString(),
      temperatureC,
      turbidityRaw,
      batteryPercent,
      batteryMv,
      lat,
      lng,
      firmwareVersion: typeof payload.firmware_version === "string" ? payload.firmware_version : null,
      signalQuality,
      gpsFixState: normalizeGpsFixState(payload.gps_fix_state),
      batteryVariant: typeof payload.battery_variant === "string" ? payload.battery_variant : null,
      rawPayload: payload,
      topic
    }
  };
}
