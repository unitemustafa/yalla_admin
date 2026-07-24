"use client";

import { useEffect } from "react";
import { latLng } from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

type CityCoverageMapProps = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  onCenterChange: (latitude: number, longitude: number) => void;
};

function CoverageSync({
  latitude,
  longitude,
  radiusKm,
}: Omit<CityCoverageMapProps, "onCenterChange">) {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const radiusMeters = Math.max(radiusKm, 0.2) * 1000;
    map.fitBounds(latLng(latitude, longitude).toBounds(radiusMeters * 2), {
      padding: [28, 28],
      maxZoom: 14,
    });
  }, [latitude, longitude, map, radiusKm]);
  return null;
}

function CenterPicker({
  onCenterChange,
}: Pick<CityCoverageMapProps, "onCenterChange">) {
  useMapEvents({
    click(event) {
      onCenterChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function CityCoverageMap({
  latitude,
  longitude,
  radiusKm,
  onCenterChange,
}: CityCoverageMapProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-muted/20">
      <MapContainer
        center={[latitude, longitude]}
        zoom={11}
        className="h-[330px] w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[latitude, longitude]}
          radius={Math.max(radiusKm, 0) * 1000}
          pathOptions={{
            color: "#183153",
            fillColor: "#f97316",
            fillOpacity: 0.14,
            weight: 3,
          }}
        />
        <CircleMarker
          center={[latitude, longitude]}
          radius={7}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#f97316",
            fillOpacity: 1,
            weight: 3,
          }}
        />
        <CoverageSync
          latitude={latitude}
          longitude={longitude}
          radiusKm={radiusKm}
        />
        <CenterPicker onCenterChange={onCenterChange} />
      </MapContainer>
      <p className="border-t bg-background px-4 py-3 text-xs text-muted-foreground">
        اضغط على الخريطة لتغيير مركز المدينة. الدائرة تُحسب تلقائيًا من القطر.
      </p>
    </div>
  );
}
