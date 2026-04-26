'use client';

import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RankingGridListingOut } from '@/types/rankingGrid';

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className="break-words text-xs text-slate-100">{value}</span>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function RankingGridCompetitorDetail({
  listing,
  className,
}: {
  listing: RankingGridListingOut;
  className?: string;
}) {
  const rating = listing.rating_value != null ? `${parseFloat(listing.rating_value).toFixed(1)}` : null;
  const votes = listing.rating_votes_count != null ? `${listing.rating_votes_count}` : null;

  return (
    <div className={cn('space-y-4 rounded-xl border border-[#111827] bg-[#020617]/95 p-4 text-xs shadow-xl', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-semibold leading-snug text-slate-50">{listing.title}</div>
          {listing.address ? <div className="text-xs leading-snug text-slate-400">{listing.address}</div> : null}
        </div>
        {listing.is_own_business ? (
          <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">
            Your business
          </span>
        ) : null}
      </div>

      <DetailSection title="Overview">
        <FieldRow label="Rank (absolute)" value={listing.rank_absolute} />
        <FieldRow label="Rank (group)" value={listing.rank_group} />
        <FieldRow label="Rating" value={rating} />
        <FieldRow label="Reviews" value={votes} />
        <FieldRow label="Category" value={listing.category} />
        {listing.additional_categories && listing.additional_categories.length > 0 ? (
          <FieldRow label="Additional categories" value={listing.additional_categories.join(', ')} />
        ) : null}
      </DetailSection>

      <DetailSection title="Contact & IDs">
        <FieldRow label="Phone" value={listing.phone} />
        {listing.url ? (
          <div className="col-span-2 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Maps / URL</span>
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
            >
              <span className="truncate">View on Maps</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Maps / URL</span>
            <span className="text-xs text-slate-500">-</span>
          </div>
        )}
        <FieldRow label="CID" value={listing.cid} />
        <FieldRow label="Place ID" value={listing.place_id} />
      </DetailSection>
    </div>
  );
}
