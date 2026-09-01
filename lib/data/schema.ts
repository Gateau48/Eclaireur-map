import { z } from 'zod';
import type { Zone } from './types';

export const SourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  date: z.string(),
  type: z.enum(['presse', 'justice', 'officiel']),
});

export const PointSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['promoteur', 'projet']),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
  status: z.enum(['agree', 'rumeur', 'confirme']),
  zoom_min_marker: z.number(),
  zoom_min_label: z.number(),
  summary: z.string(),
  sources: z.array(SourceSchema).min(1),
  last_verified: z.string(),
});

export const ZoneDataSchema = z.object({
  zone_id: z.string(),
  zone_name: z.string(),
  zone_center: z.object({ lat: z.number(), lng: z.number() }),
  points: z.array(PointSchema),
});

export type ZoneData = z.infer<typeof ZoneDataSchema> & Zone;

export function validateZoneData(data: unknown): Zone {
  return ZoneDataSchema.parse(data) as Zone;
}
