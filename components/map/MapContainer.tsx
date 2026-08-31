'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Zone, Point } from '@/lib/data/types';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

interface MapContainerProps {
  data: Zone;
  center: [number, number];
  zoom: number;
  onPointClick: (point: Point) => void;
  onZoomChange: (zoom: number) => void;
  selectedPointId?: string;
}

// Custom marker colors based on status
const STATUS_COLORS: Record<string, string> = {
  agree: '#4CAF50',
  rumeur: '#FFC107',
  confirme: '#F44336',
};

export default function MapContainer({
  data,
  center,
  zoom,
  onPointClick,
  onZoomChange,
  selectedPointId,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const isMobile = useIsMobile();

  // Create marker element
  const createMarkerElement = useCallback(
    (point: Point, currentZoom: number) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${STATUS_COLORS[point.status]};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      `;

      // Show label if zoom is high enough
      if (currentZoom >= point.zoom_min_label) {
        const label = document.createElement('div');
        label.style.cssText = `
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-size: 11px;
          font-weight: 500;
          color: white;
          background: rgba(0,0,0,0.7);
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
          pointer-events: none;
        `;
        label.textContent = point.name;
        el.appendChild(label);
      }

      // Hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      });

      // Click handler
      el.addEventListener('click', () => onPointClick(point));

      return el;
    },
    [onPointClick]
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center,
      zoom,
      // Enable cooperative gestures on desktop to prevent accidental zoom
      cooperativeGestures: !isMobile,
    });

    // Add controls
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.current.addControl(new maplibregl.FullscreenControl(), 'bottom-right');

    // Track zoom changes
    map.current.on('zoom', () => {
      const currentZoom = map.current?.getZoom() || 12;
      onZoomChange(currentZoom);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when data or zoom changes
  useEffect(() => {
    if (!map.current) return;

    const currentZoom = map.current.getZoom();

    // Remove existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add markers for visible points
    data.points.forEach((point) => {
      if (currentZoom >= point.zoom_min_marker) {
        const el = createMarkerElement(point, currentZoom);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([point.coordinates.lng, point.coordinates.lat])
          .addTo(map.current!);

        markers.current.push(marker);
      }
    });
  }, [data.points, createMarkerElement]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers on zoom
  useEffect(() => {
    if (!map.current) return;

    const handleZoom = () => {
      const currentZoom = map.current?.getZoom() || 12;

      // Remove existing markers
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];

      // Re-add markers with updated visibility
      data.points.forEach((point) => {
        if (currentZoom >= point.zoom_min_marker) {
          const el = createMarkerElement(point, currentZoom);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([point.coordinates.lng, point.coordinates.lat])
            .addTo(map.current!);

          markers.current.push(marker);
        }
      });
    };

    map.current.on('zoom', handleZoom);
    return () => {
      map.current?.off('zoom', handleZoom);
    };
  }, [data.points, createMarkerElement]);

  // Fly to selected point
  useEffect(() => {
    if (!map.current || !selectedPointId) return;

    const point = data.points.find((p) => p.id === selectedPointId);
    if (point) {
      map.current.flyTo({
        center: [point.coordinates.lng, point.coordinates.lat],
        zoom: Math.max(map.current.getZoom(), point.zoom_min_label),
        essential: true,
      });
    }
  }, [selectedPointId, data.points]);

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    />
  );
}
