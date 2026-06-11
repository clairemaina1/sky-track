import logoUrl from "@/assets/skytrack-logo.png";

export function SkytrackLogo({
  size = 28,
  showWordmark = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
      >
        <div
          className="absolute inset-0 rounded-full opacity-40 blur-md"
          style={{
            background:
              "radial-gradient(circle, rgba(61,217,255,0.65), transparent 70%)",
          }}
        />
        <img
          src={logoUrl}
          alt="SKYTRACK"
          width={size}
          height={size}
          className="relative block"
          style={{
            filter: "drop-shadow(0 0 6px rgba(61,217,255,0.4))",
          }}
        />
      </div>
      {showWordmark && (
        <div className="leading-none">
          <div
            className="font-display font-bold tracking-[0.18em]"
            style={{
              fontSize: size > 32 ? 18 : 14,
              background:
                "linear-gradient(135deg, #3DD9FF 0%, #00C2A8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            SKYTRACK
          </div>
        </div>
      )}
    </div>
  );
}
