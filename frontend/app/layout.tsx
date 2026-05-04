import { Courgette } from "next/font/google";
import "./reset.css"
import "./global.css";

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
    <html lang="en" suppressHydrationWarning>
      <body className={courgette.className}>{children}</body>
    </html>
  );
}