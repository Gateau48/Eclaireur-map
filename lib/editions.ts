import { getEditionConfig, getAllEditionConfigs, type EditionConfig } from "./editionsconfig";

export type Edition = EditionConfig;

export function getEdition(id: string): Edition | null {
  return getEditionConfig(id);
}

export function getAllEditions(): Edition[] {
  return getAllEditionConfigs();
}
