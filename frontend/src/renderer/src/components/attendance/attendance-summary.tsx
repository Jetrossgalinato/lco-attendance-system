import type { AttendanceSummary } from "@/data/attendance"
import { cn } from "@/lib/utils"

type AttendanceSummaryCardsProps = {
  summary: AttendanceSummary
}

const cards: Array<{
  key: keyof AttendanceSummary
  label: string
  format?: (value: number) => string
}> = [
  { key: "total", label: "Checked in" },
  { key: "present", label: "Present" },
  { key: "late", label: "Late" },
  {
    key: "rate",
    label: "On-time rate",
    format: (value) => `${value}%`,
  },
]

export function AttendanceSummaryCards({
  summary,
}: AttendanceSummaryCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.key}
          className={cn("surface-card surface-card-hover px-5 py-5")}
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {card.label}
          </p>
          <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground">
            {card.format
              ? card.format(summary[card.key])
              : summary[card.key]}
          </p>
        </article>
      ))}
    </section>
  )
}
