"use client";

import { useMemo, useState } from "react";
import { Building2, Calendar, CalendarDays, CheckCircle2, FileText, Filter, MoreVertical, Search, Share2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetGBPPostsQuery } from "@/lib/api/baseApi";

type GBPPost = {
  id: number;
  text?: string | null;
  media_url?: string | null;
  timestamp: string;
  post_type?: string | null;
  event_start?: string | null;
  event_end?: string | null;
};

function resolveAssetUrl(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const value = raw.trim();

  if (/^https?:\/\//i.test(value) || /^data:/i.test(value) || /^blob:/i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "");
  if (backendBase) {
    const normalizedPath = value.startsWith("/") ? value : `/${value}`;
    return `${backendBase}${normalizedPath}`;
  }

  return value;
}

function formatPostDate(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function normalizePostsPayload(raw: unknown): { posts: GBPPost[]; totalItems: number } {
  if (!raw || typeof raw !== "object") return { posts: [], totalItems: 0 };

  const top = raw as Record<string, unknown>;
  let items: unknown[] = [];
  let totalItems = 0;

  if (Array.isArray(top.data)) {
    items = top.data;
    totalItems = Number((top.meta_data as Record<string, unknown> | undefined)?.total_items ?? top.data.length);
  } else if (top.data && typeof top.data === "object") {
    const nested = top.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      items = nested.data;
      totalItems = Number(
        (nested.meta_data as Record<string, unknown> | undefined)?.total_items ??
          (top.meta_data as Record<string, unknown> | undefined)?.total_items ??
          nested.data.length
      );
    }
  } else if (Array.isArray(raw)) {
    items = raw;
    totalItems = raw.length;
  }

  const posts = items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: Number(item.id ?? idx + 1),
      text: (item.text as string | null | undefined) ?? "",
      media_url: (item.media_url as string | null | undefined) ?? null,
      timestamp: String(item.timestamp ?? new Date().toISOString()),
      post_type: (item.post_type as string | null | undefined) ?? null,
      event_start: (item.event_start as string | null | undefined) ?? null,
      event_end: (item.event_end as string | null | undefined) ?? null,
    }));

  return { posts, totalItems: Number.isFinite(totalItems) ? totalItems : posts.length };
}

function PostCard({ post, businessName }: { post: GBPPost; businessName: string }) {
  const resolvedMediaUrl = resolveAssetUrl(post.media_url);

  return (
    <Card className="border rounded-xl overflow-hidden bg-background py-0">
      <CardContent className="p-0">
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="h-12 w-12 bg-blue-500">
                <AvatarImage src={undefined} alt={businessName} />
                <AvatarFallback className="bg-blue-500 text-white">
                  <Building2 className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-blue-600 border-2 border-background p-0.5">
                <CheckCircle2 className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight break-words">{businessName}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatPostDate(post.timestamp)}</p>
            </div>
          </div>
          <Button variant="base-ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {resolvedMediaUrl && (
          <div className="relative w-full aspect-video overflow-hidden">
            <img src={resolvedMediaUrl} alt="Post" className="w-full h-full object-cover" />
          </div>
        )}
        {post.text && (
          <div className="px-4 py-3">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.text}</p>
          </div>
        )}
        {post.event_start && post.event_end ? (
          <div className="px-4 pb-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase">Event Date</p>
              </div>
              <p className="text-sm font-medium text-foreground">
                {new Date(post.event_start).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {new Date(post.event_end).toLocaleDateString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end px-4 pb-4 pt-2">
          <Button variant="base-ghost" size="sm" className="h-8 w-8 p-0">
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function GBPPostsSections({ locationPublicId }: { locationPublicId?: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [postTypeFilter, setPostTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("-timestamp");
  const businessName = "Your Business";

  const { data, isLoading, isFetching } = useGetGBPPostsQuery(
    {
      locationPublicId: locationPublicId || "",
      page: 1,
      page_size: 100,
      search: searchQuery.trim() || undefined,
      post_type: postTypeFilter !== "all" ? postTypeFilter : undefined,
      sort: sortBy,
    },
    { skip: !locationPublicId, refetchOnMountOrArgChange: true }
  );

  const { posts, totalItems } = useMemo(() => normalizePostsPayload(data), [data]);
  const now = Date.now();
  const upcomingEvents = posts.filter((p) => p.event_start && new Date(p.event_start).getTime() >= now);
  const recentPosts = posts.filter((p) => p.post_type !== "event").slice(0, 6);

  if (!locationPublicId) return null;

  if (isLoading || isFetching) {
    return (
      <Card className="border gap-0 rounded-2xl py-0 overflow-hidden bg-background shadow-sm">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-base text-foreground">Posts</h3>
          </div>
        </div>
        <div className="p-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {upcomingEvents.length > 0 && (
        <Card className="border gap-0 rounded-2xl py-0 overflow-hidden bg-background shadow-sm">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-base text-foreground">Upcoming Events</h3>
              </div>
              <Badge variant="base-outline">{upcomingEvents.length}</Badge>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingEvents.map((post) => (
                <PostCard key={post.id} post={post} businessName={businessName} />
              ))}
            </div>
          </div>
        </Card>
      )}

      {recentPosts.length > 0 && (
        <Card className="border gap-0 rounded-2xl py-0 overflow-hidden bg-background shadow-sm">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-base text-foreground">Recent Posts</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {recentPosts.map((post) => (
                <PostCard key={post.id} post={post} businessName={businessName} />
              ))}
            </div>
          </div>
        </Card>
      )}

      {posts.length > 0 && (
        <Card className="border gap-0 rounded-2xl py-0 overflow-hidden bg-background shadow-sm">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-base text-foreground">All Posts</h3>
              </div>
              <Badge variant="base-outline">{totalItems || posts.length} total</Badge>
            </div>
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search post text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 border-0 bg-background pl-9 pr-9 shadow-sm"
                />
                {searchQuery ? (
                  <Button
                    variant="base-ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex min-w-[min(100%,11rem)] flex-1 items-center gap-2">
                  <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <Select
                    value={postTypeFilter}
                    onValueChange={(value) => {
                      if (!value) return;
                      setPostTypeFilter(value);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full border-0 bg-background shadow-sm">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="what's_new">What's new</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select
                  value={sortBy}
                  onValueChange={(value) => {
                    if (!value) return;
                    setSortBy(value);
                  }}
                >
                  <SelectTrigger className="h-9 w-full min-w-[min(100%,10rem)] border-0 bg-background shadow-sm sm:w-[168px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-timestamp">Newest first</SelectItem>
                    <SelectItem value="timestamp">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} businessName={businessName} />
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
