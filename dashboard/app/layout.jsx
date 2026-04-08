import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://iot-2026-dashboard.vercel.app"),
  title: "ArayaShiki Lab",
  description: "Production frontend shell for the SB-00 farm monitoring product by ArayaShiki Lab",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/brand/arayashiki-lab-logo-full-1024.png"
  },
  openGraph: {
    title: "ArayaShiki Lab",
    description: "SB-00 farm monitoring portal by ArayaShiki Lab",
    images: ["/brand/arayashiki-lab-logo-full-1024.png"]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
