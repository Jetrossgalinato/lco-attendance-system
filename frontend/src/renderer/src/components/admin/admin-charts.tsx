import type { ReactNode } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type {
  NamedCount,
  StatusSlice,
  WeeklyAttendancePoint,
} from "@/data/admin"

const AXIS_STYLE = {
  fontSize: 12,
  fill: "var(--muted-foreground)",
}

const GRID_STROKE = "var(--border)"
const LIME = "#dce87a"
const INK_MUTED = "#8e98a4"

const COLLEGE_COLORS: Record<string, string> = {
  CCIS: "#f5c78a", // pastel orange
  COFES: "#9fd4a3", // pastel green
  CED: "#9bb7f0", // pastel blue
  CMNS: "#f0a8a8", // pastel red
  CEGS: "#c4a484", // pastel brown
}

type ChartCardProps = {
  title: string
  subtitle: string
  children: ReactNode
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <section className="surface-card flex min-h-[320px] flex-col overflow-hidden px-5 py-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold tracking-[-0.03em]">{title}</h2>
        <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {subtitle}
        </p>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

type TooltipPayloadItem = {
  name?: string
  value?: number | string
  color?: string
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-[var(--shadow-2)]">
      {label ? (
        <p className="mb-1 font-semibold text-foreground">{label}</p>
      ) : null}
      <ul className="space-y-0.5">
        {payload.map((item) => (
          <li key={item.name} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: item.color }}
            />
            <span>
              {item.name}:{" "}
              <span className="font-semibold text-foreground">{item.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function WeeklyAttendanceChart({
  data,
}: {
  data: WeeklyAttendancePoint[]
}) {
  return (
    <ChartCard title="Weekly attendance" subtitle="Present vs late · 7 days">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LIME} stopOpacity={0.55} />
              <stop offset="100%" stopColor={LIME} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="lateFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef9a9a" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#ef9a9a" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="present"
            name="Present"
            stroke={LIME}
            fill="url(#presentFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="late"
            name="Late"
            stroke="#ef9a9a"
            fill="url(#lateFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function BorrowsByCollegeChart({ data }: { data: NamedCount[] }) {
  return (
    <ChartCard title="Borrows by college" subtitle="Calculator loans · this week">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey="count"
            name="Borrows"
            radius={[8, 8, 0, 0]}
            maxBarSize={42}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLLEGE_COLORS[entry.name] ?? LIME}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function AttendanceStatusChart({ data }: { data: StatusSlice[] }) {
  return (
    <ChartCard title="Attendance status" subtitle="Present vs late · this week">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={90}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.fill} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function TopOrganizationsChart({ data }: { data: NamedCount[] }) {
  return (
    <ChartCard title="Top organizations" subtitle="Borrow volume · this week">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey="count"
            name="Borrows"
            fill={INK_MUTED}
            radius={[0, 8, 8, 0]}
            maxBarSize={22}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={index === 0 ? LIME : INK_MUTED}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
