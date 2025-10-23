/**
 * Cálculo de indicadores de riesgo EUDR y manipulación de tablas
 */

import { PlotProperties, PlotData, RiskThresholds } from "../types";
import {
  config,
  getIndicatorColumns,
} from "../parameters";
import { itemsDataSet } from "../constants";

/**
 * Clamp: limita un valor entre min y max
 */
function clamp(value: number, minVal: number, maxVal: number): number {
  return Math.max(minVal, Math.min(value, maxVal));
}

/**
 * Verifica que el threshold esté entre 0 y 100
 */
function checkRange(value: number): void {
  if (value < 0 || value > 100) {
    throw new Error("El valor del threshold debe estar entre 0 y 100.");
  }
}

/**
 * Agrega una columna de indicador basada en columnas de input y threshold
 */
function addIndicatorColumn(
  data: PlotProperties[],
  inputColumns: string[],
  threshold: number,
  newColumnName: string,
  lowName: "yes" | "no" = "no",
  highName: "yes" | "no" = "yes"
): PlotProperties[] {
  return data.map((row) => {
    let indicatorValue: "yes" | "no" = lowName;

    for (const col of inputColumns) {
      let valToCheck = row[col] as number;

      // Si estamos en hectáreas, convertir a porcentaje
      if (config.percentOrHa === "ha") {
        const areaHa = row[config.geometryAreaColumn] as number;
        if (areaHa && areaHa > 0) {
          valToCheck = clamp((valToCheck / areaHa) * 100, 0, 100);
        }
      }

      // Si algún valor supera el threshold, marcar como "high"
      if (valToCheck > threshold) {
        indicatorValue = highName;
        break;
      }
    }

    return {
      ...row,
      [newColumnName]: indicatorValue,
    };
  });
}

/**
 * Agrega los 4 indicadores de riesgo
 */
function addIndicators(
  data: PlotProperties[],
  thresholds: RiskThresholds,
  ind1Columns: string[],
  ind2Columns: string[],
  ind3Columns: string[],
  ind4Columns: string[]
): PlotProperties[] {
  // Indicador 1: Cobertura arbórea
  let dataWithIndicators = addIndicatorColumn(
    data,
    ind1Columns,
    thresholds.ind_1_pcent_threshold,
    "Indicator_1_treecover",
    "no",
    "yes"
  );

  // Indicador 2: Commodities
  dataWithIndicators = addIndicatorColumn(
    dataWithIndicators,
    ind2Columns,
    thresholds.ind_2_pcent_threshold,
    "Indicator_2_commodities",
    "no",
    "yes"
  );

  // Indicador 3: Disturbios antes de 2020
  dataWithIndicators = addIndicatorColumn(
    dataWithIndicators,
    ind3Columns,
    thresholds.ind_3_pcent_threshold,
    "Indicator_3_disturbance_before_2020",
    "no",
    "yes"
  );

  // Indicador 4: Disturbios después de 2020
  dataWithIndicators = addIndicatorColumn(
    dataWithIndicators,
    ind4Columns,
    thresholds.ind_4_pcent_threshold,
    "Indicator_4_disturbance_after_2020",
    "no",
    "yes"
  );

  return dataWithIndicators;
}

/**
 * Calcula el riesgo EUDR basado en los indicadores
 */
function addEudrRiskCol(data: PlotProperties[]): PlotData[] {
  return data.map((row) => {
    let eudrRisk: "low" | "high" | "more_info_needed";

    const ind1 = row.Indicator_1_treecover as "yes" | "no";
    const ind2 = row.Indicator_2_commodities as "yes" | "no";
    const ind3 = row.Indicator_3_disturbance_before_2020 as "yes" | "no";
    const ind4 = row.Indicator_4_disturbance_after_2020 as "yes" | "no";

    // Si no hay cobertura arbórea, o hay commodities, o hay disturbio histórico → low risk
    if (ind1 === "no" || ind2 === "yes" || ind3 === "yes") {
      eudrRisk = "low";
    }
    // Si no hay disturbio reciente → more_info_needed
    else if (ind4 === "no") {
      eudrRisk = "more_info_needed";
    }
    // En cualquier otro caso → high risk
    else {
      eudrRisk = "high";
    }

    return {
      ...row,
      EUDR_risk: eudrRisk,
    } as PlotData;
  });
}

/**
 * Función principal: calcula riesgo EUDR
 */
export function whispRisk(
  data: PlotProperties[],
  thresholds: RiskThresholds = {
    ind_1_pcent_threshold: 10,
    ind_2_pcent_threshold: 10,
    ind_3_pcent_threshold: 0,
    ind_4_pcent_threshold: 0,
  }
): PlotData[] {
  // Validar thresholds
  checkRange(thresholds.ind_1_pcent_threshold);
  checkRange(thresholds.ind_2_pcent_threshold);
  checkRange(thresholds.ind_3_pcent_threshold);
  checkRange(thresholds.ind_4_pcent_threshold);

  // Obtener columnas para cada indicador desde el lookup
  const lookup = itemsDataSet;

  const ind1Columns = getIndicatorColumns(lookup, "treecover");
  const ind2Columns = getIndicatorColumns(lookup, "commodities");
  const ind3Columns = getIndicatorColumns(lookup, "disturbance_before");
  const ind4Columns = getIndicatorColumns(lookup, "disturbance_after");

  // Agregar indicadores
  const dataWithIndicators = addIndicators(
    data,
    thresholds,
    ind1Columns,
    ind2Columns,
    ind3Columns,
    ind4Columns
  );

  // Calcular riesgo EUDR
  const dataWithRisk = addEudrRiskCol(dataWithIndicators);

  return dataWithRisk;
}

/**
 * Prepara datos para DataFrame agregando plotId
 */
export function prepareDataForDataframe(
  data: PlotProperties[]
): PlotProperties[] {
  return data.map((row, index) => ({
    plotId: index + 1,
    ...row,
  }));
}
