export function getDashboardConfig() {
  return {
    port: Number(process.env.DASHBOARD_PORT ?? 3000),
    appUrl: process.env.APP_URL ?? "http://localhost:3000",
    backendUrl: process.env.BACKEND_URL ?? "http://localhost:3100",
    mapProvider: process.env.NEXT_PUBLIC_MAP_PROVIDER ?? "mapbox",
    adminApiToken: process.env.ADMIN_API_TOKEN ?? "",
    actorUserId: process.env.DASHBOARD_ACTOR_USER_ID ?? "11111111-1111-1111-1111-111111111111",
    allowActorOverride: (process.env.DASHBOARD_ALLOW_ACTOR_OVERRIDE ?? "false") === "true"
  };
}
