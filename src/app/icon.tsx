import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon dinâmico — marca DC em laranja. */
export default function Icon() {
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
          fontSize: 16,
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        DC
      </div>
    ),
    { ...size },
  );
}
