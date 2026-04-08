import "./globals.css";

export const metadata = {
  title: "ArayaShiki Lab",
  description: "Production frontend shell for the SB-00 farm monitoring product by ArayaShiki Lab",
  icons: {
    icon: "/brand/arayashiki-mark-square.png",
    shortcut: "/brand/arayashiki-mark-square.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
