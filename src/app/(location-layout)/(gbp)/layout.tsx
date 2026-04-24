"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSelector } from "react-redux";
import type { RootState } from "@/lib/redux/store";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertCircle,
  Bell,
  Building2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Users2,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { Location } from "@/lib/api/baseApi";
import { useGetLocationsQuery } from "@/lib/api/baseApi";
import { setCurrentLocation, setLocationsList } from "@/lib/redux/slices/locationsSlice";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/lib/redux/store";
import { cn } from "@/lib/utils";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";

const ADD_LOCATION_VALUE = "__add_location__";

const GBP_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { id: "overview", label: "Overview", icon: LayoutGrid, href: "/overview" },
  { id: "profile", label: "Profile", icon: Building2, href: "/profile" },
  { id: "reviews", label: "Reviews", icon: MessageSquare, href: "/reviews" },
  { id: "posts", label: "Posts", icon: FileText, href: "/posts" },
  { id: "keywords", label: "Keywords", icon: Search, href: "/keywords" },
  { id: "search-rankings", label: "Search Rankings", icon: BarChart3, href: "/search-rankings" },
  { id: "competitors", label: "Competitors", icon: Users2, href: "/competitors" },
];

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function GbpLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const { user, organization, location: currentLocation, logout, isAuthenticated, isInitialized } =
    useAuth();
  const locationsList = useSelector((s: RootState) => s.locations.list);

  const { data: apiLocations } = useGetLocationsQuery(undefined, {
    skip: !isInitialized || !isAuthenticated || !organization?.id,
  });

  useEffect(() => {
    if (apiLocations?.length) {
      dispatch(setLocationsList(apiLocations));
    }
  }, [apiLocations, dispatch]);

  const selectLocationRows = useMemo(() => {
    const list = [...locationsList];
    if (
      currentLocation?.public_id &&
      !list.some((l) => l.public_id === currentLocation.public_id)
    ) {
      list.unshift(currentLocation as Location);
    }
    return list;
  }, [locationsList, currentLocation]);

  const locationTriggerLabel = useMemo(() => {
    const fromList = locationsList.find((l) => l.public_id === currentLocation?.public_id)?.name;
    return fromList ?? currentLocation?.name ?? "Select location";
  }, [locationsList, currentLocation]);

  const notifications = useMemo(
    () => [
      {
        id: 1,
        name: "Priya Sharma",
        rating: 5,
        text: "Absolutely love this place! Friendly staff and top-notch service.",
        date: "Today, 9:14 AM",
      },
      {
        id: 2,
        name: "Rahul Mehta",
        rating: 2,
        text: "Waited too long despite appointment. Service quality was okay.",
        date: "Today, 7:02 AM",
      },
      {
        id: 3,
        name: "Sunita Rao",
        rating: 5,
        text: "Best salon in the area. Great consistency and care.",
        date: "Mar 4",
      },
    ],
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const activeTab = GBP_SECTIONS.find((item) => pathname === item.href);
    if (!activeTab) return;
    tabRefs.current[activeTab.id]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [pathname]);

  function handleSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1200);
  }

  const handleLocationChange = useCallback(
    (publicId: string | null) => {
      if (!publicId) return;
      if (publicId === ADD_LOCATION_VALUE) {
        router.push("/locations");
        return;
      }
      const loc = selectLocationRows.find((l) => l.public_id === publicId);
      if (loc) {
        dispatch(setCurrentLocation(loc));
        router.refresh();
      }
    },
    [selectLocationRows, dispatch, router]
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)]">
      <div className="flex flex-1 flex-col min-w-0">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4 sm:px-6 justify-between">
          {/* Logo + org */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/dashboard" className="font-display text-lg font-bold text-[var(--text-primary)]">
              flen<span className="text-brand-500">.</span>ai
            </Link>
            <Badge variant="brand-solid" className="text-[9px] px-1.5 py-0">
              Pro
            </Badge>
            {organization && (
              <span className="hidden lg:flex items-center gap-1 text-xs text-[var(--text-muted)] ml-1">
                <Building2 className="h-3 w-3" />
                {organization.name}
              </span>
            )}
          </div>

          {/* Global search */}
          <div className="hidden md:flex relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="Search GBP insights, reviews, and locations"
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Location switcher — Redux + API sync; label always human-readable */}
            {selectLocationRows.length > 0 ? (
              <div className="hidden sm:block min-w-0 max-w-[min(280px,40vw)] shrink">
                <Select
                  value={currentLocation?.public_id ?? ""}
                  onValueChange={handleLocationChange}
                >
                  <SelectTrigger className="h-8 w-full min-w-0 max-w-full text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                      <MapPin className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
                      <SelectValue placeholder="Select location">
                        <span className="truncate block min-w-0 text-left" title={locationTriggerLabel}>
                          {locationTriggerLabel}
                        </span>
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {selectLocationRows.map((loc) => (
                      <SelectItem key={loc.public_id} value={loc.public_id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value={ADD_LOCATION_VALUE}>
                      <span className="flex items-center gap-2">
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        Add new location
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : currentLocation ? (
              <span className="hidden sm:flex max-w-[min(280px,40vw)] min-w-0 items-center gap-1.5 text-xs text-[var(--text-secondary)] border border-[var(--border-default)] rounded-md h-8 px-3 truncate">
                <MapPin className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
                <span className="truncate">{currentLocation.name}</span>
              </span>
            ) : null}

            {/* Sync */}
            <Tooltip>
              <TooltipTrigger
                onClick={handleSync}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]",
                  syncing && "pointer-events-none opacity-50"
                )}
              >
                {syncing ? <Spinner className="size-4" /> : <RefreshCw className="h-4 w-4" />}
              </TooltipTrigger>
              <TooltipContent>Sync from Google</TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <Sheet>
              <SheetTrigger className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error-500 ring-2 ring-[var(--bg-surface)]" />
                )}
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Notifications</SheetTitle>
                  <SheetDescription>
                    Recent activity across your connected locations.
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-1 py-4">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-[var(--bg-subtle)]"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-500" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {item.name} left a {item.rating}★ review
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                          {item.text}
                        </p>
                        <p className="mt-1 text-[10px] text-[var(--text-muted)]">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            {/* Apps + Help + More */}
            <Tooltip>
              <TooltipTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]">
                <LayoutGrid className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Apps</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]">
                <HelpCircle className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Help</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]">
                <MoreHorizontal className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>More</TooltipContent>
            </Tooltip>

            {/* Theme toggle */}
            <Tooltip>
              <TooltipTrigger
                onClick={() => setTheme(mounted && theme === "dark" ? "light" : "dark")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>

            {/* User avatar + dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                <Avatar className="h-8 w-8 shrink-0 cursor-pointer">
                  <AvatarFallback className="text-xs bg-soft-brand-bg text-soft-brand-text">
                    {getInitials(user?.display_name)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {user?.display_name ?? "Account"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setSignOutOpen(true)}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmAlertDialog
              open={signOutOpen}
              onOpenChange={setSignOutOpen}
              title="Sign out?"
              description="You'll need to sign in again to access your dashboard and locations."
              confirmLabel="Sign out"
              onConfirm={logout}
            />
          </div>
        </header>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="w-full flex-1 min-w-0 flex flex-col md:flex-row gap-6 p-4 sm:p-6 md:items-start">
          {/* Sidebar nav */}
          <nav className="flex flex-row bg-background md:flex-col gap-1 md:gap-2 px-0 md:p-4 w-full md:w-64 shrink-0 h-auto overflow-x-auto md:overflow-visible md:border md:rounded-xl md:sticky md:top-6 md:h-fit">
            {GBP_SECTIONS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  ref={(el) => {
                    tabRefs.current[item.id] = el;
                  }}
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "w-auto md:w-full inline-flex items-center justify-start gap-2 px-3 py-2 text-sm transition-colors whitespace-nowrap border-b-2 md:border-b-0",
                    isActive
                      ? "border-brand-500 text-brand-600 md:bg-soft-brand-bg md:text-soft-brand-text md:rounded-md md:border-none"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:hover:bg-[var(--bg-subtle)] md:rounded-md"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Page content */}
          <main className="grow min-w-0 w-full text-start border border-border rounded-xl">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
