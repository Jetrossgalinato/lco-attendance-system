import type { CalculatorSummary } from "@/data/calculator"
import { cn } from "@/lib/utils"

type CalculatorSummaryCardsProps = {
  summary: CalculatorSummary
}

const cards: Array<{
  key: keyof CalculatorSummary
  label: string
  format?: (value: number) => string
}> = [
  { key: "outNow", label: "Out now" },
  { key: "borrowedToday", label: "Borrowed today" },
  { key: "returnedToday", label: "Returned today" },
  {
    key: "returnRate",
    label: "Return rate",
    format: (value) => `${value}%`,
  },
]

export function CalculatorSummaryCards({
  summary,
}: CalculatorSummaryCardsProps) {
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
