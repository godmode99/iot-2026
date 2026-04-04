export function getDashboardConfig() {
  return {
    port: Number(process.env.DASHBOARD_PORT ?? 3000),
    appUrl: process.env.APP_URL ?? "http://localhost:3000",
    backendUrl: process.env.BACKEND_URL ?? "http://localhost:3100",
    mapProvider: process.env.NEXT_PUBLIC_MAP_PROVIDER ?? "mapbox"
  };
}

