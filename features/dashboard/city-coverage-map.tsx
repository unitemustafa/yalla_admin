"use client";

import { useEffect } from "react";
import { MapContainer, Polygon, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { CityBoundaryGeoJson, PolygonGeoJson } from "./cities-api";

type CityCoverageMapProps = {
  latitude: number;
  longitude: number;
  boundary: CityBoundaryGeoJson | null;
  onCenterChange: (latitude: number, longitude: number) => void;
  onBoundaryChange: (boundary: PolygonGeoJson | null) => void;
};

function polygonPoints(boundary: CityBoundaryGeoJson | null): [number, number][] {
  if (!boundary) return [];
  const ring =
    boundary.type === "Polygon"
      ? boundary.coordinates[0]
      : boundary.coordinates[0]?.[0];
  if (!Array.isArray(ring)) return [];
  return ring.slice(0, -1).map(([longitude, latitude]) => [latitude, longitude]);
}

function boundaryFromPoints(points: [number, number][]): PolygonGeoJson | null {
  if (!points.length) return null;
  const coordinates = points.map(([latitude, longitude]) => [longitude, latitude]);
  coordinates.push([...coordinates[0]]);
  return { type: "Polygon", coordinates: [coordinates] };
}

function ClickHandler({
  points,
  onBoundaryChange,
}: {
  points: [number, number][];
  onBoundaryChange: CityCoverageMapProps["onBoundaryChange"];
}) {
  useMapEvents({
    click(event) {
      onBoundaryChange(
        boundaryFromPoints([...points, [event.latlng.lat, event.latlng.lng]]),
      );
    },
  });
  return null;
}

function CenterSync({ latitude, longitude }: Pick<CityCoverageMapProps, "latitude" | "longitude">) {
  const map = useMap();

  useEffect(() => {
    map.panTo([latitude, longitude], { animate: true });
  }, [latitude, longitude, map]);

  return null;
}

export default function CityCoverageMap({
  latitude,
  longitude,
  boundary,
  onCenterChange,
  onBoundaryChange,
}: CityCoverageMapProps) {
  const points = polygonPoints(boundary);
  return (
    <div className="grid gap-2">
      <MapContainer
        center={[latitude, longitude]}
        zoom={10}
        scrollWheelZoom
        className="h-[260px] w-full rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.length >= 3 ? (
          <Polygon
            positions={points}
            pathOptions={{ color: "#0f6b78", fillColor: "#0f6b78", fillOpacity: 0.2 }}
          />
        ) : null}
        <ClickHandler points={points} onBoundaryChange={onBoundaryChange} />
        <CenterSync latitude={latitude} longitude={longitude} />
      </MapContainer>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>اضغط على الخريطة لإضافة نقاط حدود المدينة ({points.length})</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={!points.length}
            onClick={() => onBoundaryChange(boundaryFromPoints(points.slice(0, -1)))}
          >
            تراجع
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={!points.length}
            onClick={() => onBoundaryChange(null)}
          >
            مسح الحدود
          </button>
        </div>
      </div>
    </div>
  );
}
