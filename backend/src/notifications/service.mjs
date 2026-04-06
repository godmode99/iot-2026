import { getBackendConfig } from "../config.mjs";
import { getFarmNotificationTargets, insertNotificationLog } from "./repository.mjs";

const config = getBackendConfig();

function nowIso() {
  return new Date().toISOString();
}

function resolveNotificationTargets(entry, farmTargets) {
  return {
    email: farmTargets?.alertEmailTo ?? config.alertEmailTo ?? null,
    emailSource: farmTargets?.alertEmailTo ? "farm" : (config.alertEmailTo ? "env" : "none"),
    lineUserId: farmTargets?.alertLineUserId ?? config.alertLineUserId ?? null,
    lineSource: farmTargets?.alertLineUserId ? "farm" : (config.alertLineUserId ? "env" : "none")
  };
}

async function sendStub(entry, targets) {
  console.log("[notify:stub]", {
    channel: "stub",
    eventType: entry.eventType,
    alertType: entry.alertType,
    deviceId: entry.device?.device_id ?? null,
    severity: entry.severity,
    recipient: targets.email ?? targets.lineUserId ?? "console",
    at: nowIso()
  });

  return {
    channel: "stub",
    deliveryStatus: "sent",
    recipient: targets.email ?? targets.lineUserId ?? "console",
    payload: {
      mode: "stub",
      recipientSource: targets.email ? targets.emailSource : targets.lineSource
    },
    sentAt: nowIso()
  };
}

async function sendResend(entry, targets, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  if (!config.resendApiKey || !targets.email) {
    return {
      channel: "email",
      deliveryStatus: "skipped",
      recipient: targets.email ?? null,
      payload: {
        reason: !config.resendApiKey ? "resend_api_key_missing" : "email_recipient_missing",
        recipientSource: targets.emailSource
      },
      sentAt: null
    };
  }

  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.resendApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: "alerts@sb00.local",
      to: [targets.email],
      subject: `[SB-00] ${entry.alertType} ${entry.action}`,
      text: `${entry.device?.device_id ?? "unknown-device"} ${entry.alertType} ${entry.action} (${entry.severity})`
    })
  });

  if (!response.ok) {
    return {
      channel: "email",
      deliveryStatus: "failed",
      recipient: targets.email,
      payload: {
        reason: "resend_failed",
        status: response.status,
        recipientSource: targets.emailSource
      },
      sentAt: null
    };
  }

  return {
    channel: "email",
    deliveryStatus: "sent",
    recipient: targets.email,
    payload: {
      provider: "resend",
      recipientSource: targets.emailSource
    },
    sentAt: nowIso()
  };
}

async function sendLine(entry, targets, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  if (!config.lineChannelAccessToken || !targets.lineUserId) {
    return {
      channel: "line",
      deliveryStatus: "skipped",
      recipient: targets.lineUserId ?? null,
      payload: {
        reason: !config.lineChannelAccessToken ? "line_access_token_missing" : "line_recipient_missing",
        recipientSource: targets.lineSource
      },
      sentAt: null
    };
  }

  const response = await fetchImpl("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.lineChannelAccessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      to: targets.lineUserId,
      messages: [
        {
          type: "text",
          text: `[SB-00] ${entry.device?.device_id ?? "unknown-device"} ${entry.alertType} ${entry.action} (${entry.severity})`
        }
      ]
    })
  });

  if (!response.ok) {
    return {
      channel: "line",
      deliveryStatus: "failed",
      recipient: targets.lineUserId,
      payload: {
        reason: "line_push_failed",
        status: response.status,
        recipientSource: targets.lineSource
      },
      sentAt: null
    };
  }

  return {
    channel: "line",
    deliveryStatus: "sent",
    recipient: targets.lineUserId,
    payload: {
      provider: "line_push",
      recipientSource: targets.lineSource
    },
    sentAt: nowIso()
  };
}

export async function dispatchAlertNotification(entry, dependencies = {}) {
  const logNotification = dependencies.logNotification ?? insertNotificationLog;
  const loadFarmTargets = dependencies.getFarmTargets ?? getFarmNotificationTargets;
  const farmTargets = await loadFarmTargets(entry.device?.farm_id ?? null);
  const targets = resolveNotificationTargets(entry, farmTargets);

  let outcome;
  if (config.notificationMode === "resend") {
    outcome = await sendResend(entry, targets, dependencies);
  } else if (config.notificationMode === "line") {
    outcome = await sendLine(entry, targets, dependencies);
  } else {
    outcome = await sendStub(entry, targets);
  }

  const logEntry = await logNotification({
    farmId: entry.device?.farm_id ?? null,
    deviceId: entry.device?.id ?? null,
    alertId: entry.alertId ?? null,
    channel: outcome.channel,
    eventType: `${entry.alertType}.${entry.action}`,
    deliveryStatus: outcome.deliveryStatus,
    recipient: outcome.recipient,
    payload: {
      alertType: entry.alertType,
      action: entry.action,
      severity: entry.severity,
      farmTargetResolved: Boolean(farmTargets?.alertEmailTo || farmTargets?.alertLineUserId),
      ...outcome.payload
    },
    sentAt: outcome.sentAt
  });

  return {
    ...outcome,
    logEntry
  };
}
