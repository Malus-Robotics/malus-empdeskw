import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

// Same family as the PM tool (swap here if its ui-kit uses a different one)
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Malus Robotics — Employee Portal",
  description: "Employee workspace for Malus Robotics",
  applicationName: "Employee Desk",
  appleWebApp: { capable: true, title: "Employee Desk", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  viewportFit: "cover", // pair with env(safe-area-inset-*) padding on sidebar / bottom nav
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('mr-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <RegisterSW />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: "0.85rem",
              fontWeight: 500,
              boxShadow: "var(--shadow-pop)",
            },
          }}
        />
      </body>
    </html>
  );
}
