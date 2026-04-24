"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  Filter,
  Lightbulb,
  RefreshCw,
  Save,
  Share2,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

type ReviewStatus = "replied" | "pending" | "needs_attention";
type Review = {
  id: number;
  name: string;
  rating: number;
  text: string;
  date: string;
  status: ReviewStatus;
};

const REVIEWS: Review[] = [
  { id: 1, name: "Priya Sharma", rating: 5, text: "Absolutely love this place! Friendly staff and top-notch service.", date: "Today, 9:14 AM", status: "needs_attention" },
  { id: 2, name: "Rahul Mehta", rating: 2, text: "Waited too long despite appointment. Service quality was okay.", date: "Today, 7:02 AM", status: "needs_attention" },
  { id: 3, name: "Anita Kulkarni", rating: 4, text: "Great overall service. Comfortable and professional team.", date: "Mar 6", status: "replied" },
  { id: 4, name: "Vikram Tiwari", rating: 3, text: "Average experience, not bad but not memorable either.", date: "Mar 5", status: "pending" },
  { id: 5, name: "Sunita Rao", rating: 5, text: "Best salon in the area. Great consistency and care.", date: "Mar 4", status: "needs_attention" },
];

const CHANNEL_DATA = [
  { name: "Organic Search", value: 82.4, color: "rgb(14, 107, 235)" },
  { name: "Direct", value: 16.1, color: "rgb(249, 115, 22)" },
  { name: "Referral", value: 1.1, color: "rgb(34, 197, 94)" },
  { name: "Social", value: 0.4, color: "rgb(244, 63, 94)" },
];

const USERS_OVER_TIME = [
  { date: "15 Apr", full: "Wednesday, 15 Apr 2020", users: 301 },
  { date: "16 Apr", full: "Thursday, 16 Apr 2020", users: 285 },
  { date: "17 Apr", full: "Friday, 17 Apr 2020", users: 312 },
  { date: "18 Apr", full: "Saturday, 18 Apr 2020", users: 298 },
  { date: "19 Apr", full: "Sunday, 19 Apr 2020", users: 310 },
  { date: "20 Apr", full: "Monday, 20 Apr 2020", users: 295 },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i <= rating ? "fill-warning-500 text-warning-500" : "fill-base-200 text-base-200")} />
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const [filterRating, setFilterRating] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (filterRating === "all") return REVIEWS;
    if (filterRating === "positive") return REVIEWS.filter((r) => r.rating >= 4);
    if (filterRating === "negative") return REVIEWS.filter((r) => r.rating <= 2);
    return REVIEWS.filter((r) => r.status !== "replied");
  }, [filterRating]);

  const pendingCount = REVIEWS.filter((r) => r.status !== "replied").length;
  const avgRating = (REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length).toFixed(1);
  const responseRate = Math.round((REVIEWS.filter((r) => r.status === "replied").length / REVIEWS.length) * 100);

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Reviews overview</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="base-ghost" size="sm" className="gap-1.5 text-[var(--text-secondary)]"><Save className="h-4 w-4" />Save</Button>
        <Button variant="base-ghost" size="sm" className="gap-1.5 text-[var(--text-secondary)]"><Download className="h-4 w-4" />Export</Button>
        <Button variant="base-ghost" size="sm" className="gap-1.5 text-[var(--text-secondary)]"><Share2 className="h-4 w-4" />Share</Button>
        <Button variant="base-ghost" size="sm" className="gap-1.5 text-[var(--text-secondary)]"><Lightbulb className="h-4 w-4" />Insights</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="brand-soft">All reviews 100.00% users</Button>
        <Button variant="base-outline" size="sm">+ Add segment</Button>
        <Select defaultValue="channels">
          <SelectTrigger className="h-8 w-fit min-w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="channels">Top channels</SelectItem></SelectContent>
        </Select>
        <div className="rounded-md border border-border px-3 py-1.5 text-sm text-[var(--text-secondary)]">14 Apr 2020 - 20 Apr 2020</div>
      </div>

      {pendingCount > 0 && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{pendingCount} reviews need a reply</AlertTitle>
          <AlertDescription>Businesses that reply within 24 hours rank higher on Google Maps.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total reviews" value="248" trend="up" trendValue="+12 this month" icon={<Sparkles className="h-5 w-5" />} />
        <StatCard label="Avg. rating" value={avgRating} trend="up" trendValue="+0.2 vs last month" icon={<Star className="h-5 w-5" />} />
        <StatCard label="Response rate" value={`${responseRate}%`} trend="down" trendValue="-3% this month" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Needs reply" value={String(pendingCount)} trend="neutral" trendValue="across all locations" icon={<AlertCircle className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Channels</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={CHANNEL_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={1} dataKey="value" nameKey="name">
                    {CHANNEL_DATA.map((entry) => <Cell key={entry.name} fill={entry.color} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Users</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={USERS_OVER_TIME} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(14, 107, 235)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="rgb(14, 107, 235)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={["dataMin - 20", "dataMax + 20"]} />
                  <RechartsTooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.full} formatter={(value: number) => [`${value} users`, "Users"]} />
                  <Area type="monotone" dataKey="users" stroke="rgb(14, 107, 235)" strokeWidth={2} fill="url(#usersGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">Reviews</h2>
            <p className="text-xs text-[var(--text-muted)]">Showing {filtered.length} of {REVIEWS.length} reviews</p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium bg-transparent border border-outline-default-border hover:bg-soft-default-bg rounded-md gap-1.5">
                <Filter className="h-3.5 w-3.5" />Filter
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52">
                <PopoverHeader><PopoverTitle>Filter by</PopoverTitle></PopoverHeader>
                <div className="space-y-2 pt-2">
                  {[
                    { value: "all", label: "All reviews" },
                    { value: "pending", label: "Needs reply" },
                    { value: "positive", label: "Positive (4-5★)" },
                    { value: "negative", label: "Negative (1-2★)" },
                  ].map(({ value, label }) => (
                    <button key={value} onClick={() => setFilterRating(value)} className={cn("w-full text-left rounded-md px-2 py-1.5 text-sm", filterRating === value ? "bg-soft-brand-bg text-soft-brand-text" : "hover:bg-[var(--bg-subtle)]")}>
                      {label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="base-ghost"
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 800);
              }}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-border">
                <Skeleton className="h-9 w-9 rounded-full bg-base-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-base-200" />
                  <Skeleton className="h-3 w-full bg-base-200" />
                  <Skeleton className="h-3 w-2/3 bg-base-200" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border border border-border bg-[var(--bg-surface)] rounded-md">
            <div className="flex items-center gap-3 px-4 py-2">
              <Checkbox
                id="select-all"
                checked={selectedIds.length === filtered.length && filtered.length > 0}
                onCheckedChange={(v) => setSelectedIds(v ? filtered.map((r) => r.id) : [])}
              />
              <Label htmlFor="select-all" className="text-xs text-[var(--text-muted)] cursor-pointer">
                {selectedIds.length > 0 ? `${selectedIds.length} selected` : "Select all"}
              </Label>
            </div>
            {filtered.map((review) => (
              <div key={review.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{review.name}</span>
                  <StarRating rating={review.rating} />
                  <Badge variant={review.status === "replied" ? "success" : review.status === "pending" ? "warning" : "error"}>
                    {review.status === "replied" ? "Replied" : review.status === "pending" ? "Pending" : "Needs reply"}
                  </Badge>
                  <span className="text-xs text-[var(--text-muted)] ml-auto">{review.date}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{review.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
