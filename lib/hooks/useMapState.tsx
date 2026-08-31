'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Point } from '@/lib/data/types';

interface MapState {
  selectedPoint: Point | null;
  searchQuery: string;
  zoom: number;
  setSelectedPoint: (point: Point | null) => void;
  setSearchQuery: (query: string) => void;
  setZoom: (zoom: number) => void;
}

const MapStateContext = createContext<MapState | null>(null);

export function useMapState(): MapState {
  const context = useContext(MapStateContext);
  if (!context) {
    throw new Error('useMapState must be used within a MapStateProvider');
  }
  return context;
}

export { MapStateContext };
