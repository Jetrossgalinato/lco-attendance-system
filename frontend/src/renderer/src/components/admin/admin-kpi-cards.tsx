import type { AdminKpi } from "@/data/admin"
import { cn } from "@/lib/utils"

type AdminKpiCardsProps = {
  kpis: AdminKpi[]
}

export function AdminKpiCards({ kpis }: AdminKpiCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <article
          key={kpi.key}
          className={cn("surface-card surface-card-hover px-5 py-5")}
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {kpi.label}
          </p>
          <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground">
            {kpi.value}
          </p>
          <p className="mt-2 text-xs font-medium text-deep-lime">{kpi.delta}</p>
        </article>
      ))}
    </section>
  )
}
