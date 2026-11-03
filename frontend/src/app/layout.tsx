import type { Metadata } from "next";
import "./globals.css";
import { AppLayoutWrapper } from "@/components/AppLayoutWrapper";

export const metadata: Metadata = {
  title: "AICTE Case Monitor — Central Grievance & SLA Oversight System",
  description: "AI-powered central grievance tracking, bureau escalation, explainable institutional risk scores, and SLA compliance monitoring for technical education.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}
