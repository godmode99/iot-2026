import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const DEFAULT_TEMPLATES = [
  {
    id: "daily-operations",
    code: "daily_operations",
    name: "Daily Operations",
    description: "Capture daily hatchery or farm work in one structured record."
  },
  {
    id: "water-quality-round",
    code: "water_quality_round",
    name: "Water Quality Round",
    description: "Record water parameters, observations, and immediate follow-up notes."
  },
  {
    id: "hatchery-observation",
    code: "hatchery_observation",
    name: "Hatchery Observation",
    description: "Track stock condition, behavior, and operational observations."
  }
];

export const OPERATIONAL_RECORD_FIELD_DEFINITIONS = [
  {
    key: "water_temperature_c",
    type: "number",
    label: "Water temperature",
    unit: "°C",
    placeholder: "28.4"
  },
  {
    key: "salinity_ppt",
    type: "number",
    label: "Salinity",
    unit: "ppt",
    placeholder: "25"
  },
  {
    key: "dissolved_oxygen_mg_l",
    type: "number",
    label: "Dissolved oxygen",
    unit: "mg/L",
    placeholder: "5.8"
  },
  {
    key: "checklist_completed",
    type: "boolean",
    label: "Checklist completed"
  },
  {
    key: "observation_note",
    type: "text",
    label: "Observation note",
    placeholder: "Stock active, feeding normal, no visible issue."
  }
];

export const TEMPLATE_FIELD_KEY_MAP = {
  daily_operations: [
    "checklist_completed",
    "observation_note"
  ],
  water_quality_round: [
    "water_temperature_c",
    "salinity_ppt",
    "dissolved_oxygen_mg_l",
    "observation_note"
  ],
  hatchery_observation: [
    "dissolved_oxygen_mg_l",
    "checklist_completed",
    "observation_note"
  ]
};

const EMPTY_RECORDS_OVERVIEW = {
  records: [],
  templates: DEFAULT_TEMPLATES,
  farms: [],
  stats: {
    submitted: 0,
    drafts: 0,
    templates: DEFAULT_TEMPLATES.length
  },
  errors: []
};

const EMPTY_RECORD_DETAIL = {
  record: null,
  alerts: [],
  templates: DEFAULT_TEMPLATES,
  farms: [],
  fields: OPERATIONAL_RECORD_FIELD_DEFINITIONS,
  fieldValues: {},
  errors: []
};

function normalizeResult(name, result) {
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

function relationFirst(value) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function normalizeOperationalRecord(record) {
  if (!record) {
    return null;
  }

  return {
    ...record,
    record_templates: relationFirst(record.record_templates),
    farms: relationFirst(record.farms),
    user_profiles: relationFirst(record.user_profiles),
    record_entries: Array.isArray(record.record_entries)
      ? [...record.record_entries].sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
      : []
  };
}

function buildFieldValues(entries = []) {
  const entryMap = new Map(entries.map((entry) => [entry.field_key, entry]));

  return Object.fromEntries(
    OPERATIONAL_RECORD_FIELD_DEFINITIONS.map((field) => {
      const entry = entryMap.get(field.key);

      if (!entry) {
        return [field.key, ""];
      }

      if (field.type === "number") {
        return [field.key, entry.value_number ?? ""];
      }

      if (field.type === "boolean") {
        return [field.key, entry.value_boolean === true ? "true" : ""];
      }

      return [field.key, entry.value_text ?? ""];
    })
  );
}

function getTemplateFields(templateCode) {
  const templateKeys = TEMPLATE_FIELD_KEY_MAP[templateCode] ?? OPERATIONAL_RECORD_FIELD_DEFINITIONS.map((field) => field.key);

  return OPERATIONAL_RECORD_FIELD_DEFINITIONS.filter((field) => templateKeys.includes(field.key));
}

async function loadRecordSupportData(supabase) {
  const [templatesResult, farmsResult] = await Promise.all([
    supabase
      .from("record_templates")
      .select("id,code,name,description")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(12),
    supabase
      .from("farms")
      .select("id,name,created_at")
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  const templates = normalizeResult("record_templates", templatesResult);
  const farms = normalizeResult("farms", farmsResult);
  const safeTemplates = templates.data.length ? templates.data : DEFAULT_TEMPLATES;

  return {
    templates: safeTemplates,
    farms: farms.data,
    errors: [templates.error, farms.error].filter(Boolean)
  };
}

function applyRecordSearch(records, search) {
  const normalizedSearch = String(search ?? "").trim().toLowerCase();
  if (!normalizedSearch) {
    return records;
  }

  return records.filter((record) => {
    const haystack = [
      record.record_templates?.name,
      record.record_templates?.code,
      record.farms?.name,
      record.notes_summary,
      record.user_profiles?.display_name
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

export async function loadOperationalRecordsOverview(filters = {}) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_RECORDS_OVERVIEW;
  }

  const farmId = String(filters.farmId ?? "").trim();
  const status = filters.status === "draft" || filters.status === "submitted" ? filters.status : "";
  const search = String(filters.search ?? "").trim();

  let recordsQuery = supabase
    .from("operational_records")
    .select("id,farm_id,template_id,record_status,recorded_for_date,notes_summary,created_at,updated_at,record_templates(id,name,code),farms(id,name),user_profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (farmId) {
    recordsQuery = recordsQuery.eq("farm_id", farmId);
  }

  if (status) {
    recordsQuery = recordsQuery.eq("record_status", status);
  }

  const [recordsResult, support] = await Promise.all([
    recordsQuery,
    loadRecordSupportData(supabase)
  ]);

  const records = normalizeResult("operational_records", recordsResult);
  const normalizedRecords = applyRecordSearch(records.data.map(normalizeOperationalRecord), search);

  return {
    records: normalizedRecords,
    templates: support.templates,
    farms: support.farms,
    stats: {
      submitted: normalizedRecords.filter((item) => item.record_status === "submitted").length,
      drafts: normalizedRecords.filter((item) => item.record_status === "draft").length,
      templates: support.templates.length
    },
    filters: {
      farmId,
      status,
      search
    },
    errors: [records.error, ...support.errors].filter(Boolean)
  };
}

export async function loadOperationalRecordCreateContext() {
  const overview = await loadOperationalRecordsOverview();
  const defaultTemplate = overview.templates[0] ?? null;

  return {
    templates: overview.templates,
    farms: overview.farms,
    fields: defaultTemplate ? getTemplateFields(defaultTemplate.code) : OPERATIONAL_RECORD_FIELD_DEFINITIONS,
    fieldCatalog: OPERATIONAL_RECORD_FIELD_DEFINITIONS,
    templateFieldMap: TEMPLATE_FIELD_KEY_MAP,
    defaultTemplateId: defaultTemplate?.id ?? "",
    errors: overview.errors
  };
}

export async function loadOperationalRecordDetail({ recordId }) {
  const safeRecordId = String(recordId ?? "").trim();
  if (!safeRecordId) {
    return {
      ...EMPTY_RECORD_DETAIL,
      errors: ["operational_record_detail: missing_record_id"]
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return EMPTY_RECORD_DETAIL;
  }

  const [recordResult, support] = await Promise.all([
    supabase
      .from("operational_records")
      .select(`
        id,
        farm_id,
        template_id,
        record_status,
        recorded_for_date,
        submitted_at,
        notes_summary,
        created_at,
        updated_at,
        record_templates(id,code,name,description),
        farms(id,name),
        user_profiles(display_name),
        record_entries(
          id,
          field_key,
          field_type,
          label,
          value_text,
          value_number,
          value_boolean,
          value_json,
          unit,
          sort_order,
          created_at
        )
      `)
      .eq("id", safeRecordId)
      .maybeSingle(),
    loadRecordSupportData(supabase)
  ]);

  if (recordResult.error) {
    return {
      ...EMPTY_RECORD_DETAIL,
      templates: support.templates,
      farms: support.farms,
      errors: [...support.errors, `operational_record_detail: ${recordResult.error.message}`]
    };
  }

  const record = normalizeOperationalRecord(recordResult.data);

  let alerts = [];
  let alertError = null;

  if (record?.farm_id) {
    const alertsResult = await supabase
      .from("alerts")
      .select("id,alert_type,severity,status,device_id,opened_at,resolved_at,devices(device_id,serial_number)")
      .eq("farm_id", record.farm_id)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(8);

    if (alertsResult.error) {
      alertError = `farm_alerts: ${alertsResult.error.message}`;
    } else {
      alerts = alertsResult.data ?? [];
    }
  }

  return {
    record,
    alerts,
    templates: support.templates,
    farms: support.farms,
    fields: getTemplateFields(record?.record_templates?.code),
    fieldCatalog: OPERATIONAL_RECORD_FIELD_DEFINITIONS,
    templateFieldMap: TEMPLATE_FIELD_KEY_MAP,
    defaultTemplateId: record?.template_id ?? support.templates[0]?.id ?? "",
    fieldValues: buildFieldValues(record?.record_entries),
    errors: [...support.errors, alertError].filter(Boolean)
  };
}

export async function loadOperationalRecordEditContext({ recordId }) {
  const detail = await loadOperationalRecordDetail({ recordId });

  if (!detail.record) {
    return detail;
  }

  const hasCurrentTemplate = detail.templates.some((template) => template.id === detail.record.template_id);
  const hasCurrentFarm = detail.farms.some((farm) => farm.id === detail.record.farm_id);

  return {
    ...detail,
    templates: hasCurrentTemplate
      ? detail.templates
      : [detail.record.record_templates, ...detail.templates].filter(Boolean),
    farms: hasCurrentFarm
      ? detail.farms
      : [detail.record.farms, ...detail.farms].filter(Boolean)
  };
}
