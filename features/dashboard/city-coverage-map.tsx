"use client";

import { useEffect } from "react";
import { Circle, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

type CityCoverageMapProps = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  onCenterChange: (latitude: number, longitude: number) => void;
};

function ClickHandler({ onCenterChange }: Pick<CityCoverageMapProps, "onCenterChange">) {
  useMapEvents({
    click(event) {
      onCenterChange(event.latlng.lat, event.latlng.lng);
    },
    moveend(event) {
      const center = event.target.getCenter();
      onCenterChange(center.lat, center.lng);
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
  radiusKm,
  onCenterChange,
}: CityCoverageMapProps) {
  return (
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
      <Circle
        center={[latitude, longitude]}
        radius={Math.max(radiusKm, 0.1) * 1000}
        pathOptions={{ color: "#0f6b78", fillColor: "#0f6b78", fillOpacity: 0.2 }}
      />
      <ClickHandler onCenterChange={onCenterChange} />
      <CenterSync latitude={latitude} longitude={longitude} />
    </MapContainer>
  );
}
