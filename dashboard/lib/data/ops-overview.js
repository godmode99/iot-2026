import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const EMPTY_OPS_OVERVIEW = {
  authorized: false,
  reportWindow: "30d",
  farms: [],
  devices: [],
  openAlerts: [],
  recentCommands: [],
  metrics: {
    farmCount: 0,
    deviceCount: 0,
    onlineCount: 0,
    attentionCount: 0,
    criticalAlertCount: 0,
    missingContactCount: 0,
    farmsWithDeliveryCoverage: 0,
    missingHandoffCount: 0,
    expectationRecoveredCount: 0
  },
  alertMetrics: {
    bySource: {
      record: 0,
      telemetry: 0,
      expectation: 0,
      system: 0
    },
    topTypes: []
  },
  telemetryPressure: {
    warmFarmCount: 0,
    lowBatteryFarmCount: 0,
    criticalHeatFarmCount: 0,
    byFarm: []
  },
  telemetryOutcomeTrends: {
    byOutcome: {
      alert_follow_up: 0,
      record_follow_up: 0,
      handoff_follow_up: 0
    },
    byFarm: []
  },
  expectationMetrics: {
    currentCount: 0,
    attentionCount: 0,
    recoveredCount: 0
  },
  expectationTrends: {
    byFarm: [],
    byTemplate: []
  },
  followUpQueue: [],
  reports: {
    disciplineByFarm: [],
    alertPressureByFarm: []
  },
  notificationCoverage: {
    byFarm: [],
    emailEnabledFarmCount: 0,
    lineEnabledFarmCount: 0
  },
  notificationDispatch: {
    readyCount: 0,
    coverageMissingCount: 0,
    followUpFirstCount: 0,
    items: []
  },
  errors: []
};

function normalizeReportWindow(value) {
  if (value === "7d" || value === "90d") {
    return value;
  }

  return "30d";
}

function normalizeSeverityFilter(value) {
  return value === "critical" || value === "warning" ? value : "all";
}

function normalizeSourceFilter(value) {
  return value === "record" || value === "telemetry" || value === "expectation" || value === "system"
    ? value
    : "all";
}

function windowDays(windowValue) {
  if (windowValue === "7d") {
    return 7;
  }

  if (windowValue === "90d") {
    return 90;
  }

  return 30;
}

function listResult(name, result) {
  if (result.error) {
    return {
      data: [],
      error: `${name}: ${result.error.message}`
    };
  }

  return {
    data: result.data ?? [],
    error: null
  };
}

function mergeDeviceStatus(devices, statuses) {
  const byDeviceId = new Map(statuses.map((status) => [status.device_id, status]));
  return devices.map((device) => ({
    ...device,
    status: byDeviceId.get(device.id) ?? null
  }));
}

function toDateValue(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value) {
  const target = toDateValue(value);
  if (!target) {
    return null;
  }

  return Math.floor((Date.now() - target.getTime()) / (1000 * 60 * 60 * 24));
}

function normalizeAlertSource(value) {
  if (value === "record_detail") {
    return "record";
  }

  if (value === "device_telemetry") {
    return "telemetry";
  }

  if (value === "record_expectation") {
    return "expectation";
  }

  return "system";
}

function normalizeAlert(alert) {
  return {
    ...alert,
    source: alert?.details_json?.source ?? "system",
    sourceLabel: normalizeAlertSource(alert?.details_json?.source)
  };
}

function average(values = []) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isTemplateAvailableForFarm(template, farmId) {
  if (!template || template.is_active === false) {
    return false;
  }

  if (template.scope_type === "organization") {
    return false;
  }

  if (template.scope_type !== "farm") {
    return true;
  }

  const assignedFarmIds = template.assigned_farm_ids ?? [];
  if (!assignedFarmIds.length) {
    return true;
  }

  return assignedFarmIds.includes(farmId);
}

function buildExpectationSummary({ farms = [], templates = [], records = [], resolvedAlerts = [] }) {
  const farmSummaries = farms.map((farm) => {
    const availableTemplates = templates.filter((template) => isTemplateAvailableForFarm(template, farm.id));
    const farmRecords = records.filter((record) => record.farm_id === farm.id);
    const expectations = availableTemplates.map((template) => {
      const matchingRecords = farmRecords.filter((record) => {
        const recordTemplate = Array.isArray(record.record_templates) ? record.record_templates[0] ?? null : record.record_templates ?? null;
        return recordTemplate?.code === template.code;
      });
      const latestRecord = matchingRecords[0] ?? null;
      const latestRecordedFor = latestRecord?.recorded_for_date ?? latestRecord?.created_at ?? null;
      const latestAgeDays = daysSince(latestRecordedFor);
      const status = latestRecord && latestAgeDays !== null && latestAgeDays <= 7 ? "current" : "attention";

      return {
        templateCode: template.code,
        templateName: template.name,
        status
      };
    });

    return {
      farmId: farm.id,
      farmName: farm.name,
      currentCount: expectations.filter((item) => item.status === "current").length,
      attentionCount: expectations.filter((item) => item.status === "attention").length
    };
  });

  return {
    currentCount: farmSummaries.reduce((sum, farm) => sum + farm.currentCount, 0),
    attentionCount: farmSummaries.reduce((sum, farm) => sum + farm.attentionCount, 0),
    recoveredCount: resolvedAlerts.length
  };
}

function buildExpectationTrends({ alerts = [], farms = [] }) {
  const farmNameMap = new Map(farms.map((farm) => [farm.id, farm.name]));

  const byFarm = Object.values(
    alerts.reduce((accumulator, alert) => {
      const farmId = alert.farm_id ?? "unknown";
      const key = String(farmId);
      const current = accumulator[key] ?? {
        farmId,
        farmName: farmNameMap.get(farmId) ?? "Unknown farm",
        count: 0
      };
      current.count += 1;
      accumulator[key] = current;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const byTemplate = Object.values(
    alerts.reduce((accumulator, alert) => {
      const templateCode = alert.details_json?.source_template_code ?? "unknown_template";
      const templateName = alert.details_json?.source_template_name ?? templateCode;
      const current = accumulator[templateCode] ?? {
        templateCode,
        templateName,
        count: 0
      };
      current.count += 1;
      accumulator[templateCode] = current;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  return {
    byFarm,
    byTemplate
  };
}

function handoffAgeDays(value) {
  return daysSince(value);
}

function buildReportRows({
  farms = [],
  devices = [],
  openAlerts = [],
  templates = [],
  records = [],
  expectationHistory = [],
  resolvedExpectationAlerts = [],
  latestHandoffByFarmId = new Map(),
  reportWindowDays = 30
}) {
  const rows = farms.map((farm) => {
    const farmDevices = devices.filter((device) => device.farm_id === farm.id);
    const farmAlerts = openAlerts.filter((alert) => alert.farm_id === farm.id);
    const farmRecords = records.filter((record) => record.farm_id === farm.id);
    const farmTemplates = templates.filter((template) => isTemplateAvailableForFarm(template, farm.id));
    const farmExpectationAlerts = expectationHistory.filter((alert) => alert.farm_id === farm.id);
    const farmRecoveredExpectationAlerts = resolvedExpectationAlerts.filter((alert) => {
      const templateCode = alert.details_json?.source_template_code;
      return farmTemplates.some((template) => template.code === templateCode);
    });
    const currentTemplateCount = farmTemplates.filter((template) => {
      const matchingRecords = farmRecords.filter((record) => {
        const recordTemplate = Array.isArray(record.record_templates) ? record.record_templates[0] ?? null : record.record_templates ?? null;
        const latestRecordedFor = record?.recorded_for_date ?? record?.created_at ?? null;
        return recordTemplate?.code === template.code && daysSince(latestRecordedFor) !== null && daysSince(latestRecordedFor) <= 7;
      });

      return matchingRecords.length > 0;
    }).length;

    return {
      farmId: farm.id,
      farmName: farm.name,
      activeTemplates: farmTemplates.length,
      currentTemplates: currentTemplateCount,
      attentionTemplates: Math.max(farmTemplates.length - currentTemplateCount, 0),
      recordsInWindow: farmRecords.filter((record) => {
        const target = toDateValue(record.recorded_for_date ?? record.created_at);
        return target ? target.getTime() >= Date.now() - reportWindowDays * 24 * 60 * 60 * 1000 : false;
      }).length,
      expectationAlertsInWindow: farmExpectationAlerts.length,
      expectationRecoveredLast7Days: farmRecoveredExpectationAlerts.length,
      devicesTotal: farmDevices.length,
      devicesNeedingAttention: farmDevices.filter((device) => ["stale", "offline"].includes(device.status?.online_state)).length,
      openAlerts: farmAlerts.length,
      criticalAlerts: farmAlerts.filter((alert) => alert.severity === "critical").length,
      recordAlerts: farmAlerts.filter((alert) => alert.sourceLabel === "record").length,
      telemetryAlerts: farmAlerts.filter((alert) => alert.sourceLabel === "telemetry").length,
      expectationAlertsOpen: farmAlerts.filter((alert) => alert.sourceLabel === "expectation").length,
      systemAlerts: farmAlerts.filter((alert) => alert.sourceLabel === "system").length,
      hasHandoff: Boolean(latestHandoffByFarmId.get(farm.id)?.note),
      latestHandoff: latestHandoffByFarmId.get(farm.id)?.note ?? "",
      latestHandoffAt: latestHandoffByFarmId.get(farm.id)?.created_at ?? ""
    };
  });

  return {
    disciplineByFarm: [...rows]
      .sort((left, right) => {
        if (Number(left.hasHandoff) !== Number(right.hasHandoff)) {
          return Number(left.hasHandoff) - Number(right.hasHandoff);
        }
        if (right.attentionTemplates !== left.attentionTemplates) {
          return right.attentionTemplates - left.attentionTemplates;
        }
        return right.expectationAlertsInWindow - left.expectationAlertsInWindow;
      }),
    alertPressureByFarm: [...rows]
      .sort((left, right) => {
        if (Number(left.hasHandoff) !== Number(right.hasHandoff)) {
          return Number(left.hasHandoff) - Number(right.hasHandoff);
        }
        if (right.openAlerts !== left.openAlerts) {
          return right.openAlerts - left.openAlerts;
        }
        return right.criticalAlerts - left.criticalAlerts;
      })
  };
}

function buildTelemetryPressure({ farms = [], devices = [], telemetry = [], openAlerts = [] }) {
  const farmNameMap = new Map(farms.map((farm) => [farm.id, farm.name]));
  const latestByDevice = new Map();
  const telemetryAlertCounts = openAlerts.reduce((accumulator, alert) => {
    if (alert.sourceLabel !== "telemetry" || !alert.farm_id) {
      return accumulator;
    }

    accumulator[alert.farm_id] = (accumulator[alert.farm_id] ?? 0) + 1;
    return accumulator;
  }, {});

  for (const row of telemetry) {
    if (!latestByDevice.has(row.device_id)) {
      latestByDevice.set(row.device_id, row);
    }
  }

  const grouped = devices.reduce((accumulator, device) => {
    if (!device.farm_id) {
      return accumulator;
    }

    const current = accumulator.get(device.farm_id) ?? {
      farmId: device.farm_id,
      farmName: farmNameMap.get(device.farm_id) ?? "Unknown farm",
      reportingDeviceCount: 0,
      lowBatteryDeviceCount: 0,
      temperatures: [],
      batteries: [],
      latestReportedAt: null
    };

    const latestTelemetry = latestByDevice.get(device.id) ?? null;
    if (latestTelemetry) {
      current.reportingDeviceCount += 1;

      const temperature = Number(latestTelemetry.temperature_c);
      const battery = Number(latestTelemetry.battery_percent);

      if (Number.isFinite(temperature)) {
        current.temperatures.push(temperature);
      }

      if (Number.isFinite(battery)) {
        current.batteries.push(battery);
        if (battery <= 20) {
          current.lowBatteryDeviceCount += 1;
        }
      }

      if (!current.latestReportedAt || new Date(latestTelemetry.recorded_at).getTime() > new Date(current.latestReportedAt).getTime()) {
        current.latestReportedAt = latestTelemetry.recorded_at;
      }
    }

    accumulator.set(device.farm_id, current);
    return accumulator;
  }, new Map());

  const byFarm = Array.from(grouped.values())
    .map((farm) => {
      const averageTemperature = average(farm.temperatures);
      const averageBattery = average(farm.batteries);
      const warm = averageTemperature !== null && (averageTemperature < 26 || averageTemperature > 30);
      const criticalHeat = averageTemperature !== null && (averageTemperature < 24 || averageTemperature > 32);
      const batteryPressure = farm.lowBatteryDeviceCount > 0;

      return {
        farmId: farm.farmId,
        farmName: farm.farmName,
        reportingDeviceCount: farm.reportingDeviceCount,
        averageTemperature,
        averageBattery,
        lowBatteryDeviceCount: farm.lowBatteryDeviceCount,
        latestReportedAt: farm.latestReportedAt,
        openTelemetryAlertCount: telemetryAlertCounts[farm.farmId] ?? 0,
        warm,
        criticalHeat,
        batteryPressure,
        pressureScore: (criticalHeat ? 3 : warm ? 2 : 0) + (batteryPressure ? 1 : 0) + ((telemetryAlertCounts[farm.farmId] ?? 0) > 0 ? 1 : 0)
      };
    })
    .filter((farm) => farm.reportingDeviceCount > 0)
    .sort((left, right) => {
      if (right.pressureScore !== left.pressureScore) {
        return right.pressureScore - left.pressureScore;
      }

      return right.reportingDeviceCount - left.reportingDeviceCount;
    })
    .slice(0, 8);

  return {
    warmFarmCount: byFarm.filter((farm) => farm.warm).length,
    lowBatteryFarmCount: byFarm.filter((farm) => farm.batteryPressure).length,
    criticalHeatFarmCount: byFarm.filter((farm) => farm.criticalHeat).length,
    byFarm
  };
}

function buildTelemetryOutcomeTrends({ events = [], farms = [] }) {
  const farmNameMap = new Map(farms.map((farm) => [farm.id, farm.name]));
  const byOutcome = {
    alert_follow_up: 0,
    record_follow_up: 0,
    handoff_follow_up: 0
  };

  const byFarm = Object.values(
    events.reduce((accumulator, event) => {
      const outcome = String(event.details_json?.outcome ?? "").trim();
      if (!outcome) {
        return accumulator;
      }

      if (outcome in byOutcome) {
        byOutcome[outcome] += 1;
      }

      const farmId = event.farm_id ?? "unknown";
      const key = String(farmId);
      const current = accumulator[key] ?? {
        farmId,
        farmName: farmNameMap.get(farmId) ?? "Unknown farm",
        total: 0,
        alert_follow_up: 0,
        record_follow_up: 0,
        handoff_follow_up: 0
      };
      current.total += 1;
      if (outcome in current) {
        current[outcome] += 1;
      }
      accumulator[key] = current;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.total - left.total)
    .slice(0, 6);

  return {
    byOutcome,
    byFarm
  };
}

function preferredTelemetryOutcomeForFarm(telemetryOutcomeTrends, farmId) {
  const farm = (telemetryOutcomeTrends?.byFarm ?? []).find((item) => item.farmId === farmId);
  if (!farm) {
    return "";
  }

  const candidates = [
    ["record_follow_up", farm.record_follow_up ?? 0],
    ["alert_follow_up", farm.alert_follow_up ?? 0],
    ["handoff_follow_up", farm.handoff_follow_up ?? 0]
  ].sort((left, right) => right[1] - left[1]);

  return candidates[0]?.[1] > 0 ? candidates[0][0] : "";
}

function startOfHourIso(value) {
  const date = toDateValue(value);
  if (!date) {
    return null;
  }

  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

function buildTelemetryTimeline(telemetry = []) {
  const buckets = new Map();

  for (const row of telemetry) {
    const bucketKey = startOfHourIso(row.recorded_at);
    if (!bucketKey) {
      continue;
    }

    const current = buckets.get(bucketKey) ?? {
      bucket: bucketKey,
      temperatures: [],
      batteries: [],
      sampleCount: 0
    };

    const temperature = Number(row.temperature_c);
    const battery = Number(row.battery_percent);

    if (Number.isFinite(temperature)) {
      current.temperatures.push(temperature);
    }

    if (Number.isFinite(battery)) {
      current.batteries.push(battery);
    }

    current.sampleCount += 1;
    buckets.set(bucketKey, current);
  }

  const history = Array.from(buckets.values())
    .map((bucket) => ({
      bucket: bucket.bucket,
      temperature_c: average(bucket.temperatures),
      battery_percent: average(bucket.batteries),
      sampleCount: bucket.sampleCount
    }))
    .sort((left, right) => new Date(left.bucket).getTime() - new Date(right.bucket).getTime())
    .slice(-12);

  const temperatures = history.map((item) => item.temperature_c).filter((value) => Number.isFinite(value));
  const batteries = history.map((item) => item.battery_percent).filter((value) => Number.isFinite(value));

  return {
    history,
    metrics: {
      sampleCount: history.reduce((sum, item) => sum + (item.sampleCount ?? 0), 0),
      averageTemperature: average(temperatures),
      minTemperature: temperatures.length ? Math.min(...temperatures) : null,
      maxTemperature: temperatures.length ? Math.max(...temperatures) : null,
      averageBattery: average(batteries),
      minBattery: batteries.length ? Math.min(...batteries) : null
    }
  };
}

function mergeTelemetryIntoReports(reports, telemetryPressure) {
  const telemetryByFarmId = new Map((telemetryPressure?.byFarm ?? []).map((farm) => [farm.farmId, farm]));

  const attachTelemetry = (rows = []) =>
    rows.map((row) => {
      const telemetry = telemetryByFarmId.get(row.farmId) ?? null;

      return {
        ...row,
        telemetryReportingDevices: telemetry?.reportingDeviceCount ?? 0,
        telemetryAverageTemperature: telemetry?.averageTemperature ?? null,
        telemetryAverageBattery: telemetry?.averageBattery ?? null,
        telemetryLowBatteryDevices: telemetry?.lowBatteryDeviceCount ?? 0,
        telemetryOpenAlerts: telemetry?.openTelemetryAlertCount ?? 0,
        telemetryWarm: telemetry?.warm ?? false,
        telemetryCriticalHeat: telemetry?.criticalHeat ?? false,
        telemetryBatteryPressure: telemetry?.batteryPressure ?? false,
        telemetryLatestReportedAt: telemetry?.latestReportedAt ?? ""
      };
    });

  return {
    disciplineByFarm: attachTelemetry(reports?.disciplineByFarm),
    alertPressureByFarm: attachTelemetry(reports?.alertPressureByFarm)
  };
}

function mergeTelemetryOutcomesIntoReports(reports, telemetryOutcomeTrends) {
  const outcomeByFarmId = new Map((telemetryOutcomeTrends?.byFarm ?? []).map((farm) => [farm.farmId, farm]));

  const attachOutcomes = (rows = []) =>
    rows.map((row) => {
      const outcomes = outcomeByFarmId.get(row.farmId) ?? null;

      return {
        ...row,
        telemetryOutcomeTotal: outcomes?.total ?? 0,
        telemetryOutcomeAlerts: outcomes?.alert_follow_up ?? 0,
        telemetryOutcomeRecords: outcomes?.record_follow_up ?? 0,
        telemetryOutcomeHandoffs: outcomes?.handoff_follow_up ?? 0
      };
    });

  return {
    disciplineByFarm: attachOutcomes(reports?.disciplineByFarm),
    alertPressureByFarm: attachOutcomes(reports?.alertPressureByFarm)
  };
}

function buildNotificationCoverage({ farms = [], preferences = [] }) {
  const preferencesByFarmId = preferences.reduce((accumulator, item) => {
    if (!item?.farm_id) {
      return accumulator;
    }

    const current = accumulator.get(item.farm_id) ?? {
      farmId: item.farm_id,
      preferenceCount: 0,
      emailEnabledCount: 0,
      lineEnabledCount: 0,
      criticalOnlyCount: 0
    };

    current.preferenceCount += 1;
    if (item.email_enabled) {
      current.emailEnabledCount += 1;
    }
    if (item.line_enabled) {
      current.lineEnabledCount += 1;
    }
    if (item.critical_only) {
      current.criticalOnlyCount += 1;
    }

    accumulator.set(item.farm_id, current);
    return accumulator;
  }, new Map());

  const byFarm = farms.map((farm) => {
    const current = preferencesByFarmId.get(farm.id) ?? {
      preferenceCount: 0,
      emailEnabledCount: 0,
      lineEnabledCount: 0,
      criticalOnlyCount: 0
    };

    return {
      farmId: farm.id,
      farmName: farm.name,
      farmEmailConfigured: Boolean(farm.alert_email_to),
      farmLineConfigured: Boolean(farm.alert_line_user_id),
      preferenceCount: current.preferenceCount,
      emailEnabledCount: current.emailEnabledCount,
      lineEnabledCount: current.lineEnabledCount,
      criticalOnlyCount: current.criticalOnlyCount,
      hasCoverage: Boolean(farm.alert_email_to || farm.alert_line_user_id || current.preferenceCount > 0)
    };
  });

  return {
    byFarm,
    emailEnabledFarmCount: byFarm.filter((farm) => farm.farmEmailConfigured || farm.emailEnabledCount > 0).length,
    lineEnabledFarmCount: byFarm.filter((farm) => farm.farmLineConfigured || farm.lineEnabledCount > 0).length
  };
}

function buildNotificationDispatchQueue({
  alerts = [],
  reportRows = { disciplineByFarm: [], alertPressureByFarm: [] },
  telemetryOutcomeTrends = { byFarm: [] },
  notificationCoverage = { byFarm: [] }
}) {
  const coverageByFarmId = new Map((notificationCoverage.byFarm ?? []).map((farm) => [farm.farmId, farm]));
  const disciplineByFarmId = new Map((reportRows.disciplineByFarm ?? []).map((row) => [row.farmId, row]));
  const pressureByFarmId = new Map((reportRows.alertPressureByFarm ?? []).map((row) => [row.farmId, row]));

  const items = alerts.map((alert) => {
    const farmId = alert.farm_id;
    const farmCoverage = coverageByFarmId.get(farmId);
    const disciplineRow = disciplineByFarmId.get(farmId);
    const pressureRow = pressureByFarmId.get(farmId);
    const preferredTelemetryOutcome = preferredTelemetryOutcomeForFarm(telemetryOutcomeTrends, farmId);
    const handoffAge = handoffAgeDays(pressureRow?.latestHandoffAt);
    const handoffMissingOrStale = !pressureRow?.latestHandoffAt || (handoffAge !== null && handoffAge > 3);

    let state = "ready";
    let primaryHref = `/alerts/${alert.id}`;
    let primaryLabel = "Review alert";
    let reason = "Coverage is ready, so this alert can move into delivery review immediately.";

    if (!farmCoverage?.hasCoverage) {
      state = "coverage-missing";
      primaryHref = `/farms/${farmId}?return_to=${encodeURIComponent("/ops/follow-ups?queue=notification-dispatch")}`;
      primaryLabel = "Update delivery coverage";
      reason = "This farm still has no reliable delivery path, so fix contacts or recipient coverage before relying on dispatch.";
    } else if (
      alert.sourceLabel === "expectation"
      || (
        alert.sourceLabel === "telemetry"
        && preferredTelemetryOutcome === "record_follow_up"
        && (disciplineRow?.attentionTemplates ?? 0) > 0
      )
      || (
        alert.sourceLabel === "telemetry"
        && preferredTelemetryOutcome === "handoff_follow_up"
        && handoffMissingOrStale
      )
    ) {
      state = "follow-up-first";
      primaryHref = `/ops/reports/farms/${farmId}`;
      primaryLabel =
        alert.sourceLabel === "expectation"
          ? "Review record discipline"
          : preferredTelemetryOutcome === "handoff_follow_up"
            ? "Update handoff first"
            : "Create record first";
      reason =
        alert.sourceLabel === "expectation"
          ? "This alert comes from a missing expected record, so operational follow-up should happen before delivery review."
          : preferredTelemetryOutcome === "handoff_follow_up"
            ? "This farm usually closes telemetry pressure after the operator context is refreshed, so handoff should happen first."
            : "This farm usually needs structured field context before telemetry delivery review is useful, so capture the record first.";
    }

    return {
      id: alert.id,
      farmId,
      farmName: pressureRow?.farmName ?? disciplineRow?.farmName ?? "Unknown farm",
      alertType: alert.alert_type,
      severity: alert.severity,
      sourceLabel: alert.sourceLabel,
      openedAt: alert.opened_at,
      state,
      reason,
      primaryHref,
      primaryLabel,
      secondaryHref: `/alerts/${alert.id}`,
      secondaryLabel: "Open alert",
      recipientCount: (farmCoverage?.emailEnabledCount ?? 0) + (farmCoverage?.lineEnabledCount ?? 0),
      farmFallbackReady: Boolean(farmCoverage?.farmEmailConfigured || farmCoverage?.farmLineConfigured)
    };
  });

  const rank = {
    "coverage-missing": 3,
    "follow-up-first": 2,
    ready: 1
  };

  const sorted = items
    .sort((left, right) => {
      if (rank[right.state] !== rank[left.state]) {
        return rank[right.state] - rank[left.state];
      }
      if (left.severity !== right.severity) {
        return left.severity === "critical" ? -1 : 1;
      }
      return new Date(right.openedAt ?? 0).getTime() - new Date(left.openedAt ?? 0).getTime();
    })
    .slice(0, 10);

  return {
    readyCount: items.filter((item) => item.state === "ready").length,
    coverageMissingCount: items.filter((item) => item.state === "coverage-missing").length,
    followUpFirstCount: items.filter((item) => item.state === "follow-up-first").length,
    items: sorted
  };
}

function mergeNotificationDispatchIntoReports(reports, notificationDispatch) {
  const byFarm = (notificationDispatch?.items ?? []).reduce((accumulator, item) => {
    const current = accumulator.get(item.farmId) ?? {
      dispatchReadyCount: 0,
      dispatchCoverageMissingCount: 0,
      dispatchFollowUpFirstCount: 0
    };

    if (item.state === "coverage-missing") {
      current.dispatchCoverageMissingCount += 1;
    } else if (item.state === "follow-up-first") {
      current.dispatchFollowUpFirstCount += 1;
    } else {
      current.dispatchReadyCount += 1;
    }

    accumulator.set(item.farmId, current);
    return accumulator;
  }, new Map());

  const attachDispatch = (rows = []) =>
    rows.map((row) => {
      const dispatch = byFarm.get(row.farmId) ?? {
        dispatchReadyCount: 0,
        dispatchCoverageMissingCount: 0,
        dispatchFollowUpFirstCount: 0
      };

      return {
        ...row,
        ...dispatch
      };
    });

  return {
    disciplineByFarm: attachDispatch(reports?.disciplineByFarm),
    alertPressureByFarm: attachDispatch(reports?.alertPressureByFarm)
  };
}

function buildFollowUpQueue({
  farms = [],
  reportRows = { disciplineByFarm: [], alertPressureByFarm: [] },
  telemetryPressure = { byFarm: [] },
  telemetryOutcomeTrends = { byFarm: [] },
  notificationCoverage = { byFarm: [] },
  notificationDispatch = { items: [] }
}) {
  const farmById = new Map(farms.map((farm) => [farm.id, farm]));
  const pressureByFarmId = new Map(reportRows.alertPressureByFarm.map((row) => [row.farmId, row]));
  const disciplineByFarmId = new Map(reportRows.disciplineByFarm.map((row) => [row.farmId, row]));
  const notificationCoverageByFarmId = new Map((notificationCoverage.byFarm ?? []).map((farm) => [farm.farmId, farm]));
  const items = [];

  for (const [farmId, alertRow] of pressureByFarmId.entries()) {
    const farm = farmById.get(farmId);
    const disciplineRow = disciplineByFarmId.get(farmId);
    const farmCoverage = notificationCoverageByFarmId.get(farmId);
    const farmName = farm?.name ?? alertRow.farmName ?? "Unknown farm";

    if ((alertRow.criticalAlerts ?? 0) > 0) {
      items.push({
        key: `${farmId}-critical-alerts`,
        category: "critical-alerts",
        farmId,
        farmName,
        priority: "critical",
        priorityScore: 1000 + (alertRow.criticalAlerts ?? 0) * 10 + (alertRow.openAlerts ?? 0),
        title: `Critical alerts need review at ${farmName}`,
        body: `${alertRow.criticalAlerts} critical and ${alertRow.openAlerts} open alerts are still active for this farm.`,
        primaryHref: `/alerts?farmId=${farmId}&severity=critical&return_to=${encodeURIComponent("/ops")}`,
        primaryLabel: "Review critical alerts",
        secondaryHref: `/ops/reports/farms/${farmId}`,
        secondaryLabel: "Open farm report"
      });
    }

    if ((alertRow.devicesNeedingAttention ?? 0) > 0) {
      items.push({
        key: `${farmId}-device-attention`,
        category: "device-attention",
        farmId,
        farmName,
        priority: "warning",
        priorityScore: 700 + (alertRow.devicesNeedingAttention ?? 0) * 5,
        title: `Device attention is building at ${farmName}`,
        body: `${alertRow.devicesNeedingAttention} devices look stale or offline and should be checked against the current alert queue.`,
        primaryHref: `/ops/reports/farms/${farmId}`,
        primaryLabel: "Review device pressure",
        secondaryHref: `/alerts?farmId=${farmId}&return_to=${encodeURIComponent("/ops")}`,
        secondaryLabel: "Open alerts"
      });
    }

    if ((disciplineRow?.attentionTemplates ?? 0) > 0) {
      items.push({
        key: `${farmId}-record-discipline`,
        category: "record-discipline",
        farmId,
        farmName,
        priority: (disciplineRow?.expectationAlertsInWindow ?? 0) > 0 ? "warning" : "attention",
        priorityScore: 500 + (disciplineRow?.attentionTemplates ?? 0) * 5 + (disciplineRow?.expectationAlertsInWindow ?? 0),
        title: `Record discipline needs follow-up at ${farmName}`,
        body: `${disciplineRow?.attentionTemplates ?? 0} templates need attention and ${disciplineRow?.expectationAlertsInWindow ?? 0} missing-record alerts were seen in the current reporting window.`,
        primaryHref: `/records?farm=${farmId}&dateRange=30d&return_to=${encodeURIComponent("/ops")}`,
        primaryLabel: "Open records",
        secondaryHref: `/ops/reports/farms/${farmId}`,
        secondaryLabel: "Open farm report"
      });
    }

    if (!farmCoverage?.hasCoverage) {
      items.push({
        key: `${farmId}-contact-gap`,
        category: "contact-gap",
        farmId,
        farmName,
        priority: "attention",
        priorityScore: 300,
        title: `Notification contacts are missing at ${farmName}`,
        body: "This farm still has no farm contact or recipient delivery coverage configured, so escalations may not reach the team reliably.",
        primaryHref: `/farms/${farmId}`,
        primaryLabel: "Update farm contacts",
        secondaryHref: `/ops/reports/farms/${farmId}`,
        secondaryLabel: "Open farm report"
      });
    }

    const handoffAge = handoffAgeDays(alertRow.latestHandoffAt);
    const hasNoHandoff = !alertRow.latestHandoffAt;
    const hasStaleHandoff = handoffAge !== null && handoffAge > 3;

    if (hasNoHandoff || hasStaleHandoff) {
      const priority = hasNoHandoff || (alertRow.openAlerts ?? 0) > 0 ? "warning" : "attention";
      const title = hasNoHandoff
        ? `Operator handoff is missing at ${farmName}`
        : `Operator handoff is getting stale at ${farmName}`;
      const body = hasNoHandoff
        ? "No recent operator handoff note is attached to this farm yet, so the next shift may be missing context."
        : `The latest operator handoff is ${handoffAge} days old and should be refreshed before context drifts.`;

      items.push({
        key: `${farmId}-handoff-gap`,
        category: "handoff-gap",
        farmId,
        farmName,
        priority,
        priorityScore: hasNoHandoff ? 420 : 380,
        title,
        body,
        primaryHref: `/ops/reports/farms/${farmId}`,
        primaryLabel: "Update handoff",
        secondaryHref: `/farms/${farmId}`,
        secondaryLabel: "Open farm settings"
      });
    }
  }

  for (const telemetryFarm of telemetryPressure.byFarm) {
    if (!telemetryFarm.criticalHeat && !telemetryFarm.batteryPressure) {
      continue;
    }

    const disciplineRow = disciplineByFarmId.get(telemetryFarm.farmId);
    const alertRow = pressureByFarmId.get(telemetryFarm.farmId);
    const preferredOutcome = preferredTelemetryOutcomeForFarm(telemetryOutcomeTrends, telemetryFarm.farmId);
    const priority = telemetryFarm.criticalHeat ? "critical" : "warning";
    const bodyParts = [];
    let primaryHref = `/alerts?farmId=${telemetryFarm.farmId}&source=device_telemetry&return_to=${encodeURIComponent("/ops")}`;
    let primaryLabel = "Review telemetry alerts";
    let secondaryHref = `/ops/reports/farms/${telemetryFarm.farmId}`;
    let secondaryLabel = "Open farm report";
    let whyNow = "Telemetry pressure is already visible at the farm level and should be reviewed before it spreads into broader ops risk.";
    let recommendedEscalation = telemetryFarm.criticalHeat
      ? "Escalate through telemetry alerts first."
      : "Review the farm report and confirm whether this pressure needs structured follow-up.";

    if (telemetryFarm.criticalHeat) {
      bodyParts.push(`avg temp ${telemetryFarm.averageTemperature?.toFixed?.(1) ?? telemetryFarm.averageTemperature} C`);
      whyNow = "Temperature is already in a critical band, so this farm can move from drift into incident territory quickly.";
      recommendedEscalation = "Start with open telemetry alerts and then confirm field context in the farm report.";
    } else if (telemetryFarm.warm) {
      bodyParts.push(`temp drift ${telemetryFarm.averageTemperature?.toFixed?.(1) ?? telemetryFarm.averageTemperature} C`);
      whyNow = "Temperature is drifting outside the preferred band, which usually needs confirmation before it becomes a harder incident.";
    }

    if (telemetryFarm.batteryPressure) {
      bodyParts.push(`${telemetryFarm.lowBatteryDeviceCount} low-battery devices`);
      recommendedEscalation = "Check the farm report and maintenance context before device visibility drops further.";
    }

    if (
      (disciplineRow?.attentionTemplates ?? 0) > 0
      && (
        preferredOutcome === "record_follow_up"
        || !(telemetryFarm.criticalHeat || telemetryFarm.openTelemetryAlertCount > 0 || preferredOutcome === "alert_follow_up")
      )
    ) {
      const params = new URLSearchParams();
      params.set("farmId", telemetryFarm.farmId);
      params.set("recorded_for_date", new Date().toISOString().slice(0, 10));
      params.set("summary", `Created from telemetry pressure follow-up for ${telemetryFarm.farmName}.`);
      params.set("return_to", `/ops/follow-ups?queue=telemetry-pressure&focus_farm=${encodeURIComponent(telemetryFarm.farmId)}`);
      primaryHref = `/records/new?${params.toString()}`;
      primaryLabel = "Create record";
      bodyParts.push(
        preferredOutcome === "record_follow_up"
          ? "recent telemetry follow-ups at this farm usually need a record first"
          : `${disciplineRow.attentionTemplates} record expectations still need attention`
      );
      recommendedEscalation =
        preferredOutcome === "record_follow_up"
          ? "This farm usually closes telemetry pressure more cleanly after a structured record is added."
          : "Capture a structured record now so this telemetry pressure is tied to field context while it is still fresh.";
    } else if (
      preferredOutcome === "handoff_follow_up"
      && !alertRow?.latestHandoffAt
      && telemetryFarm.openTelemetryAlertCount === 0
    ) {
      primaryHref = `/ops/reports/farms/${telemetryFarm.farmId}`;
      primaryLabel = "Update handoff";
      bodyParts.push("recent telemetry follow-ups at this farm often need a refreshed handoff");
      recommendedEscalation = "This farm often stabilizes after the next shift inherits clear telemetry context.";
    } else if (!alertRow?.latestHandoffAt && telemetryFarm.openTelemetryAlertCount === 0) {
      primaryHref = `/ops/reports/farms/${telemetryFarm.farmId}`;
      primaryLabel = "Update handoff";
      bodyParts.push("operator handoff is still missing");
      recommendedEscalation = "Refresh the operator handoff so the next shift sees the telemetry risk without reopening the same diagnosis.";
    }

    items.push({
      key: `${telemetryFarm.farmId}-telemetry-pressure`,
      category: "telemetry-pressure",
      farmId: telemetryFarm.farmId,
      farmName: telemetryFarm.farmName,
      priority,
      priorityScore: telemetryFarm.criticalHeat ? 860 : 640,
      title: `Telemetry pressure needs review at ${telemetryFarm.farmName}`,
      body: `${bodyParts.join(" and ")}${telemetryFarm.openTelemetryAlertCount ? `, ${telemetryFarm.openTelemetryAlertCount} telemetry alerts already open.` : "."}`,
      whyNow,
      recommendedEscalation,
      primaryHref,
      primaryLabel,
      secondaryHref,
      secondaryLabel
    });
  }

  for (const dispatchItem of notificationDispatch.items ?? []) {
    const priority =
      dispatchItem.state === "coverage-missing"
        ? "warning"
        : dispatchItem.severity === "critical"
          ? "critical"
          : "attention";

    items.push({
      key: `${dispatchItem.farmId}-notification-dispatch-${dispatchItem.id}`,
      category: "notification-dispatch",
      dispatchState: dispatchItem.state,
      farmId: dispatchItem.farmId,
      farmName: dispatchItem.farmName,
      priority,
      priorityScore:
        dispatchItem.state === "coverage-missing"
          ? 560
          : dispatchItem.state === "follow-up-first"
            ? 520
            : dispatchItem.severity === "critical"
              ? 480
              : 340,
      title: `Notification dispatch needs review at ${dispatchItem.farmName}`,
      body: dispatchItem.reason,
      whyNow:
        dispatchItem.state === "coverage-missing"
          ? "This alert still has no reliable delivery path behind it."
          : dispatchItem.state === "follow-up-first"
            ? "This alert should be supported by fresher farm follow-up before delivery review."
            : "Delivery coverage is ready, so the alert can move into dispatch review now.",
      recommendedEscalation:
        dispatchItem.state === "coverage-missing"
          ? "Update farm contacts or personal recipient coverage first."
          : dispatchItem.state === "follow-up-first"
            ? "Finish the operational follow-up path before treating this alert as dispatch-ready."
            : "Open the alert and confirm the delivery path.",
      primaryHref: dispatchItem.primaryHref,
      primaryLabel: dispatchItem.primaryLabel,
      secondaryHref: dispatchItem.secondaryHref,
      secondaryLabel: dispatchItem.secondaryLabel
    });
  }

  return items
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 10);
}

function escapeCsv(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll("\"", "\"\"")}"`;
  }
  return stringValue;
}

export function toOpsCsv(rows = []) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))
  ];

  return lines.join("\n");
}

function emptyOpsFarmReport(reportWindow = "30d") {
  return {
    authorized: false,
    reportWindow,
    farm: null,
    metrics: {
      activeTemplates: 0,
      currentTemplates: 0,
      attentionTemplates: 0,
      recordsInWindow: 0,
      expectationAlertsInWindow: 0,
      expectationRecoveredLast7Days: 0,
      devicesTotal: 0,
      devicesNeedingAttention: 0,
      openAlerts: 0,
      criticalAlerts: 0
    },
    openAlerts: [],
    recentRecords: [],
    topExpectationTemplates: [],
    telemetryPressure: null,
    telemetryTimeline: {
      history: [],
      metrics: {
        sampleCount: 0,
        averageTemperature: null,
        minTemperature: null,
        maxTemperature: null,
        averageBattery: null,
        minBattery: null
      }
    },
    telemetryOutcomeTrends: {
      byOutcome: {
        alert_follow_up: 0,
        record_follow_up: 0,
        handoff_follow_up: 0
      },
      byFarm: []
    },
    telemetryOutcomeHistory: [],
    latestHandoff: null,
    handoffHistory: [],
    errors: []
  };
}

export async function loadOpsFarmReport({ farmId, reportWindow = "30d", severityFilter = "all", sourceFilter = "all" } = {}) {
  const supabase = await createSupabaseServerClient();
  const normalizedWindow = normalizeReportWindow(reportWindow);
  const normalizedSeverityFilter = normalizeSeverityFilter(severityFilter);
  const normalizedSourceFilter = normalizeSourceFilter(sourceFilter);
  const reportWindowDays = windowDays(normalizedWindow);

  if (!supabase) {
    return emptyOpsFarmReport(normalizedWindow);
  }

  const operatorResult = await supabase.rpc("is_admin_or_operator");
  const authorized = operatorResult.data === true;

  if (!authorized) {
    return {
      ...emptyOpsFarmReport(normalizedWindow),
      errors: operatorResult.error ? [`permissions: ${operatorResult.error.message}`] : []
    };
  }

  const lastWindowIso = new Date(Date.now() - reportWindowDays * 24 * 60 * 60 * 1000).toISOString();
  const last7DaysIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    farmResult,
    devicesResult,
    statusesResult,
    alertsResult,
    recordsResult,
    templatesResult,
    expectationHistoryResult,
    resolvedExpectationAlertsResult,
    handoffNotesResult,
    telemetryOutcomeEventsResult
  ] = await Promise.all([
    supabase
      .from("farms")
      .select("id,name,alert_email_to,alert_line_user_id,updated_at,created_at")
      .eq("id", farmId)
      .maybeSingle(),
    supabase
      .from("devices")
      .select("id,device_id,serial_number,farm_id,farms(id,name)")
      .eq("farm_id", farmId)
      .order("device_id", { ascending: true }),
    supabase
      .from("device_status")
      .select("device_id,last_seen_at,online_state,battery_percent,signal_quality")
      .order("last_seen_at", { ascending: false })
      .limit(200),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,farm_id,device_id,opened_at,details_json,devices(device_id,serial_number)")
      .eq("farm_id", farmId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(50),
    supabase
      .from("operational_records")
      .select("id,farm_id,record_status,recorded_for_date,notes_summary,created_at,record_templates(code,name),user_profiles(display_name)")
      .eq("farm_id", farmId)
      .order("recorded_for_date", { ascending: false })
      .limit(80),
    supabase
      .from("record_templates")
      .select("id,code,name,scope_type,is_active,record_template_farm_assignments(farm_id)")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(100),
    supabase
      .from("alerts")
      .select("id,alert_type,status,farm_id,opened_at,details_json")
      .eq("farm_id", farmId)
      .eq("alert_type", "missing_record")
      .gte("opened_at", lastWindowIso)
      .order("opened_at", { ascending: false })
      .limit(200),
    supabase
      .from("alerts")
      .select("id,alert_type,status,resolved_at,details_json")
      .eq("status", "resolved")
      .eq("alert_type", "missing_record")
      .gte("resolved_at", last7DaysIso)
      .order("resolved_at", { ascending: false })
      .limit(80),
    supabase
      .from("audit_log")
      .select("id,farm_id,details_json,created_at")
      .eq("farm_id", farmId)
      .eq("action", "ops.handoff_noted")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("audit_log")
      .select("id,farm_id,details_json,created_at")
      .eq("farm_id", farmId)
      .eq("action", "ops.telemetry_follow_up_completed")
      .gte("created_at", lastWindowIso)
      .order("created_at", { ascending: false })
      .limit(24)
  ]);

  const farm = farmResult.error
    ? { data: null, error: `farm: ${farmResult.error.message}` }
    : { data: farmResult.data ?? null, error: null };
  const devices = listResult("devices", devicesResult);
  const statuses = listResult("device_status", statusesResult);
  const alerts = listResult("alerts", alertsResult);
  const records = listResult("operational_records", recordsResult);
  const templates = listResult("record_templates", templatesResult);
  const expectationHistory = listResult("expectation_history", expectationHistoryResult);
  const resolvedExpectationAlerts = listResult("resolved_expectation_alerts", resolvedExpectationAlertsResult);
  const handoffNotes = listResult("handoff_notes", handoffNotesResult);
  const telemetryOutcomeEvents = listResult("telemetry_outcomes", telemetryOutcomeEventsResult);
  const telemetryResult = devices.data.length
    ? await supabase
        .from("telemetry")
        .select("id,device_id,recorded_at,temperature_c,battery_percent")
        .in("device_id", devices.data.map((device) => device.id))
        .order("recorded_at", { ascending: false })
        .limit(180)
    : { data: [], error: null };
  const telemetry = listResult("telemetry", telemetryResult);

  const mergedDevices = mergeDeviceStatus(
    devices.data,
    statuses.data.filter((status) => devices.data.some((device) => device.id === status.device_id))
  );
  const normalizedAlerts = alerts.data.map(normalizeAlert);
  const filteredAlerts = normalizedAlerts.filter((alert) => {
    if (normalizedSeverityFilter !== "all" && alert.severity !== normalizedSeverityFilter) {
      return false;
    }

    if (normalizedSourceFilter !== "all" && alert.sourceLabel !== normalizedSourceFilter) {
      return false;
    }

    return true;
  });
  const normalizedTemplates = templates.data.map((template) => ({
    ...template,
    assigned_farm_ids: Array.isArray(template.record_template_farm_assignments)
      ? template.record_template_farm_assignments.map((assignment) => assignment.farm_id).filter(Boolean)
      : []
  }));
  const visibleTemplates = normalizedTemplates.filter((template) => isTemplateAvailableForFarm(template, farmId));
  const reportRows = buildReportRows({
    farms: farm.data ? [farm.data] : [],
    devices: mergedDevices,
    openAlerts: normalizedAlerts,
    templates: visibleTemplates,
    records: records.data,
    expectationHistory: expectationHistory.data,
    resolvedExpectationAlerts: resolvedExpectationAlerts.data,
    reportWindowDays
  });
  const summary = reportRows.disciplineByFarm[0] ?? {
    activeTemplates: 0,
    currentTemplates: 0,
    attentionTemplates: 0,
    recordsInWindow: 0,
    expectationAlertsInWindow: 0,
    expectationRecoveredLast7Days: 0,
    devicesTotal: 0,
    devicesNeedingAttention: 0,
    openAlerts: 0,
    criticalAlerts: 0
  };
  const templateIdByCode = new Map(visibleTemplates.map((template) => [template.code, template.id]));
  const topExpectationTemplates = Object.values(
    expectationHistory.data.reduce((accumulator, alert) => {
      const templateCode = alert.details_json?.source_template_code ?? "unknown_template";
      const templateName = alert.details_json?.source_template_name ?? templateCode;
      const current = accumulator[templateCode] ?? {
        templateCode,
        templateName,
        templateId: templateIdByCode.get(templateCode) ?? null,
        count: 0
      };
      current.count += 1;
      accumulator[templateCode] = current;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
  const normalizedHandoffHistory = handoffNotes.data.map((note) => ({
    id: note.id,
    note: note.details_json?.note ?? "",
    created_at: note.created_at ?? null
  }));
  const telemetryPressure = buildTelemetryPressure({
    farms: farm.data ? [farm.data] : [],
    devices: mergedDevices,
    telemetry: telemetry.data,
    openAlerts: normalizedAlerts
  }).byFarm[0] ?? null;
  const telemetryTimeline = buildTelemetryTimeline(telemetry.data);
  const telemetryOutcomeTrends = buildTelemetryOutcomeTrends({
    events: telemetryOutcomeEvents.data,
    farms: farm.data ? [farm.data] : []
  });
  const telemetryOutcomeHistory = telemetryOutcomeEvents.data
    .map((event) => ({
      id: event.id,
      outcome: event.details_json?.outcome ?? "",
      summary: event.details_json?.workspace_context?.summary ?? "",
      created_at: event.created_at ?? null
    }))
    .slice(0, 8);

  return {
    authorized,
    reportWindow: normalizedWindow,
    severityFilter: normalizedSeverityFilter,
    sourceFilter: normalizedSourceFilter,
    farm: farm.data,
    metrics: summary,
    openAlerts: filteredAlerts,
    recentRecords: records.data.slice(0, 20),
    topExpectationTemplates,
    telemetryPressure,
    telemetryTimeline,
    telemetryOutcomeTrends,
    telemetryOutcomeHistory,
    latestHandoff: normalizedHandoffHistory[0] ?? null,
    handoffHistory: normalizedHandoffHistory.slice(0, 5),
    errors: [
      farm.error,
      devices.error,
      statuses.error,
      alerts.error,
      records.error,
      templates.error,
      expectationHistory.error,
      resolvedExpectationAlerts.error,
      handoffNotes.error,
      telemetryOutcomeEvents.error,
      telemetry.error
    ].filter(Boolean)
  };
}

export async function loadOpsOverview(options = {}) {
  const supabase = await createSupabaseServerClient();
  const reportWindow = normalizeReportWindow(options.reportWindow);
  const severityFilter = normalizeSeverityFilter(options.severityFilter);
  const sourceFilter = normalizeSourceFilter(options.sourceFilter);
  const reportWindowDays = windowDays(reportWindow);

  if (!supabase) {
    return EMPTY_OPS_OVERVIEW;
  }

  const operatorResult = await supabase.rpc("is_admin_or_operator");
  const authorized = operatorResult.data === true;

  if (!authorized) {
    return {
      ...EMPTY_OPS_OVERVIEW,
      errors: operatorResult.error ? [`permissions: ${operatorResult.error.message}`] : []
    };
  }

  const lastWindowIso = new Date(Date.now() - reportWindowDays * 24 * 60 * 60 * 1000).toISOString();
  const last7DaysIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    farmsResult,
    devicesResult,
    statusesResult,
    alertsResult,
    commandsResult,
    templatesResult,
    recordsResult,
    expectationHistoryResult,
    resolvedExpectationAlertsResult,
    handoffNotesResult,
    notificationPreferencesResult
  ] = await Promise.all([
    supabase
      .from("farms")
      .select("id,name,alert_email_to,alert_line_user_id,updated_at")
      .order("name", { ascending: true })
      .limit(80),
    supabase
      .from("devices")
      .select("id,device_id,serial_number,farm_id,battery_variant,firmware_version,farms(id,name)")
      .not("farm_id", "is", null)
      .order("device_id", { ascending: true })
      .limit(150),
    supabase
      .from("device_status")
      .select("device_id,last_seen_at,online_state,battery_percent,signal_quality")
      .order("last_seen_at", { ascending: false })
      .limit(150),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,farm_id,device_id,opened_at,details_json,devices(device_id,serial_number)")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(60),
    supabase
      .from("command_log")
      .select("id,command_type,request_source,status,requested_at,completed_at,devices(device_id,serial_number)")
      .order("requested_at", { ascending: false })
      .limit(40),
    supabase
      .from("record_templates")
      .select("id,code,name,scope_type,is_active,record_template_farm_assignments(farm_id)")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(100),
    supabase
      .from("operational_records")
      .select("id,farm_id,recorded_for_date,created_at,record_templates(code,name)")
      .order("recorded_for_date", { ascending: false })
      .limit(200),
    supabase
      .from("alerts")
      .select("id,alert_type,status,farm_id,opened_at,details_json")
      .eq("alert_type", "missing_record")
      .gte("opened_at", lastWindowIso)
      .order("opened_at", { ascending: false })
      .limit(300),
    supabase
      .from("alerts")
      .select("id,alert_type,status,resolved_at,details_json")
      .eq("status", "resolved")
      .eq("alert_type", "missing_record")
      .gte("resolved_at", last7DaysIso)
      .order("resolved_at", { ascending: false })
      .limit(80),
    supabase
      .from("audit_log")
      .select("id,farm_id,details_json,created_at")
      .eq("action", "ops.handoff_noted")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("notification_preferences")
      .select("farm_id,user_id,email_enabled,line_enabled,critical_only,updated_at")
      .order("updated_at", { ascending: false })
      .limit(240),
    supabase
      .from("audit_log")
      .select("id,farm_id,details_json,created_at")
      .eq("action", "ops.telemetry_follow_up_completed")
      .gte("created_at", lastWindowIso)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("telemetry")
      .select("id,device_id,recorded_at,temperature_c,battery_percent")
      .order("recorded_at", { ascending: false })
      .limit(320)
  ]);

  const farms = listResult("farms", farmsResult);
  const devices = listResult("devices", devicesResult);
  const statuses = listResult("device_status", statusesResult);
  const alerts = listResult("alerts", alertsResult);
  const commands = listResult("command_log", commandsResult);
  const templates = listResult("record_templates", templatesResult);
  const records = listResult("operational_records", recordsResult);
  const expectationHistory = listResult("expectation_history", expectationHistoryResult);
  const resolvedExpectationAlerts = listResult("resolved_expectation_alerts", resolvedExpectationAlertsResult);
  const handoffNotes = listResult("handoff_notes", handoffNotesResult);
  const notificationPreferences = listResult("notification_preferences", notificationPreferencesResult);
  const telemetryOutcomeEvents = listResult("telemetry_outcomes", telemetryOutcomeEventsResult);
  const telemetry = listResult("telemetry", telemetryResult);

  const mergedDevices = mergeDeviceStatus(devices.data, statuses.data);
  const normalizedAlerts = alerts.data.map(normalizeAlert);
  const filteredAlerts = normalizedAlerts.filter((alert) => {
    if (severityFilter !== "all" && alert.severity !== severityFilter) {
      return false;
    }

    if (sourceFilter !== "all" && alert.sourceLabel !== sourceFilter) {
      return false;
    }

    return true;
  });
  const normalizedTemplates = templates.data.map((template) => ({
    ...template,
    assigned_farm_ids: Array.isArray(template.record_template_farm_assignments)
      ? template.record_template_farm_assignments.map((assignment) => assignment.farm_id).filter(Boolean)
      : []
  }));

  const onlineCount = mergedDevices.filter((device) => device.status?.online_state === "online").length;
  const attentionCount = mergedDevices.filter((device) => ["stale", "offline"].includes(device.status?.online_state)).length;
  const criticalAlertCount = normalizedAlerts.filter((alert) => alert.severity === "critical").length;
  const missingContactCount = farms.data.filter((farm) => !farm.alert_email_to && !farm.alert_line_user_id).length;
  const notificationCoverage = buildNotificationCoverage({
    farms: farms.data,
    preferences: notificationPreferences.data
  });
  const expectationMetrics = buildExpectationSummary({
    farms: farms.data,
    templates: normalizedTemplates,
    records: records.data,
    resolvedAlerts: resolvedExpectationAlerts.data
  });
  const expectationTrends = buildExpectationTrends({
    alerts: expectationHistory.data,
    farms: farms.data
  });
  const latestHandoffByFarmId = new Map();
  for (const note of handoffNotes.data) {
    if (!note?.farm_id || latestHandoffByFarmId.has(note.farm_id)) {
      continue;
    }

    latestHandoffByFarmId.set(note.farm_id, {
      id: note.id,
      note: note.details_json?.note ?? "",
      created_at: note.created_at ?? null
    });
  }
  const baseReports = buildReportRows({
    farms: farms.data,
    devices: mergedDevices,
    openAlerts: filteredAlerts,
    templates: normalizedTemplates,
    records: records.data,
    expectationHistory: expectationHistory.data,
    resolvedExpectationAlerts: resolvedExpectationAlerts.data,
    latestHandoffByFarmId,
    reportWindowDays
  });
  const telemetryPressure = buildTelemetryPressure({
    farms: farms.data,
    devices: mergedDevices,
    telemetry: telemetry.data,
    openAlerts: normalizedAlerts
  });
  const telemetryOutcomeTrends = buildTelemetryOutcomeTrends({
    events: telemetryOutcomeEvents.data,
    farms: farms.data
  });
  let reports = mergeTelemetryOutcomesIntoReports(
    mergeTelemetryIntoReports(baseReports, telemetryPressure),
    telemetryOutcomeTrends
  );
  const handoffHistoryByFarmId = new Map();
  for (const note of handoffNotes.data) {
    if (!note?.farm_id) {
      continue;
    }

    const normalizedNote = {
      id: note.id,
      note: note.details_json?.note ?? "",
      created_at: note.created_at ?? null
    };

    if (!latestHandoffByFarmId.has(note.farm_id)) {
      latestHandoffByFarmId.set(note.farm_id, normalizedNote);
    }

    const existingHistory = handoffHistoryByFarmId.get(note.farm_id) ?? [];
    if (existingHistory.length < 5) {
      existingHistory.push(normalizedNote);
      handoffHistoryByFarmId.set(note.farm_id, existingHistory);
    }
  }

  const notificationDispatch = buildNotificationDispatchQueue({
    alerts: filteredAlerts,
    reportRows: reports,
    telemetryOutcomeTrends,
    notificationCoverage
  });
  reports = mergeNotificationDispatchIntoReports(reports, notificationDispatch);
  const followUpQueue = buildFollowUpQueue({
    farms: farms.data,
    reportRows: reports,
    telemetryPressure,
    telemetryOutcomeTrends,
    notificationCoverage,
    notificationDispatch
  }).map((item) => ({
    ...item,
    latestHandoff: latestHandoffByFarmId.get(item.farmId) ?? null,
    handoffHistory: handoffHistoryByFarmId.get(item.farmId) ?? []
  }));

  return {
    authorized,
    reportWindow,
    severityFilter,
    sourceFilter,
    farms: farms.data,
    devices: mergedDevices,
    openAlerts: filteredAlerts,
    recentCommands: commands.data,
    metrics: {
      farmCount: farms.data.length,
      deviceCount: mergedDevices.length,
      onlineCount,
      attentionCount,
      criticalAlertCount,
      missingContactCount,
      farmsWithDeliveryCoverage: notificationCoverage.byFarm.filter((farm) => farm.hasCoverage).length,
      missingHandoffCount: Math.max(farms.data.length - latestHandoffByFarmId.size, 0),
      expectationRecoveredCount: resolvedExpectationAlerts.data.length
    },
    alertMetrics: {
      bySource: {
        record: filteredAlerts.filter((alert) => alert.sourceLabel === "record").length,
        telemetry: filteredAlerts.filter((alert) => alert.sourceLabel === "telemetry").length,
        expectation: filteredAlerts.filter((alert) => alert.sourceLabel === "expectation").length,
        system: filteredAlerts.filter((alert) => alert.sourceLabel === "system").length
      },
      topTypes: Object.entries(
        filteredAlerts.reduce((accumulator, alert) => {
          accumulator[alert.alert_type] = (accumulator[alert.alert_type] ?? 0) + 1;
          return accumulator;
        }, {})
      )
        .sort((left, right) => right[1] - left[1])
        .slice(0, 6)
        .map(([alertType, count]) => ({ alertType, count }))
    },
    notificationCoverage,
    notificationDispatch,
    telemetryPressure,
    telemetryOutcomeTrends,
    expectationMetrics,
    expectationTrends,
    followUpQueue,
    reports,
    errors: [
      farms.error,
      devices.error,
      statuses.error,
      alerts.error,
      commands.error,
      templates.error,
      records.error,
      expectationHistory.error,
      resolvedExpectationAlerts.error,
      handoffNotes.error,
      notificationPreferences.error,
      telemetryOutcomeEvents.error,
      telemetry.error
    ].filter(Boolean)
  };
}
