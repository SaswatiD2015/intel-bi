import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RealOnes BI — Real Data, Real Metrics, Real Decisions",
  description: "A governed, explainable AI-powered Business Intelligence platform for non-technical users. Ask business questions in plain English and receive validated, transparent answers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
