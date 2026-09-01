'use client';

import { useEffect, useCallback } from 'react';
import { Map, MapControls, MapMarker, MarkerContent, MarkerTooltip, MarkerLabel, useMap } from '@/components/ui/map';
import type { Zone, Point } from '@/lib/data/types';
import { cn } from '@/lib/utils/cn';

const STATUS_COLORS: Record<string, string> = {
  agree: '#34D399',
  rumeur: '#FBBF24',
  confirme: '#F87171',
};

interface MapContainerProps {
  data: Zone;
  center: [number, number];
  zoom: number;
  onPointClick: (point: Point) => void;
  selectedPointId?: string;
  panelOpen?: boolean;
}

function MapInner({ data, onPointClick, selectedPointId, panelOpen }: Omit<MapContainerProps, 'center' | 'zoom'>) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    map.touchZoomRotate.disableRotation();
    map.dragRotate.disable();
  }, [map, isLoaded]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    map.easeTo({
      padding: { left: panelOpen ? 400 : 0 },
      duration: 300,
    });
  }, [map, isLoaded, panelOpen]);

  useEffect(() => {
    if (!map || !isLoaded || !selectedPointId) return;
    const point = data.points.find((p) => p.id === selectedPointId);
    if (point) {
      map.flyTo({
        center: [point.coordinates.lng, point.coordinates.lat],
        zoom: Math.max(map.getZoom(), 15),
        essential: true,
      });
    }
  }, [map, isLoaded, selectedPointId, data.points]);

  if (!isLoaded) return null;

  return <MapMarkers data={data} onPointClick={onPointClick} />;
}

function MapMarkers({ data, onPointClick }: { data: Zone; onPointClick: (point: Point) => void }) {
  const { map } = useMap();
  const zoom = map?.getZoom() ?? 12;

  const visiblePoints = data.points.filter((p) => zoom >= p.zoom_min_marker);

  return (
    <>
      {visiblePoints.map((point) => (
        <MapMarker
          key={point.id}
          longitude={point.coordinates.lng}
          latitude={point.coordinates.lat}
          onClick={() => onPointClick(point)}
        >
          <MarkerContent>
            <div
              className={cn(
                'size-4 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-110',
                point.status === 'agree' && 'bg-emerald-400',
                point.status === 'rumeur' && 'bg-amber-400',
                point.status === 'confirme' && 'bg-red-400',
              )}
            />
          </MarkerContent>
          <MarkerTooltip>{point.name}</MarkerTooltip>
          {zoom >= point.zoom_min_label && (
            <MarkerLabel position="bottom">{point.name}</MarkerLabel>
          )}
        </MapMarker>
      ))}
    </>
  );
}

export default function MapContainer({
  data,
  center,
  zoom,
  onPointClick,
  selectedPointId,
  panelOpen = false,
}: MapContainerProps) {
  return (
    <div
      className="absolute inset-0 z-0"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <Map
        center={center}
        zoom={zoom}
        styles={{
          light: 'https://tiles.openfreemap.org/styles/positron',
          dark: 'https://tiles.openfreemap.org/styles/dark',
        }}
      >
        <MapControls position="bottom-right" showZoom showCompass={false} />
        <MapInner
          data={data}
          onPointClick={onPointClick}
          selectedPointId={selectedPointId}
          panelOpen={panelOpen}
        />
      </Map>
    </div>
  );
}
