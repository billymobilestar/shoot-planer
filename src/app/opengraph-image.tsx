import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ShootPlaner — Film Shoot Planning App";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1a1a1a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(200,112,64,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            position: "relative",
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: "#c87040",
              letterSpacing: "-2px",
            }}
          >
            ShootPlaner
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "#e8e4df",
              letterSpacing: "-0.5px",
            }}
          >
            Plan Your Film Shoots, Beautifully
          </div>

          {/* Sub */}
          <div
            style={{
              fontSize: 18,
              color: "#9a928a",
              textAlign: "center",
              maxWidth: 700,
              lineHeight: 1.5,
            }}
          >
            Itinerary · Moodboard · Shot List · Team Collaboration
          </div>

          {/* CTA pill */}
          <div
            style={{
              marginTop: 12,
              background: "#c87040",
              color: "#fff",
              fontSize: 18,
              fontWeight: 600,
              padding: "12px 32px",
              borderRadius: 999,
              letterSpacing: "0.2px",
            }}
          >
            Free to start — shootplaner.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
