'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Zone, Point } from '@/lib/data/types';
import { geojsonFromZoneData } from '@/lib/data/geojson';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

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
  onZoomChange: (zoom: number) => void;
  selectedPointId?: string;
}

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

  const handlePointClickRef = useRef(onPointClick);
  handlePointClickRef.current = onPointClick;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center,
      zoom,
      cooperativeGestures: true,
    });

    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    m.on('load', () => {
      const geojson = geojsonFromZoneData(data);

      m.addSource('points', {
        type: 'geojson',
        data: geojson,
      });

      m.addLayer({
        id: 'points-circles',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'status'],
            'agree',
            STATUS_COLORS.agree,
            'rumeur',
            STATUS_COLORS.rumeur,
            'confirme',
            STATUS_COLORS.confirme,
            '#999999',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
        filter: ['<=', ['get', 'zoom_min_marker'], ['zoom']],
      });

      m.addLayer({
        id: 'points-labels',
        type: 'symbol',
        source: 'points',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 13,
          'text-offset': [0, 1.5],
        },
        filter: ['<=', ['get', 'zoom_min_label'], ['zoom']],
      });

      m.on('click', 'points-circles', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const props = feature.properties as Record<string, unknown>;
          const point: Point = {
            id: props.id as string,
            name: props.name as string,
            type: props.type as 'promoteur' | 'projet',
            coordinates: {
              lat: (feature.geometry as GeoJSON.Point).coordinates[1] as number,
              lng: (feature.geometry as GeoJSON.Point).coordinates[0] as number,
            },
            status: props.status as Point['status'],
            zoom_min_marker: props.zoom_min_marker as number,
            zoom_min_label: props.zoom_min_label as number,
            summary: props.summary as string,
            sources: props.sources as Point['sources'],
            last_verified: props.last_verified as string,
          };
          handlePointClickRef.current(point);
        }
      });

      m.on('mouseenter', 'points-circles', () => {
        m.getCanvas().style.cursor = 'pointer';
      });

      m.on('mouseleave', 'points-circles', () => {
        m.getCanvas().style.cursor = '';
      });
    });

    m.on('zoom', () => {
      onZoomChange(m.getZoom());
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const source = map.current.getSource('points') as maplibregl.GeoJSONSource;
    if (source) {
      const geojson = geojsonFromZoneData(data);
      source.setData(geojson);
    }
  }, [data]);

  useEffect(() => {
    if (!map.current || !selectedPointId) return;

    const point = data.points.find((p) => p.id === selectedPointId);
    if (point) {
      map.current.flyTo({
        center: [point.coordinates.lng, point.coordinates.lat],
        zoom: Math.max(map.current.getZoom(), 15),
        essential: true,
      });
    }
  }, [selectedPointId, data.points]);

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0 z-0"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    />
  );
}
