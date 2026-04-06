import "./globals.css";

export const metadata = {
  title: "SB-00 Portal",
  description: "Production frontend shell for SB-00 farm monitoring",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
