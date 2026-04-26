'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import type { RankingGridPointResultOut } from '@/types/rankingGrid';

function toNum(v: string | number): number {
  return typeof v === 'number' ? v : parseFloat(v);
}

function safeInvalidateAndFit(map: L.Map, bounds: L.LatLngBounds, mapRef: MutableRefObject<L.Map | null>) {
  if (mapRef.current !== map) return;
  try {
    const el = map.getContainer();
    if (!el?.isConnected || el.offsetWidth < 2 || el.offsetHeight < 2) return;
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  } catch {
    // map removed during async frame
  }
}

const CARTO_DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const TL_RED = '#c40000';
const TL_RED_GLOW = '#ff2a2a';
const TL_AMBER = '#cc7a00';
const TL_AMBER_GLOW = '#ffcc33';
const TL_GREEN = '#006b2e';
const TL_GREEN_GLOW = '#00c853';

type TrafficSignal = 'red' | 'amber' | 'green';

function trafficSignalForPoint(point: RankingGridPointResultOut, forceRed: boolean): TrafficSignal {
  if (forceRed) return 'red';
  if (point.tier === '1-3' || point.tier === '4-6') return 'green';
  if (point.tier === '7-10' || point.tier === '11-15') return 'amber';
  return 'red';
}

function signalBodyGradient(signal: TrafficSignal): string {
  if (signal === 'green') return `linear-gradient(160deg, ${TL_GREEN_GLOW}, ${TL_GREEN})`;
  if (signal === 'amber') return `linear-gradient(160deg, ${TL_AMBER_GLOW}, ${TL_AMBER})`;
  return `linear-gradient(160deg, ${TL_RED_GLOW}, ${TL_RED})`;
}

function signalLabelColor(signal: TrafficSignal): string {
  if (signal === 'green') return '#030712';
  if (signal === 'amber') return '#1c1000';
  return '#ffffff';
}

function createCircleIcon(point: RankingGridPointResultOut, isSelected: boolean) {
  const rankNum = typeof point.rank === 'number' ? point.rank : null;
  const isOutsideTop10 = rankNum != null && rankNum > 10;
  const forceRed = point.tier === 'not_found' || point.rank == null || isOutsideTop10;
  const signal = trafficSignalForPoint(point, forceRed);
  const label = point.rank != null ? String(point.rank) : '-';
  const bodyGrad = signalBodyGradient(signal);
  const textColor = signalLabelColor(signal);

  const innerGrad = `linear-gradient(155deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 45%), linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.06) 100%), ${bodyGrad}`;

  if (isSelected) {
    const innerSize = 30;
    const shadow =
      '0 4px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 22px rgba(34,211,238,0.55)';
    const w = 52;
    const h = 52;
    return L.divIcon({
      className: 'ranking-grid-marker ranking-grid-marker--selected',
      html: `<div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;pointer-events:auto;"><div style="width:44px;height:44px;border-radius:50%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:3px solid #38bdf8;background:rgba(15,23,42,0.55);box-shadow:0 0 0 2px rgba(56,189,248,0.45),0 0 20px rgba(34,211,238,0.5),0 0 36px rgba(34,211,238,0.25);"><div style="width:${innerSize}px;height:${innerSize}px;border-radius:50%;box-sizing:border-box;background-image:${innerGrad};box-shadow:${shadow};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;font-family:ui-sans-serif,system-ui,sans-serif;color:${textColor};">${label}</div></div></div>`,
      iconSize: [w, h],
      iconAnchor: [w / 2, h / 2],
    });
  }

  const innerSize = 28;
  const ring = '0 0 0 1px rgba(255,255,255,0.22)';
  const shadow = '0 2px 10px rgba(0,0,0,0.35), 0 0 8px rgba(0,0,0,0.2)';
  return L.divIcon({
    className: 'ranking-grid-marker',
    html: `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;pointer-events:auto;"><div style="width:${innerSize}px;height:${innerSize}px;border-radius:50%;background-image:${innerGrad};box-shadow:${ring},${shadow};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;font-family:ui-sans-serif,system-ui,sans-serif;color:${textColor};box-sizing:border-box;">${label}</div></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

interface RankingGridMapProps {
  className?: string;
  mapKey?: string | null;
  points: RankingGridPointResultOut[];
  selectedPointIndex: number | null;
  onSelectPoint: (pointIndex: number) => void;
}

export function RankingGridMap({
  className,
  mapKey,
  points,
  selectedPointIndex,
  onSelectPoint,
}: RankingGridMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const stableKey = mapKey ?? 'default';

  useEffect(() => {
    if (points.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markersRef.current = [];
    }

    const map = L.map(container, { center: [40.7128, -74.006], zoom: 12, zoomControl: true });
    mapRef.current = map;
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.attribution({ position: 'bottomright' }).addTo(map);
    L.tileLayer(CARTO_DARK_URL, { attribution: CARTO_ATTRIBUTION }).addTo(map);

    return () => {
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [stableKey, points.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (points.length === 0) return;

    const latLngs: L.LatLngTuple[] = points.map((point) => [toNum(point.latitude), toNum(point.longitude)]);
    map.fitBounds(L.latLngBounds(latLngs), { padding: [24, 24], maxZoom: 14 });

    points.forEach((point) => {
      const isSelected = selectedPointIndex === point.point_index;
      const marker = L.marker([toNum(point.latitude), toNum(point.longitude)], {
        icon: createCircleIcon(point, isSelected),
      }).addTo(map);
      marker.setZIndexOffset(isSelected ? 800 : 0);
      marker.on('click', () => onSelectPoint(point.point_index));
      markersRef.current.push(marker);
    });

    const bounds = L.latLngBounds(latLngs);
    const mapSnapshot = map;
    queueMicrotask(() => safeInvalidateAndFit(mapSnapshot, bounds, mapRef));
  }, [stableKey, points, onSelectPoint, selectedPointIndex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0 || markersRef.current.length !== points.length) return;
    points.forEach((point, idx) => {
      const marker = markersRef.current[idx];
      if (!marker) return;
      const isSelected = selectedPointIndex === point.point_index;
      marker.setIcon(createCircleIcon(point, isSelected));
      marker.setZIndexOffset(isSelected ? 800 : 0);
    });
  }, [selectedPointIndex, points, stableKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || points.length === 0) return;
    const ro = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map) return;
      try {
        const c = map.getContainer();
        if (!c?.isConnected || c.offsetWidth < 2 || c.offsetHeight < 2) return;
        map.invalidateSize();
      } catch {
        // map removed
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stableKey, points.length]);

  if (points.length === 0) {
    return (
      <div className={cn('flex min-h-0 flex-1 items-center justify-center bg-zinc-950/95 text-sm text-zinc-500', className)}>
        Run a scan to see grid points on the map.
      </div>
    );
  }

  return <div ref={containerRef} className={cn('h-full min-h-0 w-full bg-zinc-900', className)} />;
}
