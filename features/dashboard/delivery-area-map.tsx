"use client";

import { useEffect } from "react";
import { MapContainer, Polygon, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { CityBoundaryGeoJson, PolygonGeoJson } from "./cities-api";

type LatLngPoint = [number, number];

type Props = {
  latitude: number;
  longitude: number;
  cityBoundary: CityBoundaryGeoJson;
  areaBoundary: PolygonGeoJson | null;
  onAreaBoundaryChange: (boundary: PolygonGeoJson | null) => void;
};

function firstRing(boundary: CityBoundaryGeoJson | null): LatLngPoint[] {
  if (!boundary) return [];
  const ring =
    boundary.type === "Polygon"
      ? boundary.coordinates[0]
      : boundary.coordinates[0]?.[0];
  return (ring ?? []).slice(0, -1).map(([lng, lat]) => [lat, lng]);
}

function boundaryFromPoints(points: LatLngPoint[]): PolygonGeoJson | null {
  if (!points.length) return null;
  const ring = points.map(([lat, lng]) => [lng, lat]);
  ring.push([...ring[0]]);
  return { type: "Polygon", coordinates: [ring] };
}

function Clicks({
  points,
  onChange,
}: {
  points: LatLngPoint[];
  onChange: Props["onAreaBoundaryChange"];
}) {
  useMapEvents({
    click(event) {
      onChange(boundaryFromPoints([...points, [event.latlng.lat, event.latlng.lng]]));
    },
  });
  return null;
}

function Center({ latitude, longitude }: Pick<Props, "latitude" | "longitude">) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom(), { animate: false });
  }, [latitude, longitude, map]);
  return null;
}

export default function DeliveryAreaMap({
  latitude,
  longitude,
  cityBoundary,
  areaBoundary,
  onAreaBoundaryChange,
}: Props) {
  const cityPoints = firstRing(cityBoundary);
  const areaPoints = firstRing(areaBoundary);

  return (
    <div className="grid gap-2">
      <MapContainer
        center={[latitude, longitude]}
        zoom={11}
        scrollWheelZoom
        className="h-[300px] w-full rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cityPoints.length >= 3 ? (
          <Polygon
            positions={cityPoints}
            pathOptions={{
              color: "#64748b",
              dashArray: "6 5",
              fillColor: "#94a3b8",
              fillOpacity: 0.08,
            }}
          />
        ) : null}
        {areaPoints.length >= 3 ? (
          <Polygon
            positions={areaPoints}
            pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.25 }}
          />
        ) : null}
        <Clicks points={areaPoints} onChange={onAreaBoundaryChange} />
        <Center latitude={latitude} longitude={longitude} />
      </MapContainer>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>حدود المدينة بالرمادي، ومنطقة التوصيل بالبرتقالي ({areaPoints.length} نقطة)</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={!areaPoints.length}
            onClick={() =>
              onAreaBoundaryChange(boundaryFromPoints(areaPoints.slice(0, -1)))
            }
          >
            تراجع
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={!areaPoints.length}
            onClick={() => onAreaBoundaryChange(null)}
          >
            مسح المنطقة
          </button>
        </div>
      </div>
    </div>
  );
}
