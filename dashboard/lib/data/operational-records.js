import { getDashboardDb } from "@/lib/backend/db.js";
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

const DEFAULT_TEMPLATE_FIELD_ROWS = [
  {
    template_code: "daily_operations",
    field_key: "checklist_completed",
    field_type: "boolean",
    label: "Checklist completed",
    unit: null,
    placeholder: null,
    sort_order: 10,
    is_required: false
  },
  {
    template_code: "daily_operations",
    field_key: "observation_note",
    field_type: "text",
    label: "Observation note",
    unit: null,
    placeholder: "Stock active, feeding normal, no visible issue.",
    sort_order: 20,
    is_required: false
  },
  {
    template_code: "water_quality_round",
    field_key: "water_temperature_c",
    field_type: "number",
    label: "Water temperature",
    unit: "C",
    placeholder: "28.4",
    sort_order: 10,
    is_required: false
  },
  {
    template_code: "water_quality_round",
    field_key: "salinity_ppt",
    field_type: "number",
    label: "Salinity",
    unit: "ppt",
    placeholder: "25",
    sort_order: 20,
    is_required: false
  },
  {
    template_code: "water_quality_round",
    field_key: "dissolved_oxygen_mg_l",
    field_type: "number",
    label: "Dissolved oxygen",
    unit: "mg/L",
    placeholder: "5.8",
    sort_order: 30,
    is_required: false
  },
  {
    template_code: "water_quality_round",
    field_key: "observation_note",
    field_type: "text",
    label: "Observation note",
    unit: null,
    placeholder: "Stock active, feeding normal, no visible issue.",
    sort_order: 40,
    is_required: false
  },
  {
    template_code: "hatchery_observation",
    field_key: "dissolved_oxygen_mg_l",
    field_type: "number",
    label: "Dissolved oxygen",
    unit: "mg/L",
    placeholder: "5.8",
    sort_order: 10,
    is_required: false
  },
  {
    template_code: "hatchery_observation",
    field_key: "checklist_completed",
    field_type: "boolean",
    label: "Checklist completed",
    unit: null,
    placeholder: null,
    sort_order: 20,
    is_required: false
  },
  {
    template_code: "hatchery_observation",
    field_key: "observation_note",
    field_type: "text",
    label: "Observation note",
    unit: null,
    placeholder: "Stock active, feeding normal, no visible issue.",
    sort_order: 30,
    is_required: false
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

export function isTemplateAvailableForFarm(template, farmId) {
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

  if (!farmId) {
    return true;
  }

  return assignedFarmIds.includes(farmId);
}

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

function buildTemplateFieldSupport(templates = [], rows = []) {
  const safeRows = rows.length ? rows : DEFAULT_TEMPLATE_FIELD_ROWS;
  const fieldCatalogMap = new Map();
  const templateFieldMap = {};
  const templateFieldGroups = {};

  safeRows.forEach((row) => {
    const normalizedField = {
      key: row.field_key,
      type: row.field_type,
      label: row.label,
      unit: row.unit,
      placeholder: row.placeholder ?? "",
      required: row.is_required === true,
      sort_order: row.sort_order ?? 0
    };

    if (!fieldCatalogMap.has(normalizedField.key)) {
      fieldCatalogMap.set(normalizedField.key, normalizedField);
    }

    templateFieldMap[row.template_code] = [...(templateFieldMap[row.template_code] ?? []), normalizedField.key];
    templateFieldGroups[row.template_code] = [...(templateFieldGroups[row.template_code] ?? []), normalizedField];
  });

  Object.keys(templateFieldGroups).forEach((templateCode) => {
    templateFieldGroups[templateCode] = templateFieldGroups[templateCode]
      .slice()
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  });

  return {
    fieldCatalog: Array.from(fieldCatalogMap.values()),
    templateFieldMap,
    templateFieldGroups,
    templates: templates.map((template) => ({
      ...template,
      fields: templateFieldGroups[template.code] ?? []
    }))
  };
}

function enrichTemplatesWithUsage(templates = [], usageRows = []) {
  const usageMap = new Map(
    usageRows.map((row) => [
      row.template_id,
      {
        record_count: Number(row.record_count ?? 0),
        last_recorded_for_date: row.last_recorded_for_date ?? null
      }
    ])
  );

  return templates.map((template) => ({
    ...template,
    usage: usageMap.get(template.id) ?? {
      record_count: 0,
      last_recorded_for_date: null
    }
  }));
}

function enrichTemplatesWithAssignments(templates = [], assignmentRows = []) {
  const assignmentMap = new Map();

  assignmentRows.forEach((row) => {
    const templateId = row.template_id;
    if (!templateId) {
      return;
    }

    const current = assignmentMap.get(templateId) ?? [];
    current.push({
      farm_id: row.farm_id,
      farm_name: relationFirst(row.farms)?.name ?? null
    });
    assignmentMap.set(templateId, current);
  });

  return templates.map((template) => {
    const assignments = assignmentMap.get(template.id) ?? [];
    return {
      ...template,
      assigned_farms: assignments,
      assigned_farm_ids: assignments.map((assignment) => assignment.farm_id)
    };
  });
}

async function loadTemplateUsageStats() {
  try {
    const sql = getDashboardDb();
    const rows = await sql`
      select
        template_id,
        count(*)::int as record_count,
        max(recorded_for_date) as last_recorded_for_date
      from public.operational_records
      where template_id is not null
      group by template_id
    `;

    return {
      data: rows,
      error: null
    };
  } catch (error) {
    return {
      data: [],
      error: `record_template_usage: ${error instanceof Error ? error.message : "unknown_error"}`
    };
  }
}

function getTemplateFields(templateCode, templateFieldGroups = null) {
  if (templateFieldGroups?.[templateCode]?.length) {
    return templateFieldGroups[templateCode];
  }

  const templateKeys = TEMPLATE_FIELD_KEY_MAP[templateCode] ?? OPERATIONAL_RECORD_FIELD_DEFINITIONS.map((field) => field.key);
  return OPERATIONAL_RECORD_FIELD_DEFINITIONS.filter((field) => templateKeys.includes(field.key));
}

function filterConsumableTemplates(templates = []) {
  return templates.filter((template) => {
    if (template.is_active === false) {
      return false;
    }

    if (template.scope_type === "organization") {
      return false;
    }

    return true;
  });
}

async function loadRecordSupportData(supabase, options = {}) {
  const includeInactive = options.includeInactive === true;
  const includeOrganizationScoped = options.includeOrganizationScoped === true;

  const [templatesResult, farmsResult, templateFieldsResult] = await Promise.all([
    supabase
      .from("record_templates")
      .select("id,code,name,description,scope_type,organization_id,is_active")
      .order("name", { ascending: true })
      .limit(12),
    supabase
      .from("farms")
      .select("id,name,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("record_template_fields")
      .select("field_key,field_type,label,unit,placeholder,sort_order,is_required,record_templates(code)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(200)
  ]);
  const assignmentsResult = await supabase
    .from("record_template_farm_assignments")
    .select("template_id,farm_id,farms(name)")
    .limit(400);

  const templates = normalizeResult("record_templates", templatesResult);
  const farms = normalizeResult("farms", farmsResult);
  const templateFields = normalizeResult("record_template_fields", templateFieldsResult);
  const assignments = normalizeResult("record_template_farm_assignments", assignmentsResult);
  const baseTemplates = templates.data.length ? templates.data : DEFAULT_TEMPLATES;
  const safeTemplates = includeInactive || includeOrganizationScoped
    ? baseTemplates.filter((template) => {
      if (!includeInactive && template.is_active === false) {
        return false;
      }

      if (!includeOrganizationScoped && template.scope_type === "organization") {
        return false;
      }

      return true;
    })
    : filterConsumableTemplates(baseTemplates);
  const normalizedTemplateFieldRows = (templateFields.data ?? [])
    .map((row) => ({
      ...row,
      template_code: relationFirst(row.record_templates)?.code ?? null
    }))
    .filter((row) => row.template_code);
  const usageStats = await loadTemplateUsageStats();
  const templateSupport = buildTemplateFieldSupport(
    enrichTemplatesWithAssignments(
      enrichTemplatesWithUsage(safeTemplates, usageStats.data),
      assignments.data
    ),
    normalizedTemplateFieldRows
  );

  return {
    templates: templateSupport.templates,
    farms: farms.data,
    fieldCatalog: templateSupport.fieldCatalog,
    templateFieldMap: templateSupport.templateFieldMap,
    templateFieldGroups: templateSupport.templateFieldGroups,
    errors: [templates.error, farms.error, templateFields.error, assignments.error, usageStats.error].filter(Boolean)
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

function normalizeDateRange(value) {
  return ["7d", "30d", "90d", "all"].includes(value) ? value : "30d";
}

function dateRangeStart(dateRange) {
  if (dateRange === "all") {
    return null;
  }

  const days = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : 30;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

export async function loadOperationalRecordsOverview(filters = {}) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_RECORDS_OVERVIEW;
  }

  const farmId = String(filters.farmId ?? "").trim();
  const status = filters.status === "draft" || filters.status === "submitted" ? filters.status : "";
  const search = String(filters.search ?? "").trim();
  const dateRange = normalizeDateRange(String(filters.dateRange ?? "").trim());

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

  const startDate = dateRangeStart(dateRange);
  if (startDate) {
    recordsQuery = recordsQuery.gte("recorded_for_date", startDate.slice(0, 10));
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
      search,
      dateRange
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
    fields: defaultTemplate ? getTemplateFields(defaultTemplate.code, overview.templateFieldGroups) : overview.fieldCatalog,
    fieldCatalog: overview.fieldCatalog ?? OPERATIONAL_RECORD_FIELD_DEFINITIONS,
    templateFieldMap: overview.templateFieldMap ?? TEMPLATE_FIELD_KEY_MAP,
    templateFieldGroups: overview.templateFieldGroups ?? {},
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
    fields: getTemplateFields(record?.record_templates?.code, support.templateFieldGroups),
    fieldCatalog: support.fieldCatalog ?? OPERATIONAL_RECORD_FIELD_DEFINITIONS,
    templateFieldMap: support.templateFieldMap ?? TEMPLATE_FIELD_KEY_MAP,
    templateFieldGroups: support.templateFieldGroups ?? {},
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

export async function loadRecordTemplateCatalog() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const templateSupport = buildTemplateFieldSupport(DEFAULT_TEMPLATES, DEFAULT_TEMPLATE_FIELD_ROWS);
    return {
      templates: templateSupport.templates,
      errors: []
    };
  }

  const support = await loadRecordSupportData(supabase, {
    includeInactive: true,
    includeOrganizationScoped: true
  });
  return {
    templates: support.templates,
    errors: support.errors
  };
}

export async function loadRecordTemplateEditorContext({ templateId }) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      template: null,
      errors: []
    };
  }

  const support = await loadRecordSupportData(supabase, {
    includeInactive: true,
    includeOrganizationScoped: true
  });
  const template = support.templates.find((item) => item.id === templateId) ?? null;

  return {
    template,
    farms: support.farms,
    errors: support.errors
  };
}
