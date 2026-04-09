import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";
import { loadOpsOverview, toOpsCsv } from "@/lib/data/ops-overview.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }

  const [{ data: userResult }, operatorResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("is_admin_or_operator")
  ]);

  if (!userResult?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (operatorResult.data !== true) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const report = searchParams.get("report") === "alerts" ? "alerts" : "discipline";
  const reportWindow = searchParams.get("window") === "7d" || searchParams.get("window") === "90d"
    ? searchParams.get("window")
    : "30d";
  const severityFilter = searchParams.get("severity") === "critical" || searchParams.get("severity") === "warning"
    ? searchParams.get("severity")
    : "all";
  const sourceFilter = searchParams.get("source") === "record" || searchParams.get("source") === "telemetry" || searchParams.get("source") === "expectation" || searchParams.get("source") === "system"
    ? searchParams.get("source")
    : "all";
  const ops = await loadOpsOverview({ reportWindow, severityFilter, sourceFilter });

  const rows = report === "alerts"
    ? ops.reports.alertPressureByFarm
    : ops.reports.disciplineByFarm;
  const csv = toOpsCsv(rows);
  const filename = report === "alerts"
    ? `ops-alert-pressure-${reportWindow}.csv`
    : `ops-discipline-${reportWindow}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
