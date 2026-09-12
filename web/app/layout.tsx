import React from 'react';

export const metadata = {
  title: 'NeerNetra — NDRF Government Emergency Command Portal',
  description: 'Real-time GLOF Flash Flood Telemetry, Live GPS Tracker & Unresponsive Citizen Triage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #030712; color: #f9fafb; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
