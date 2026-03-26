import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Malus Robotics Workspace",
  description: "Employee Desk — Malus Robotics Internal Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          This script runs SYNCHRONOUSLY before any paint.
          It reads localStorage and sets data-theme on <html>
          before React hydrates, preventing the dark→light flash.
          suppressHydrationWarning on <html> is required for this pattern.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('mr-theme');
                  if (theme === 'light' || theme === 'dark') {
                    document.documentElement.setAttribute('data-theme', theme);
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontFamily: "'Syne', sans-serif",
              fontSize: "0.82rem",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}