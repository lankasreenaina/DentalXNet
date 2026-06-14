import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  title: "DentalXNet | AI-Powered OPG Analysis System",
  description: "Privacy-aware web platform using hybrid CNN-Transformer (RT-DETR) for automated detection and classification of dental treatments from panoramic radiographs.",
  robots: "index, follow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
