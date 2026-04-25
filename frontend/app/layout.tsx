import "./reset.css";
import "./global.css";

import { Courgette } from "next/font/google";

const courgette = Courgette({
  subsets: ["latin"],
  weight: "400",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={courgette.className}>{children}</body>
    </html>
  );
}