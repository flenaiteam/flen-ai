'use client';

import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { RootState } from '@/lib/redux/store';
import {
  useCreateRankingGridMutation,
  useGetGBPKeywordsQuery,
  useGetLocationContextQuery,
  useGetMergedRankingGridScansForKeywordQuery,
  useGetRankingGridsQuery,
  useGetRankingGridScanDetailQuery,
  useTriggerRankingGridScanMutation,
} from '@/lib/api/baseApi';
import { RankingGridKeywordList } from '@/components/ranking-grid/ranking-grid-keyword-list';
import { RankingGridScanHistoryPanel } from '@/components/ranking-grid/ranking-grid-scan-history-panel';
import { RankingGridViewerSheet } from '../../../../components/ranking-grid/ranking-grid-viewer-sheet';
import { RunNewScanModal } from '@/components/ranking-grid/ranking-grid-run-scan-modal';
import type {
  MergedRankingGridScanRow,
  RankingGridListingOut,
  RankingGridOut,
  RankingGridScanDetailOut,
} from '@/types/rankingGrid';
import { SCAN_STATUS } from '@/types/rankingGrid';

type GBPKeyword = { id: number; keyword: string; search_volume: number };

function extractKeywords(raw: unknown): GBPKeyword[] {
  if (!raw || typeof raw !== 'object') return [];
  const top = raw as Record<string, unknown>;
  // Shape 1: { data: GBPKeyword[] }
  if (Array.isArray(top.data)) return top.data as GBPKeyword[];
  // Shape 2: { data: { data: GBPKeyword[] } }
  if (top.data && typeof top.data === 'object') {
    const nested = top.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data as GBPKeyword[];
  }
  // Shape 3: raw array
  if (Array.isArray(raw)) return raw as GBPKeyword[];
  return [];
}

function roundTo4(v: number) {
  return Math.round(v * 10000) / 10000;
}

export default function RankingGridPage() {
  const { current: currentLocation } = useSelector((state: RootState) => state.locations);
  const { current: organization } = useSelector((state: RootState) => state.organizations);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [keywordId, setKeywordId] = useState<number | null>(null);
  const [gridPublicId, setGridPublicId] = useState<string | null>(null);
  const [scanPublicId, setScanPublicId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [selectedListingIndex, setSelectedListingIndex] = useState<number | null>(null);
  const [selectedScanIdForView, setSelectedScanIdForView] = useState<string | null>(null);
  const [activeDetailGridId, setActiveDetailGridId] = useState<string | null>(null);
  const [pollingStartedAt, setPollingStartedAt] = useState<number | null>(null);
  const [stopPolling, setStopPolling] = useState(false);

  // Sheet open states
  const [viewerOpen, setViewerOpen] = useState(false);
  const [runScanModalOpen, setRunScanModalOpen] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const { data: locationContext } = useGetLocationContextQuery(currentLocation?.public_id ?? '', {
    skip: !currentLocation?.public_id,
  });

  const { data: keywordsData } = useGetGBPKeywordsQuery(
    {
      locationPublicId: currentLocation?.public_id ?? '',
      page: 1,
      page_size: 1000,
      sort: '-search_volume',
    },
    {
      skip: !currentLocation?.public_id,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    }
  );

  const { data: gridsData } = useGetRankingGridsQuery(currentLocation?.public_id ?? '', {
    skip: !currentLocation?.public_id,
  });

  const gridsList: RankingGridOut[] = Array.isArray(gridsData)
    ? gridsData
    : ((gridsData as { data?: RankingGridOut[] } | undefined)?.data ?? []);

  const gridsForKeyword = useMemo(() => {
    if (keywordId == null) return [];
    return gridsList.filter((grid) => grid.keyword_id === keywordId);
  }, [gridsList, keywordId]);

  const keywordHasRankingGrids = keywordId != null && gridsForKeyword.length > 0;

  const {
    data: mergedScansQueryData = [],
    isLoading: mergedScansLoading,
    isFetching: mergedScansFetching,
  } = useGetMergedRankingGridScansForKeywordQuery(
    keywordHasRankingGrids ? { keywordId, grids: gridsForKeyword } : skipToken
  );
  const mergedScans: MergedRankingGridScanRow[] = keywordHasRankingGrids ? mergedScansQueryData : [];

  const scansStillLoading =
    gridsForKeyword.length > 0 &&
    mergedScans.length === 0 &&
    (mergedScansLoading || mergedScansFetching);

  const [createGrid, { isLoading: isCreating }] = useCreateRankingGridMutation();
  const [triggerScan, { isLoading: isTriggering }] = useTriggerRankingGridScanMutation();
  const isRunning = isCreating || isTriggering;

  const locationId = currentLocation?.public_id ?? '';
  const firstGridForKeyword = keywordId != null ? gridsList.find((g) => g.keyword_id === keywordId) ?? null : null;
  const effectiveGridId = gridPublicId ?? firstGridForKeyword?.public_id ?? null;

  const scanIdForDetail = useMemo(() => {
    const explicit = selectedScanIdForView ?? scanPublicId ?? null;
    const inMerged = Boolean(explicit && mergedScans.some((scan) => scan.public_id === explicit));
    if (inMerged) return explicit as string;
    if (explicit) return explicit;
    return mergedScans[0]?.public_id ?? null;
  }, [mergedScans, selectedScanIdForView, scanPublicId]);

  const detailGridPublicId = useMemo(() => {
    if (!scanIdForDetail) return null;
    const row = mergedScans.find((scan) => scan.public_id === scanIdForDetail);
    return row?.grid_public_id ?? activeDetailGridId ?? effectiveGridId ?? null;
  }, [mergedScans, scanIdForDetail, activeDetailGridId, effectiveGridId]);

  // ── Polling ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!scanIdForDetail) {
      setStopPolling(true);
      setPollingStartedAt(null);
      return;
    }
    setStopPolling(false);
    setPollingStartedAt(Date.now());
  }, [scanIdForDetail]);

  const elapsedPollingMs = pollingStartedAt == null ? 0 : Date.now() - pollingStartedAt;
  const pollingInterval =
    detailGridPublicId && scanIdForDetail && !stopPolling
      ? elapsedPollingMs < 30000
        ? 5000
        : elapsedPollingMs < 60000
          ? 10000
          : 0
      : 0;

  const detailQuerySkipped = !detailGridPublicId || !scanIdForDetail;
  const { data: scanDetail, isLoading: detailLoading, isFetching: detailFetching } =
    useGetRankingGridScanDetailQuery(
      { gridPublicId: detailGridPublicId!, scanPublicId: scanIdForDetail ?? '' },
      { skip: detailQuerySkipped, pollingInterval }
    );

  const detailMatches =
    !detailQuerySkipped &&
    Boolean(scanIdForDetail && scanDetail && scanDetail.public_id === scanIdForDetail);
  const currentDetail = detailMatches ? (scanDetail as RankingGridScanDetailOut) : undefined;

  useEffect(() => {
    if (!detailMatches || !scanDetail) return;
    if (scanDetail.status === SCAN_STATUS.COMPLETED || scanDetail.status === SCAN_STATUS.FAILED) {
      setStopPolling(true);
      return;
    }
    if (
      (scanDetail.status === SCAN_STATUS.PENDING || scanDetail.status === SCAN_STATUS.IN_PROGRESS) &&
      pollingStartedAt != null &&
      Date.now() - pollingStartedAt >= 60000
    ) {
      setStopPolling(true);
    }
  }, [detailMatches, scanDetail, pollingStartedAt]);

  const showDetailLoader =
    Boolean(scanIdForDetail) &&
    !currentDetail &&
    (detailLoading || detailFetching || (scanDetail != null && !detailMatches));

  const isScanInProgress =
    currentDetail?.status === SCAN_STATUS.PENDING || currentDetail?.status === SCAN_STATUS.IN_PROGRESS;

  // ── Derived data ──────────────────────────────────────────────────────────────

  const keywords: GBPKeyword[] = extractKeywords(keywordsData);

  const businessName =
    currentDetail?.target_business?.name ??
    (locationContext as { data?: { location?: { name?: string }; organization?: { name?: string } } } | undefined)
      ?.data?.location?.name ??
    (locationContext as { data?: { organization?: { name?: string } } } | undefined)?.data?.organization?.name ??
    organization?.name ??
    'Business';

  const businessAddress =
    currentDetail?.target_business?.address ??
    (locationContext as { data?: { location?: { address?: string } } } | undefined)?.data?.location?.address ??
    '';

  const selectedKeyword = keywordId != null ? keywords.find((k) => k.id === keywordId) ?? null : null;

  const points = currentDetail?.points ?? [];
  const selectedPoint = selectedPointIndex != null ? points.find((p) => p.point_index === selectedPointIndex) : null;
  const competitors = selectedPoint?.listings ?? ([] as RankingGridListingOut[]);

  const selectedIndex = mergedScans.findIndex((s) => s.public_id === scanIdForDetail);
  const previousScan = selectedIndex >= 0 ? mergedScans[selectedIndex + 1] ?? null : null;
  const previousSummary = previousScan?.summary ?? null;

  // ── Event handlers ────────────────────────────────────────────────────────────

  const handleRunScan = useCallback(
    async (newGridSize: number, newRadiusKm: number) => {
      if (!locationId || keywordId == null) return;
      try {
        const DIMENSION_EPS = 1e-6;
        const existing =
          gridsList.find(
            (g) =>
              g.keyword_id === keywordId &&
              g.grid_size === newGridSize &&
              g.radius_km != null &&
              Math.abs(Number(g.radius_km) - newRadiusKm) < DIMENSION_EPS
          ) ?? null;

        let gridId: string;
        if (existing) {
          if (!existing.public_id) return;
          gridId = String(existing.public_id);
          setGridPublicId(gridId);
        } else {
          const grid = await createGrid({
            locationPublicId: locationId,
            keyword_id: keywordId,
            grid_size: newGridSize,
            radius_km: roundTo4(newRadiusKm),
          }).unwrap();
          if (!grid.public_id) return;
          gridId = String(grid.public_id);
          setGridPublicId(gridId);
        }

        const result = await triggerScan(gridId).unwrap();
        if (!result.public_id) return;
        setScanPublicId(String(result.public_id));
        setSelectedScanIdForView(String(result.public_id));
        setActiveDetailGridId(gridId);
        setPollingStartedAt(Date.now());
        setStopPolling(false);
        setRunScanModalOpen(false);
      } catch (error) {
        console.error(error);
      }
    },
    [locationId, keywordId, gridsList, createGrid, triggerScan]
  );

  const selectKeyword = useCallback((id: number) => {
    setKeywordId(id);
    setGridPublicId(null);
    setScanPublicId(null);
    setSelectedScanIdForView(null);
    setActiveDetailGridId(null);
    setPollingStartedAt(null);
    setSelectedPointIndex(null);
  }, []);

  const handleSelectScan = useCallback((id: string) => {
    const row = mergedScans.find((s) => s.public_id === id);
    if (row) {
      setGridPublicId(null);
      setSelectedScanIdForView(id);
    }
  }, [mergedScans]);

  useEffect(() => {
    if (points.length === 0) return;
    const currentSelectedInPoints =
      selectedPointIndex != null && points.some((point) => point.point_index === selectedPointIndex);
    if (!currentSelectedInPoints) setSelectedPointIndex(points[0].point_index);
  }, [points, selectedPointIndex, scanIdForDetail]);

  useEffect(() => {
    setSelectedListingIndex(null);
  }, [selectedPointIndex, scanIdForDetail]);

  useEffect(() => {
    setSelectedListingIndex((idx) => {
      if (idx == null || competitors.length === 0) return null;
      if (idx < 0 || idx >= competitors.length) return null;
      return idx;
    });
  }, [competitors.length]);

  // ── No location guard ──────────────────────────────────────────────────────────

  if (!currentLocation || !organization) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] p-6">
        <Alert variant="error" className="mx-auto max-w-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No location or organization data available. Please select a location first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">

      <div className="shrink-0 border-b border-[var(--border-default)] px-6 py-4">
        <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Ranking Grid</h1>
        <p className="text-sm text-[var(--text-secondary)]">Track local map rankings across your service area.</p>
      </div>

      {/* ── Two-column shell — each column is self-contained and scrolls internally ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — 50%, self-scrolling */}
        <div className="flex h-full w-1/2 shrink-0 flex-col border-r border-[var(--border-default)]">
          <RankingGridKeywordList
            keywords={keywords}
            gridsList={gridsList}
            selectedKeywordId={keywordId}
            onSelectKeyword={selectKeyword}
          />
        </div>

        {/* Right — 50%, fades in on keyword select, self-scrolling */}
        <div className={cn('flex h-full w-1/2 flex-col transition-opacity duration-300', keywordId != null ? 'opacity-100' : 'opacity-0')}>
          {keywordId != null ? (
            <RankingGridScanHistoryPanel
              keywordText={selectedKeyword?.keyword ?? ''}
              scans={mergedScans}
              selectedScanId={scanIdForDetail}
              isLoading={scansStillLoading}
              onSelectScan={handleSelectScan}
              onOpenScan={() => setViewerOpen(true)}
              onRunNewScan={() => setRunScanModalOpen(true)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-[var(--bg-subtle)]/40" />
              <p className="text-sm text-[var(--text-muted)]">Select a keyword to see scan history</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Full-screen viewer sheet (map + KPIs + competitor column) ──────── */}
      <RankingGridViewerSheet
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        keywordText={selectedKeyword?.keyword ?? ''}
        currentDetail={currentDetail}
        showDetailLoader={showDetailLoader}
        isScanInProgress={isScanInProgress}
        scanIdForDetail={scanIdForDetail}
        previousSummary={previousSummary}
        points={points}
        selectedPointIndex={selectedPointIndex}
        onSelectPoint={setSelectedPointIndex}
        competitors={competitors}
        selectedListingIndex={selectedListingIndex}
        onSelectListing={setSelectedListingIndex}
      />

      {/* ── Run new scan modal (small dialog) ──────────────────────────────── */}
      <RunNewScanModal
        open={runScanModalOpen}
        onOpenChange={setRunScanModalOpen}
        keywordText={selectedKeyword?.keyword ?? ''}
        onConfirm={handleRunScan}
        isRunning={isRunning}
      />
    </div>
  );
}
