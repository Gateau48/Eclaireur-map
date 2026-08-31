'use client';

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { Point } from '@/lib/data/types';
import MapContainer from '@/components/map/MapContainer';
import SearchBar from '@/components/search/SearchBar';
import DetailPanel from '@/components/detail/DetailPanel';

interface MapState {
  selectedPoint: Point | null;
  searchQuery: string;
  zoom: number;
  setSelectedPoint: (point: Point | null) => void;
  setSearchQuery: (query: string) => void;
  setZoom: (zoom: number) => void;
}

const MapStateContext = createContext<MapState | null>(null);

function useMapState(): MapState {
  const context = useContext(MapStateContext);
  if (!context) {
    throw new Error('useMapState must be used within a MapStateContext.Provider');
  }
  return context;
}

interface EditionPageClientProps {
  zoneData: {
    zone_id: string;
    zone_name: string;
    zone_center: { lat: number; lng: number };
    points: Point[];
  };
  center: [number, number];
  zoom: number;
}

export default function EditionPageClient({ zoneData, center, zoom }: EditionPageClientProps) {
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentZoom, setZoom] = useState(zoom);

  const handlePointClick = useCallback((point: Point) => {
    setSelectedPoint(point);
  }, []);

  const handlePointSelect = useCallback((point: Point) => {
    setSelectedPoint(point);
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedPoint(null);
  }, []);

  const stateValue: MapState = {
    selectedPoint,
    searchQuery,
    zoom: currentZoom,
    setSelectedPoint,
    setSearchQuery,
    setZoom,
  };

  return (
    <MapStateContext.Provider value={stateValue}>
      <div className="relative h-full w-full">
        <MapContainer
          data={zoneData}
          center={center}
          zoom={currentZoom}
          onPointClick={handlePointClick}
          onZoomChange={handleZoomChange}
          selectedPointId={selectedPoint?.id}
        />

        <div className="absolute top-4 left-4 right-4 z-30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <SearchBar data={zoneData} onPointSelect={handlePointSelect} />
        </div>

        <DetailPanel point={selectedPoint} onClose={handleClose} />
      </div>
    </MapStateContext.Provider>
  );
}
