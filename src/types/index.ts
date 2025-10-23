/**
 * Tipos y interfaces para el análisis de deforestación con Google Earth Engine
 */

export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: {
    type: 'Polygon' | 'Point';
    coordinates: number[][] | number[][][];
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  generateGeoids?: boolean;
}

export interface PlotProperties {
  plotId?: number;
  geoid?: string;
  Country?: string;
  Admin_Level_1?: string;
  Centroid_lon?: number;
  Centroid_lat?: number;
  Geometry_type?: string;
  Plot_area_ha?: number;
  Unit?: string;
  In_waterbody?: string;
  geometry?: any;
  [key: string]: any; // Para las estadísticas dinámicas de datasets
}

export interface DatasetInfo {
  dataset_id: number;
  dataset_order: number;
  dataset_name: string;
  presence_only_flag: number;
  exclude: number;
  theme: string;
  use_for_risk: number;
}

export interface RiskIndicators {
  Indicator_1_treecover: 'yes' | 'no';
  Indicator_2_commodities: 'yes' | 'no';
  Indicator_3_disturbance_before_2020: 'yes' | 'no';
  Indicator_4_disturbance_after_2020: 'yes' | 'no';
  EUDR_risk: 'low' | 'high' | 'more_info_needed';
}

export interface PlotData extends PlotProperties, RiskIndicators {}

export interface AnalysisConfig {
  percentOrHa: 'ha' | 'percent';
  geometryAreaColumn: string;
  statsUnitTypeColumn: string;
  countryColumn: string;
  admin1Column: string;
  centroidXCoordColumn: string;
  centroidYCoordColumn: string;
  geometryTypeColumn: string;
  plotIdColumn: string;
  waterFlag: string;
  geometryAreaFormatting: string;
  statsAreaFormatting: string;
  statsPercentFormatting: string;
}

export interface RiskThresholds {
  ind_1_pcent_threshold: number;
  ind_2_pcent_threshold: number;
  ind_3_pcent_threshold: number;
  ind_4_pcent_threshold: number;
}

