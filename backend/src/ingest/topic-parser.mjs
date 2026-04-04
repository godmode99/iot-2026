export function parseIngestTopic(topic, expectedPrefix) {
  if (!topic) {
    return {
      ok: true,
      route: "telemetry",
      deviceIdFromTopic: null
    };
  }

  if (typeof topic !== "string") {
    return {
      ok: false,
      error: "topic_must_be_string"
    };
  }

  const parts = topic.split("/");
  const prefixParts = expectedPrefix.split("/");

  if (parts.length !== prefixParts.length + 2) {
    return {
      ok: false,
      error: "topic_shape_invalid"
    };
  }

  for (let index = 0; index < prefixParts.length; index += 1) {
    if (parts[index] !== prefixParts[index]) {
      return {
        ok: false,
        error: "topic_prefix_mismatch"
      };
    }
  }

  const deviceIdFromTopic = parts[prefixParts.length];
  const route = parts[prefixParts.length + 1];

  if (!["telemetry", "status", "command"].includes(route)) {
    return {
      ok: false,
      error: "topic_route_invalid"
    };
  }

  return {
    ok: true,
    route,
    deviceIdFromTopic
  };
}
