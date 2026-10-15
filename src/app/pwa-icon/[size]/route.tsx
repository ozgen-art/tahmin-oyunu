import { ImageResponse } from "next/og";

const ALLOWED = new Set([180, 192, 512]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam);
  if (!ALLOWED.has(size)) return new Response("Not found", { status: 404 });

  // Maskable güvenli alanı için içerik ortada ve küçük tutuldu.
  const circle = Math.round(size * 0.62);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0a1a",
        }}
      >
        <div
          style={{
            width: circle,
            height: circle,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #f0cf87, #c9993f)",
            color: "#1a1130",
            fontSize: Math.round(circle * 0.34),
            fontWeight: 800,
            letterSpacing: -1,
          }}
        >
          UCL
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
