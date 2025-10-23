import { AnalysisConfig, DatasetInfo } from "../types";

export const config: AnalysisConfig = {
  percentOrHa: "ha",
  geometryAreaColumn: "Plot_area_ha",
  statsUnitTypeColumn: "Unit",
  countryColumn: "Country",
  admin1Column: "Admin_Level_1",
  centroidXCoordColumn: "Centroid_lon",
  centroidYCoordColumn: "Centroid_lat",
  geometryTypeColumn: "Geometry_type",
  plotIdColumn: "Plot_ID",
  waterFlag: "In_waterbody",
  geometryAreaFormatting: "%.3f",
  statsAreaFormatting: "%.3f",
  statsPercentFormatting: "%.0f",
};

/**
 * Obtiene lista de datasets para cada indicador
 */
export function getIndicatorColumns(
  lookup: DatasetInfo[],
  theme: string
): string[] {
  return lookup
    .filter((d) => d.exclude !== 1 && d.use_for_risk === 1 && d.theme === theme)
    .map((d) => d.dataset_name);
}

/**
 * Obtiene lista de columnas que son flags de presencia (True/-)
 */
export function getPresenceOnlyFlags(lookup: DatasetInfo[]): string[] {
  return lookup
    .filter((d) => d.exclude !== 1 && d.presence_only_flag === 1)
    .map((d) => d.dataset_name);
}

/**
 * Obtiene lista de columnas a excluir
 */
export function getExcludeList(lookup: DatasetInfo[]): string[] {
  return lookup.filter((d) => d.exclude === 1).map((d) => d.dataset_name);
}
