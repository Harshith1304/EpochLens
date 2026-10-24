import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "EpochLens India — slide through the story of the subcontinent",
  description: "Pick any year or drag the timeline to see what was happening across the Indian subcontinent, from the Indus cities to independence, with every entry traced to its source.",
  openGraph: { title: "EpochLens India", description: "Slide through the story of the subcontinent.", type: "website" },
};
export const viewport: Viewport = { themeColor: "#0c1714", width: "device-width", initialScale: 1 };

const themeInit = `try{var t=localStorage.getItem("q-theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body>{children}</body>
    </html>
  );
}
