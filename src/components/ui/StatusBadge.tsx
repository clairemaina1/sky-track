import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "blue" | "ghost" | "gold";

const toneStyles: Record<Tone, string> = {
  green: "border-[var(--status-green)] text-[var(--status-green)] bg-[rgba(16,185,129,0.08)]",
  amber: "border-[var(--status-amber)] text-[var(--status-amber)] bg-[rgba(245,158,11,0.08)]",
  red: "border-[var(--status-red)] text-[var(--status-red)] bg-[rgba(239,68,68,0.1)]",
  blue: "border-[var(--status-blue)] text-[var(--status-blue)] bg-[rgba(59,130,246,0.08)]",
  ghost: "border-[var(--border-subtle)] text-[var(--text-secondary)] bg-transparent",
  gold: "border-[var(--accent-gold)] text-[var(--accent-gold)] bg-[rgba(212,168,67,0.08)]",
};

export function statusTone(status: string): Tone {
  switch (status) {
    case "In-Flight":
    case "Departed":
      return "blue";
    case "AOG":
    case "Cancelled":
    case "Critical":
    case "Held-Customs":
      return "red";
    case "Maintenance":
    case "Delayed":
    case "Pending-Parts":
    case "High":
    case "Fatigue-Hold":
      return "amber";
    case "On-Duty":
    case "Completed":
    case "Loaded":
    case "Arrived":
    case "In-Transit":
    case "Low":
      return "green";
    case "Off-Duty":
    case "On-Leave":
    case "Standby":
    case "Open":
    case "Scheduled":
    case "Boarding":
    case "Normal":
    case "Offloaded":
      return "ghost";
    case "In-Progress":
      return "blue";
    case "Escalated":
      return "red";
    default:
      return "ghost";
  }
}

export function StatusBadge({
  status,
  pulse = false,
  className,
}: {
  status: string;
  pulse?: boolean;
  className?: string;
}) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 border font-display uppercase text-[10px] tracking-[0.08em] font-semibold",
        toneStyles[tone],
        className,
      )}
      style={{ borderRadius: 2 }}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full", pulse && "pulse-dot")}
        style={{ background: "currentColor" }}
      />
      {status}
    </span>
  );
}
