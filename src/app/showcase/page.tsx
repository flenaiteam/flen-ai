"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun, Star, CheckCircle2, AlertTriangle, XCircle, Info, Search, Bell, MessageSquare, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { StatCard } from "@/components/ui/stat-card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount, AvatarBadge } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="pb-3 border-b border-[var(--border-default)]">
        <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
        {description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-4 w-4", i <= rating ? "fill-warning-500 text-warning-500" : "fill-base-200 text-base-200")} />
      ))}
      {count !== undefined && <span className="text-sm text-[var(--text-muted)]">({count})</span>}
    </div>
  );
}

export default function DesignSystemShowcase() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selectValue, setSelectValue] = useState("sunrise");
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] transition-colors duration-200">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--bg-page)]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl font-bold text-[var(--text-primary)]">
              flen<span className="text-brand-500">.</span>ai
            </span>
            <Badge variant="brand">Design System v1.0</Badge>
            <Link href="/dashboard">
              <Button variant="base-outline" size="sm">Example dashboard</Button>
            </Link>
          </div>
          <Button variant="base-ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle dark mode">
            {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-20 px-6 py-14">

        {/* Typography */}
        <Section title="Typography" description="Bricolage Grotesque for headings. DM Sans for body and UI text.">
          <div className="space-y-5">
            {[
              { label: "Display — 800", el: <p className="font-display text-4xl font-extrabold">Grow your reputation online</p> },
              { label: "H1 — 700", el: <h1 className="font-display text-3xl font-bold">Review Management Dashboard</h1> },
              { label: "H2 — 600", el: <h2 className="font-display text-2xl font-semibold">Recent Reviews</h2> },
              { label: "H3 — 600", el: <h3 className="font-display text-xl font-semibold">Sunrise Beauty Salon</h3> },
              { label: "Body", el: <p className="text-base text-[var(--text-primary)]">Manage your Google Business Profile reviews, respond to customers, and improve your online reputation — all in one place.</p> },
              { label: "Body SM — secondary", el: <p className="text-sm text-[var(--text-secondary)]">Last synced 2 minutes ago</p> },
              { label: "Caption — muted", el: <p className="text-xs text-[var(--text-muted)]">Showing 1–10 of 48 reviews</p> },
            ].map(({ label, el }) => (
              <div key={label} className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
                {el}
              </div>
            ))}
          </div>
        </Section>

        {/* Colors */}
        <Section title="Color Palette" description="Warm zinc base + fuchsia brand + semantic colors.">
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Base — Warm Zinc</p>
              <div className="flex gap-0.5">
                {[["bg-base-50","50"],["bg-base-100","100"],["bg-base-200","200"],["bg-base-300","300"],["bg-base-400","400"],["bg-base-500","500"],["bg-base-600","600"],["bg-base-700","700"],["bg-base-800","800"],["bg-base-900","900"],["bg-base-950","950"]].map(([cls, label]) => (
                  <div key={String(cls)} className="flex-1 min-w-0">
                    <div
                      className={cn(
                        String(cls),
                        "h-11 rounded-md border border-[var(--border-default)]",
                        cls === "bg-base-950" && "ring-1 ring-[var(--border-default)] ring-inset"
                      )}
                    />
                    <p className="mt-1.5 text-center text-[10px] font-medium text-[var(--text-muted)]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Semantic colors (same tokens as Buttons; switch with light/dark)</p>
              <div className="space-y-4">
                {[
                  { name: "Brand", solidBg: "bg-solid-brand-bg", solidText: "text-solid-brand-text", softBg: "bg-soft-brand-bg", softBorder: "border-soft-brand-border", softText: "text-soft-brand-text" },
                  { name: "Success", solidBg: "bg-solid-success-bg", solidText: "text-solid-success-text", softBg: "bg-soft-success-bg", softBorder: "border-soft-success-border", softText: "text-soft-success-text" },
                  { name: "Warning", solidBg: "bg-solid-warning-bg", solidText: "text-solid-warning-text", softBg: "bg-soft-warning-bg", softBorder: "border-soft-warning-border", softText: "text-soft-warning-text" },
                  { name: "Error", solidBg: "bg-solid-error-bg", solidText: "text-solid-error-text", softBg: "bg-soft-error-bg", softBorder: "border-soft-error-border", softText: "text-soft-error-text" },
                  { name: "Info", solidBg: "bg-solid-info-bg", solidText: "text-solid-info-text", softBg: "bg-soft-info-bg", softBorder: "border-soft-info-border", softText: "text-soft-info-text" },
                ].map(({ name, solidBg, solidText, softBg, softBorder, softText }) => (
                  <div key={name} className="flex items-center gap-5">
                    <p className="w-20 text-sm font-medium text-[var(--text-secondary)]">{name}</p>
                    <div className={cn(solidBg, solidText, "h-9 w-12 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] font-semibold")}>A</div>
                    <div className={cn(softBg, softBorder, "border h-9 w-12 rounded-md flex-shrink-0")} />
                    <span className={cn(softText, "text-sm font-semibold")}>Text on soft</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" description="Brand (fuchsia solid) is the default and only brand CTA.">
          <Row label="Brand — all modes">
            <Button variant="brand">Solid</Button>
            <Button variant="brand-soft">Soft</Button>
            <Button variant="brand-outline">Outline</Button>
            <Button variant="brand-ghost">Ghost</Button>
          </Row>
          <Row label="Base variants">
            <Button variant="base">Solid</Button>
            <Button variant="base-soft">Soft</Button>
            <Button variant="base-outline">Outline</Button>
            <Button variant="base-ghost">Ghost</Button>
          </Row>
          <Row label="Semantic solid">
            <Button variant="success">Confirm</Button>
            <Button variant="warning">Proceed</Button>
            <Button variant="error">Delete</Button>
          </Row>
          <Row label="Semantic soft">
            <Button variant="success-soft">Mark Resolved</Button>
            <Button variant="warning-soft">Review Later</Button>
            <Button variant="error-soft">Remove</Button>
          </Row>
          <Row label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon"><Bell className="h-4 w-4" /></Button>
          </Row>
          <Row label="Disabled">
            <Button disabled>Disabled</Button>
            <Button variant="brand-outline" disabled>Disabled Outline</Button>
            <Button variant="base-ghost" disabled>Disabled Ghost</Button>
          </Row>
        </Section>

        {/* Badges */}
        <Section title="Badges" description="Soft is default. Solid for emphasis. Outline for subtle labels.">
          <Row label="Soft">
            <Badge>Default</Badge>
            <Badge variant="base-soft">Base soft</Badge>
            <Badge variant="brand">Brand</Badge>
            <Badge variant="success">Active</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="error">Overdue</Badge>
            <Badge variant="info">Syncing</Badge>
          </Row>
          <Row label="Solid">
            <Badge variant="base-solid">Neutral</Badge>
            <Badge variant="brand-solid">Pro</Badge>
            <Badge variant="success-solid">Verified</Badge>
            <Badge variant="warning-solid">Action Needed</Badge>
            <Badge variant="error-solid">Flagged</Badge>
            <Badge variant="info-solid">New</Badge>
          </Row>
          <Row label="Outline">
            <Badge variant="base-outline">Base</Badge>
            <Badge variant="brand-outline">Flen AI</Badge>
            <Badge variant="success-outline">Responded</Badge>
            <Badge variant="warning-outline">Unread</Badge>
            <Badge variant="error-outline">Negative</Badge>
            <Badge variant="info-outline">Info</Badge>
          </Row>
        </Section>

        {/* Alerts */}
        <Section title="Alerts & Callouts" description="Left-accent soft mode is default. Solid only for critical messages.">
          <Alert variant="success"><CheckCircle2 /><AlertTitle>Response Sent</AlertTitle><AlertDescription>Your reply to Priya S. has been published on Google.</AlertDescription></Alert>
          <Alert variant="warning"><AlertTriangle /><AlertTitle>Profile Incomplete</AlertTitle><AlertDescription>Add your business hours to improve your local search ranking.</AlertDescription></Alert>
          <Alert variant="error"><XCircle /><AlertTitle>Sync Failed</AlertTitle><AlertDescription>Could not connect to Google Business Profile. Check your connection.</AlertDescription></Alert>
          <Alert variant="info"><Info /><AlertTitle>3 New Reviews</AlertTitle><AlertDescription>You have new reviews waiting for a response since your last visit.</AlertDescription></Alert>
          <Alert variant="success-solid"><CheckCircle2 /><AlertTitle>Subscription Active</AlertTitle><AlertDescription>Your Flen AI Pro plan is active. Next billing: April 1, 2026.</AlertDescription></Alert>
          <Alert variant="error-solid"><XCircle /><AlertTitle>Payment Failed</AlertTitle><AlertDescription>Update your billing information to avoid service interruption.</AlertDescription></Alert>
        </Section>

        {/* Forms */}
        <Section title="Form Elements" description="Their own state system — default, hover, focus, error, disabled.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="owner@salon.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <Input id="password" type="password" className="pl-9" placeholder="••••••••" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search">Search reviews</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <Input id="search" className="pl-9" placeholder="Search by name or keyword..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disabled-input">Google Place ID</Label>
              <Input id="disabled-input" disabled placeholder="Auto-detected on connection" />
              <p className="text-xs text-[var(--text-muted)]">Connected automatically when you link your account.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="err">Business name <span className="text-error-500">*</span></Label>
              <Input id="err" error defaultValue="Sunrise123!!" />
              <p className="text-xs text-error-600">Business name cannot contain special characters.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="reply">Reply template</Label>
              <Textarea id="reply" placeholder="Thank you for your kind review! We look forward to seeing you again..." rows={3} />
            </div>
            <div className="space-y-3">
              <Label>Notifications</Label>
              {["New reviews", "Negative reviews only", "Weekly digest"].map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <Checkbox id={opt} />
                  <Label htmlFor={opt} className="font-normal cursor-pointer">{opt}</Label>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <Label>Quick settings</Label>
              {[
                { id: "auto", label: "Auto-reply to 5-star reviews" },
                { id: "alerts", label: "Instant email alerts" },
                { id: "weekly", label: "Weekly performance report" },
              ].map(({ id, label }) => (
                <div key={id} className="flex items-center justify-between">
                  <Label htmlFor={id} className="font-normal cursor-pointer">{label}</Label>
                  <Switch id={id} />
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Stat Cards */}
        <Section title="Stat Cards" description="Top-of-dashboard metrics. Number-led, trend-aware.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Reviews" value="248" trend="up" trendValue="+12 this month" icon={<MessageSquare className="h-5 w-5" />} />
            <StatCard label="Average Rating" value="4.7" trend="up" trendValue="+0.2 vs last month" icon={<Star className="h-5 w-5" />} />
            <StatCard label="Response Rate" value="89%" trend="down" trendValue="-3% this month" icon={<Users className="h-5 w-5" />} />
          </div>
        </Section>

        {/* Star Ratings */}
        <Section title="Star Ratings" description="warning-500 filled, base-200 empty.">
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((r) => (
              <div key={r} className="flex items-center gap-4">
                <StarRating rating={r} count={r * 12} />
                <span className="text-sm text-[var(--text-secondary)]">{r}.0 out of 5</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards" description="Soft surface — 1-shade lift, subtle border, no heavy shadow.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sunrise Beauty Salon</CardTitle>
                <CardDescription>Connected · Synced 2 min ago</CardDescription>
              </CardHeader>
              <CardContent>
                <StarRating rating={4} count={87} />
                <p className="mt-3 text-sm text-[var(--text-secondary)]">3 unanswered reviews. Responding improves your local ranking.</p>
              </CardContent>
              <CardFooter className="justify-between">
                <Badge variant="warning">3 Pending</Badge>
                <Button size="sm">View Reviews</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Dr. Mehta&apos;s Dental Clinic</CardTitle>
                <CardDescription>Connected · Synced 1 hour ago</CardDescription>
              </CardHeader>
              <CardContent>
                <StarRating rating={5} count={134} />
                <p className="mt-3 text-sm text-[var(--text-secondary)]">All reviews answered. Great work keeping up!</p>
              </CardContent>
              <CardFooter className="justify-between">
                <Badge variant="success">All Caught Up</Badge>
                <Button size="sm" variant="base-soft">View Reviews</Button>
              </CardFooter>
            </Card>
          </div>
        </Section>

        {/* Table */}
        <Section title="Data Table" description="No card wrapper. Row dividers only. Status badges inline.">
          <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)]">
                  {["Reviewer","Rating","Review","Status","Date"].map((h) => (
                    <TableHead key={h} className="font-semibold text-[var(--text-primary)]">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Priya S.",  rating: 5, review: "Absolutely love this place! Staff are so friendly.", status: "success" as const, label: "Responded",  date: "Mar 5" },
                  { name: "Rahul M.", rating: 2, review: "Waited 45 min past my appointment. Disappointed.",   status: "error" as const,   label: "Needs Reply", date: "Mar 4" },
                  { name: "Anita K.", rating: 4, review: "Great service, will definitely come back.",           status: "success" as const, label: "Responded",  date: "Mar 3" },
                  { name: "Vikram T.",rating: 3, review: "Average experience, nothing special.",                status: "warning" as const, label: "Pending",     date: "Mar 2" },
                  { name: "Sunita R.",rating: 5, review: "Best salon in the area, highly recommended!",        status: "error" as const,   label: "Needs Reply", date: "Mar 1" },
                ].map((row) => (
                  <TableRow key={row.name} className="border-[var(--border-default)]">
                    <TableCell className="font-medium text-[var(--text-primary)]">{row.name}</TableCell>
                    <TableCell><StarRating rating={row.rating} /></TableCell>
                    <TableCell className="text-sm text-[var(--text-secondary)] max-w-[180px] truncate">{row.review}</TableCell>
                    <TableCell><Badge variant={row.status}>{row.label}</Badge></TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)]">{row.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        {/* Tabs — Base UI uses data-active */}
        <Section title="Tabs" description="Active tab uses brand-600 color.">
          <Tabs defaultValue="all">
            <TabsList>
              {[
                { value: "all", label: "All Reviews" },
                { value: "unanswered", label: "Unanswered" },
                { value: "negative", label: "Negative" },
              ].map(({ value, label }) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="all" className="mt-4"><p className="text-sm text-[var(--text-secondary)]">Showing all 248 reviews across connected businesses.</p></TabsContent>
            <TabsContent value="unanswered" className="mt-4"><p className="text-sm text-[var(--text-secondary)]">27 reviews waiting for a response.</p></TabsContent>
            <TabsContent value="negative" className="mt-4"><p className="text-sm text-[var(--text-secondary)]">12 reviews rated 3 stars or below need attention.</p></TabsContent>
          </Tabs>
        </Section>

        {/* Select */}
        <Section title="Select" description="Choose an option from a compact dropdown.">
          <div className="flex flex-col gap-2 max-w-xs">
            <div className="text-sm text-[var(--text-secondary)]">Location</div>
            <Select
              value={selectValue}
              onValueChange={(v) => setSelectValue(v ?? "sunrise")}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunrise">Sunrise Beauty Salon</SelectItem>
                <SelectItem value="mehta">Dr. Mehta&apos;s Dental Clinic</SelectItem>
                <SelectItem value="other">Other location</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        {/* Skeleton */}
        <Section title="Skeleton Loaders" description="Used during data fetching.">
          <div className="space-y-3">
            <Skeleton className="h-4 w-[60%] bg-base-200" />
            <Skeleton className="h-4 w-[80%] bg-base-200" />
            <Skeleton className="h-4 w-[40%] bg-base-200" />
            <div className="grid grid-cols-3 gap-4 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border border-[var(--border-default)] p-6 space-y-3">
                  <Skeleton className="h-4 w-[70%] bg-base-200" />
                  <Skeleton className="h-8 w-[50%] bg-base-200" />
                  <Skeleton className="h-3 w-[40%] bg-base-200" />
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Alert Dialog */}
        <Section title="Alert Dialog" description="Confirmation modals with destructive or important actions.">
          <Row label="Low-level composition">
            <AlertDialog>
              <AlertDialogTrigger
                className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium bg-solid-error-bg text-solid-error-text hover:opacity-90 active:opacity-95 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Delete account
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="error">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Row>
          <Row label="ConfirmAlertDialog (sign-out pattern)">
            <ConfirmAlertDialog
              title="Sign out?"
              description="Demo only — same helper used on /locations and GBP header. Confirm shows a toast."
              confirmLabel="Sign out"
              onConfirm={() => {
                toast.success("Sign-out confirmed (demo)");
              }}
              trigger={
                <Button variant="error" size="sm">
                  Sign out (demo)
                </Button>
              }
            />
          </Row>
        </Section>

        {/* Avatar */}
        <Section title="Avatar" description="User or entity image with fallback. Optional group and status badge.">
          <Row label="Sizes">
            <Avatar size="sm">
              <AvatarImage src="https://github.com/shadcn.png" alt="User" />
              <AvatarFallback>SM</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="User" />
              <AvatarFallback>MD</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>LG</AvatarFallback>
            </Avatar>
          </Row>
          <Row label="With badge">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="User" />
              <AvatarFallback>AB</AvatarFallback>
              <AvatarBadge className="bg-solid-success-bg" />
            </Avatar>
          </Row>
          <Row label="Group">
            <AvatarGroup>
              <Avatar>
                <AvatarFallback>P</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>R</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <AvatarGroupCount>+4</AvatarGroupCount>
            </AvatarGroup>
          </Row>
        </Section>

        {/* Drawer */}
        <Section title="Drawer" description="Bottom or side panel for mobile-friendly content.">
          <Drawer>
            <DrawerTrigger className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium bg-transparent text-outline-default-text border border-outline-default-border hover:bg-soft-default-bg rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
              Open drawer
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Drawer title</DrawerTitle>
                <DrawerDescription>Optional description or instructions.</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-4 text-sm text-[var(--text-secondary)]">
                Content goes here. Use DrawerFooter for actions.
              </div>
              <DrawerFooter>
                <Button>Submit</Button>
                <DrawerClose asChild>
                  <Button variant="base-outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Section>

        {/* Pagination */}
        <Section title="Pagination" description="Base-outline for active page, base-ghost for others.">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">10</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </Section>

        {/* Popover */}
        <Section title="Popover" description="Floating panel for extra content or actions.">
          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium bg-transparent text-outline-default-text border border-outline-default-border hover:bg-soft-default-bg rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
              Open popover
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64">
              <PopoverHeader>
                <PopoverTitle>Popover title</PopoverTitle>
              </PopoverHeader>
              <p className="text-sm text-[var(--text-secondary)]">Trigger opens this panel. Use for filters, menus, or short forms.</p>
            </PopoverContent>
          </Popover>
        </Section>

        {/* Progress */}
        <Section title="Progress" description="Brand-filled bar. Use ProgressLabel and ProgressValue for context.">
          <div className="space-y-4 max-w-md">
            <Progress value={60}>
              <ProgressLabel>Storage</ProgressLabel>
              <ProgressValue />
            </Progress>
            <Progress value={100} />
            <Progress value={25} />
          </div>
        </Section>

        {/* Radio Group */}
        <Section title="Radio Group" description="Single choice. Brand focus and checked state.">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notification frequency</Label>
              <RadioGroup defaultValue="weekly" className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="daily" id="r-daily" />
                  <Label htmlFor="r-daily" className="font-normal cursor-pointer">Daily</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="weekly" id="r-weekly" />
                  <Label htmlFor="r-weekly" className="font-normal cursor-pointer">Weekly</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="never" id="r-never" />
                  <Label htmlFor="r-never" className="font-normal cursor-pointer">Never</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </Section>

        {/* Sheet */}
        <Section title="Sheet" description="Side or bottom panel. Close button uses base-ghost.">
          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium bg-transparent text-outline-default-text border border-outline-default-border hover:bg-soft-default-bg rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
              Open sheet
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Sheet title</SheetTitle>
                <SheetDescription>Optional description for context.</SheetDescription>
              </SheetHeader>
              <div className="py-4 text-sm text-[var(--text-secondary)]">
                Panel content. Use SheetFooter for actions.
              </div>
              <SheetFooter>
                <Button>Save</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Section>

        {/* Sonner (Toast) */}
        <Section title="Toast (Sonner)" description="Trigger toasts to verify styling. Toaster is in the layout.">
          <Row label="Variants">
            <Button variant="base-soft" onClick={() => toast("Default message")}>Default toast</Button>
            <Button variant="success-soft" onClick={() => toast.success("Saved successfully")}>Success</Button>
            <Button variant="warning-soft" onClick={() => toast.warning("Please review")}>Warning</Button>
            <Button variant="error-soft" onClick={() => toast.error("Something went wrong")}>Error</Button>
          </Row>
        </Section>

        {/* Spinner */}
        <Section title="Spinner" description="Brand-colored loading indicator.">
          <div className="flex items-center gap-4">
            <Spinner />
            <Spinner className="size-6" />
            <Spinner className="size-8" />
          </div>
        </Section>

      </main>

      <footer className="border-t border-[var(--border-default)] mt-8 py-8 text-center">
        <p className="text-xs text-[var(--text-muted)]">Flen AI Design System v1.0 — Built for local businesses</p>
      </footer>
    </div>
  );
}
