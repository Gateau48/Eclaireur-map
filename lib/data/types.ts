export type Status = 'agree' | 'rumeur' | 'confirme';

export type SourceType = 'presse' | 'justice' | 'officiel';

export interface Source {
  title: string;
  url: string;
  date: string;
  type: SourceType;
}

export interface Point {
  id: string;
  name: string;
  type: 'promoteur' | 'projet';
  coordinates: {
    lat: number;
    lng: number;
  };
  status: Status;
  zoom_min_marker: number;
  zoom_min_label: number;
  summary: string;
  sources: Source[];
  last_verified: string;
}

export interface Zone {
  zone_id: string;
  zone_name: string;
  zone_center: {
    lat: number;
    lng: number;
  };
  points: Point[];
}

export interface Edition {
  slug: string;
  name: string;
  center: [number, number];
  zoom: number;
}

export const EDITIONS: Edition[] = [
  { slug: 'dakar', name: 'Dakar', center: [-17.444, 14.6928], zoom: 12 },
  { slug: 'diamniadio', name: 'Diamniadio', center: [-17.416, 14.7167], zoom: 12 },
  { slug: 'petite-cote', name: 'Petite Côte', center: [-17.395, 14.7566], zoom: 11 },
];

export function getEditionBySlug(slug: string): Edition | undefined {
  return EDITIONS.find((e) => e.slug === slug);
}

export function isValidEdition(slug: string): boolean {
  return EDITIONS.some((e) => e.slug === slug);
}
