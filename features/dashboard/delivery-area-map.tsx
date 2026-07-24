"use client";

import { useEffect, useMemo, useState } from "react";
import {
  cellToBoundary,
  cellToLatLng,
  cellsToMultiPolygon,
  gridDisk,
  latLngToCell,
} from "h3-js";
import { latLng } from "leaflet";
import {
  Circle,
  MapContainer,
  Polygon,
  TileLayer,
  useMap,
} from "react-leaflet";
import { LoaderCircle, MapPin, Search, Sparkles, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import type { AreaBoundaryGeoJson } from "./cities-api";
import {
  searchDeliveryPlaces,
  type PlaceSearchResult,
} from "./delivery-zones-api";
import { Button, Input } from "./primitives";

const defaultH3Resolution = 9;

type BoundaryMeta = {
  source: "osm" | "h3" | "manual";
  sourceReference: string;
  h3Resolution: number | null;
  h3Cells: string[];
};

type DeliveryAreaMapProps = {
  cityCenter: [number, number];
  cityRadiusKm: number;
  areaBoundary: AreaBoundaryGeoJson | null;
  boundarySource: "osm" | "h3" | "manual";
  sourceReference: string;
  h3Cells: string[];
  onBoundaryChange: (
    boundary: AreaBoundaryGeoJson | null,
    meta: BoundaryMeta,
  ) => void;
};

function boundaryPolygons(
  boundary: AreaBoundaryGeoJson | null,
): [number, number][][] {
  if (!boundary) return [];
  const polygons =
    boundary.type === "Polygon" ? [boundary.coordinates] : boundary.coordinates;
  const result: [number, number][][] = [];
  for (const polygon of polygons) {
    const ring = polygon[0];
    if (!Array.isArray(ring)) continue;
    result.push(
      ring.map(
        ([longitude, latitude]) => [latitude, longitude] as [number, number],
      ),
    );
  }
  return result;
}

function haversineKm(
  first: [number, number],
  second: [number, number],
) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latDelta = radians(second[0] - first[0]);
  const lngDelta = radians(second[1] - first[1]);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(first[0])) *
      Math.cos(radians(second[0])) *
      Math.sin(lngDelta / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(a));
}

function ViewSync({
  cityCenter,
  cityRadiusKm,
  focus,
}: {
  cityCenter: [number, number];
  cityRadiusKm: number;
  focus: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.setView(focus, 14);
      return;
    }
    const radiusMeters = Math.max(cityRadiusKm, 0.2) * 1000;
    map.fitBounds(latLng(cityCenter).toBounds(radiusMeters * 2), {
      padding: [24, 24],
      maxZoom: 13,
    });
  }, [cityCenter, cityRadiusKm, focus, map]);
  return null;
}

export default function DeliveryAreaMap({
  cityCenter,
  cityRadiusKm,
  areaBoundary,
  boundarySource,
  sourceReference,
  h3Cells,
  onBoundaryChange,
}: DeliveryAreaMapProps) {
  const { apiFetch } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [candidateCells, setCandidateCells] = useState<string[]>(() => {
    if (!h3Cells.length) return [];
    return Array.from(
      new Set(h3Cells.flatMap((cell) => gridDisk(cell, 2))),
    );
  });

  const selectedCells = useMemo(() => new Set(h3Cells), [h3Cells]);
  const renderedBoundary = useMemo(
    () => boundaryPolygons(areaBoundary),
    [areaBoundary],
  );

  async function runSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2 || searching) return;
    setSearching(true);
    setSearchError(null);
    try {
      const nextResults = await searchDeliveryPlaces(apiFetch, query);
      setResults(nextResults);
      if (!nextResults.length) setSearchError("لم نجد مكانًا مطابقًا داخل مصر.");
    } catch (reason) {
      setResults([]);
      setSearchError(
        reason instanceof Error ? reason.message : "تعذر البحث عن المكان.",
      );
    } finally {
      setSearching(false);
    }
  }

  function chooseResult(result: PlaceSearchResult) {
    setResults([]);
    setQuery(result.name || result.displayName.split(",")[0] || query);
    setFocus([result.latitude, result.longitude]);
    if (result.boundaryGeojson) {
      setCandidateCells([]);
      onBoundaryChange(result.boundaryGeojson, {
        source: "osm",
        sourceReference: result.sourceReference,
        h3Resolution: null,
        h3Cells: [],
      });
      return;
    }

    const centerCell = latLngToCell(
      result.latitude,
      result.longitude,
      defaultH3Resolution,
    );
    const candidates = gridDisk(centerCell, 6).filter((cell) => {
      const [latitude, longitude] = cellToLatLng(cell);
      return (
        haversineKm(cityCenter, [latitude, longitude]) <= cityRadiusKm
      );
    });
    const selected = gridDisk(centerCell, 3).filter((cell) =>
      candidates.includes(cell),
    );
    setCandidateCells(candidates);
    updateH3Boundary(selected, result.sourceReference);
  }

  function updateH3Boundary(cells: string[], sourceReference: string) {
    if (!cells.length) {
      onBoundaryChange(null, {
        source: "h3",
        sourceReference,
        h3Resolution: defaultH3Resolution,
        h3Cells: [],
      });
      return;
    }
    onBoundaryChange(
      {
        type: "MultiPolygon",
        coordinates: cellsToMultiPolygon(
          cells,
          true,
        ) as number[][][][],
      },
      {
        source: "h3",
        sourceReference,
        h3Resolution: defaultH3Resolution,
        h3Cells: cells,
      },
    );
  }

  function toggleCell(cell: string) {
    const next = new Set(selectedCells);
    if (next.has(cell)) next.delete(cell);
    else next.add(cell);
    updateH3Boundary(Array.from(next), sourceReference);
  }

  function clearBoundary() {
    setCandidateCells([]);
    onBoundaryChange(null, {
      source: "manual",
      sourceReference: "",
      h3Resolution: null,
      h3Cells: [],
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="grid gap-3 border-b bg-muted/20 p-4">
        <div>
          <p className="font-bold">ابحث باسم القرية أو الحي</p>
          <p className="mt-1 text-xs text-muted-foreground">
            إذا كانت الحدود متاحة سنضيفها تلقائيًا، وإلا ستظهر خلايا جاهزة
            تختارها بالضغط.
          </p>
        </div>
        <form onSubmit={runSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 pr-9"
              placeholder="مثال: الشبراوين، ههيا، الشرقية"
            />
          </div>
          <Button type="submit" className="h-11" disabled={searching || query.trim().length < 2}>
            {searching ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            بحث
          </Button>
        </form>
        {searchError ? (
          <p className="text-sm text-destructive">{searchError}</p>
        ) : null}
        {results.length ? (
          <div className="grid max-h-48 gap-1 overflow-y-auto rounded-lg border bg-background p-1">
            {results.map((result) => (
              <button
                key={`${result.sourceReference}-${result.latitude}-${result.longitude}`}
                type="button"
                onClick={() => chooseResult(result)}
                className="flex items-start gap-2 rounded-md px-3 py-2 text-right hover:bg-accent"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {result.name || result.displayName.split(",")[0]}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {result.displayName}
                  </span>
                </span>
                {result.boundaryGeojson ? (
                  <Sparkles className="ms-auto size-4 shrink-0 text-emerald-500" />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <MapContainer
          center={cityCenter}
          zoom={11}
          className="h-[420px] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Circle
            center={cityCenter}
            radius={cityRadiusKm * 1000}
            pathOptions={{
              color: "#183153",
              fillColor: "#183153",
              fillOpacity: 0.05,
              dashArray: "7 7",
              weight: 2,
            }}
          />
          {boundarySource !== "h3"
            ? renderedBoundary.map((positions, index) => (
                <Polygon
                  key={index}
                  positions={positions}
                  pathOptions={{
                    color: "#f97316",
                    fillColor: "#f97316",
                    fillOpacity: 0.22,
                    weight: 3,
                  }}
                />
              ))
            : null}
          {candidateCells.map((cell) => {
            const selected = selectedCells.has(cell);
            return (
              <Polygon
                key={cell}
                positions={cellToBoundary(cell)}
                eventHandlers={{ click: () => toggleCell(cell) }}
                pathOptions={{
                  color: selected ? "#f97316" : "#94a3b8",
                  fillColor: selected ? "#f97316" : "#ffffff",
                  fillOpacity: selected ? 0.55 : 0.12,
                  weight: selected ? 2 : 1,
                }}
              />
            );
          })}
          <ViewSync
            cityCenter={cityCenter}
            cityRadiusKm={cityRadiusKm}
            focus={focus}
          />
        </MapContainer>
        {areaBoundary ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearBoundary}
            className="absolute left-3 top-3 z-[500] bg-background shadow"
          >
            <X className="size-4" />
            مسح الاختيار
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs">
        <span className="text-muted-foreground">
          الدائرة الكحلية: حدود المدينة — البرتقالي: منطقة التوصيل
        </span>
        {boundarySource === "h3" ? (
          <span className="font-semibold text-primary">
            {h3Cells.length} خلية محددة — اضغط للإضافة أو الإزالة
          </span>
        ) : areaBoundary ? (
          <span className="font-semibold text-emerald-600">
            تم استيراد الحدود تلقائيًا
          </span>
        ) : null}
      </div>
    </div>
  );
}
