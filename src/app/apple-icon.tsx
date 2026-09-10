import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e85d04",
          color: "#fff",
          fontSize: 64,
          fontWeight: 700,
        }}
      >
        DC
      </div>
    ),
    { ...size },
  );
}
