import { Trophy } from "lucide-react"

import type { GroupRank } from "@/data/calculator"
import { cn } from "@/lib/utils"

type CalculatorRankingProps = {
  collegeRanks: GroupRank[]
  organizationRanks: GroupRank[]
}

const podiumStyles = [
  {
    label: "Gold",
    wrap: "bg-[#f5e6a8] text-[#9a7b0c]",
    icon: "text-[#c9a227]",
  },
  {
    label: "Silver",
    wrap: "bg-[#e4e7eb] text-[#5b6570]",
    icon: "text-[#8e98a4]",
  },
  {
    label: "Bronze",
    wrap: "bg-[#efd4c0] text-[#8a5528]",
    icon: "text-[#b87333]",
  },
] as const

function RankBadge({ index }: { index: number }) {
  const podium = podiumStyles[index]

  if (podium) {
    return (
      <span
        className={cn(
          "surface-chip flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          podium.wrap
        )}
        aria-label={`${podium.label} trophy`}
        title={podium.label}
      >
        <Trophy className={cn("size-4", podium.icon)} strokeWidth={2.25} />
      </span>
    )
  }

  return (
    <span className="surface-chip flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-black text-foreground">
      {index + 1}
    </span>
  )
}

function RankList({
  title,
  ranks,
}: {
  title: string
  ranks: GroupRank[]
}) {
  return (
    <div>
      <div className="border-b border-border/80 px-5 py-2.5">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {title}
        </p>
      </div>
      {ranks.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          No borrows yet.
        </p>
      ) : (
        <ol className="divide-y divide-border/70">
          {ranks.map((rank, index) => (
            <li
              key={rank.key}
              className="flex items-center gap-3 px-5 py-2.5 transition-colors duration-150 hover:bg-lime/25 dark:hover:bg-lime/10"
            >
              <RankBadge index={index} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{rank.label}</p>
              </div>
              <span className="text-sm font-bold tabular-nums">
                {rank.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function CalculatorRanking({
  collegeRanks,
  organizationRanks,
}: CalculatorRankingProps) {
  return (
    <section className="surface-card flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/80 px-5 py-4">
        <h2 className="text-lg font-bold tracking-[-0.03em]">Ranking</h2>
        <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Top colleges & orgs
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <RankList title="Top colleges" ranks={collegeRanks} />
        <div className="border-t border-border/80" />
        <RankList title="Top organizations" ranks={organizationRanks} />
      </div>
    </section>
  )
}
