import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Malus Robotics Employee Desk",
    short_name: "Employee Desk",
    description: "Tasks, leaves, expenses and attendance for Malus Robotics employees",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5fa",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the app icon on Android for quick jumps.
    // /dashboard/tasks and /dashboard/leaves are guesses: match them to your real folders.
    shortcuts: [
      { name: "My tasks", url: "/dashboard/tasks", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Leaves", url: "/dashboard/leaves", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
