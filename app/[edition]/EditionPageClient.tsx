'use client';

import { useState, useCallback } from 'react';
import type { Point, Zone } from '@/lib/data/types';
import MapContainer from '@/components/map/MapContainer';
import SearchBar from '@/components/search/SearchBar';
import DetailPanel from '@/components/detail/DetailPanel';

interface EditionPageClientProps {
  zoneData: Zone;
  zones: Zone[];
  center: [number, number];
  zoom: number;
}

export default function EditionPageClient({ zoneData, center, zoom }: EditionPageClientProps) {
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handlePointSelect = useCallback((point: Point) => {
    setSelectedPoint(point);
    setPanelOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setPanelOpen(false);
    setTimeout(() => setSelectedPoint(null), 300);
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        data={zoneData}
        center={center}
        zoom={zoom}
        onPointClick={handlePointSelect}
        selectedPointId={selectedPoint?.id}
        panelOpen={panelOpen}
      />

      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-32px)] max-w-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <SearchBar data={zoneData} onPointSelect={handlePointSelect} />
      </div>

      <DetailPanel point={selectedPoint} onClose={handleClose} />
    </div>
  );
}
