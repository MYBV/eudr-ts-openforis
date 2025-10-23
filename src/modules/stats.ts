/**
 * Cálculo de estadísticas usando Google Earth Engine
 */

import type * as eeNS from '@google/earthengine';
const ee = require('@google/earthengine/build/main.js') as typeof import('@google/earthengine');
import { combineDatasets } from "./datasets";
import {
  config,
  getPresenceOnlyFlags,
  getExcludeList,
} from "../parameters";
import { PlotProperties } from "../types";
import { itemsDataSet } from '../constants';

/**
 * Prepara imagen de océanos usando USGS GSV
 */
function usgsGsvOceanPrep(): eeNS.Image {
  const mainlands = new ee.FeatureCollection(
    "projects/sat-io/open-datasets/shoreline/mainlands"
  );
  const bigIslands = new ee.FeatureCollection(
    "projects/sat-io/open-datasets/shoreline/big_islands"
  );
  const smallIslands = new ee.FeatureCollection(
    "projects/sat-io/open-datasets/shoreline/small_islands"
  );
  const gsv = mainlands.merge(bigIslands).merge(smallIslands);
  return new ee.Image(1).paint(gsv).selfMask().rename("ocean");
}

/**
 * Prepara imagen de agua superficial permanente usando JRC
 */
function jrcWaterSurfacePrep(): eeNS.Image {
  const jrcSurfaceWater = new ee.Image("JRC/GSW1_4/GlobalSurfaceWater");
  const jrcTransition = jrcSurfaceWater.select("transition");
  const permanentInlandWater = jrcTransition
    .remap([1, 2, 7], [1, 1, 1], 0)
    .unmask();
  return permanentInlandWater.rename("water_inland");
}

/**
 * Combina flags de agua (océano + agua permanente)
 */
function waterFlagAllPrep(): eeNS.Image {
  return usgsGsvOceanPrep()
    .unmask()
    .where(jrcWaterSurfacePrep(), 1)
    .rename("water_flag");
}

/**
 * Obtiene valor en un punto y retorna flag True/-
 */
function valueAtPointFlag(
  point: eeNS.Geometry,
  image: eeNS.Image,
  bandName: string,
  outputName: string
): eeNS.Dictionary {
  const sample = image
    .sample({ region: point, scale: 30, numPixels: 1 })
    .first();
  const value = sample.get(bandName);
  const result = ee.Algorithms.If(new ee.Number(value).eq(1), "True", "-");
  return new ee.Dictionary({ [outputName]: result });
}

/**
 * Obtiene información de país usando GeoBoundaries
 */
function getGeoboundariesInfo(geometry: eeNS.Geometry): eeNS.Dictionary {
  // Ojo: tu variable se llama ADM0 pero el dataset es ADM1; renómbrala si quieres.
  const gboundsADM1 = new ee.FeatureCollection('WM/geoLab/geoBoundaries/600/ADM1');

  const backupDict = new ee.Dictionary({
    shapeGroup: 'Unknown',
    shapeName: 'Unknown',
  });

  const polygonsIntersectPoint = gboundsADM1.filterBounds(geometry);

  // 👇 Forzamos el tipo concreto a Dictionary para que .get exista
  return new ee.Dictionary(
    ee.Algorithms.If(
      polygonsIntersectPoint.size().gt(0),
      // Tomamos el primer feature e incluimos solo las keys necesarias
      polygonsIntersectPoint.first().toDictionary().select(['shapeGroup', 'shapeName']),
      backupDict
    )
  );
}

/**
 * Divide valor y formatea
 */
function divideAndFormat(val: number, unit: number): eeNS.Number {
  const formattedValue = new ee.Number(val).divide(new ee.Number(unit));
  return formattedValue;
}

/**
 * Convierte a porcentaje y formatea
 */
function percentAndFormat(val: number, areaHa: number): eeNS.Number {
  const formattedValue = new ee.Number(val).divide(areaHa).multiply(100);
  return formattedValue;
}

/**
 * Calcula estadísticas para un feature individual
 */
function getStatsFeature(feature: eeNS.Feature): eeNS.Feature {
  const imgCombined = combineDatasets();

  const reduce = imgCombined.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: feature.geometry(),
    scale: 10,
    maxPixels: 1e10,
    tileScale: 8,
  });

  const centroid = feature.geometry().centroid(1);
  const location = getGeoboundariesInfo(centroid);

  const country = new ee.Dictionary({
    [config.countryColumn]: location.get("shapeGroup"),
  });
  const admin1 = new ee.Dictionary({
    [config.admin1Column]: location.get("shapeName"),
  });

  const waterAll = waterFlagAllPrep();
  const waterFlagDict = valueAtPointFlag(
    centroid,
    waterAll,
    "water_flag",
    config.waterFlag
  );

  const geomType = new ee.Dictionary({
    [config.geometryTypeColumn]: feature.geometry().type(),
  });

  const coordsList = centroid.coordinates();
  const coordsDict = new ee.Dictionary({
    [config.centroidXCoordColumn]: coordsList.get(0),
    [config.centroidYCoordColumn]: coordsList.get(1),
  });

  const statsUnitType = new ee.Dictionary({
    [config.statsUnitTypeColumn]: config.percentOrHa,
  });

  const featureInfo = country
    .combine(admin1)
    .combine(geomType)
    .combine(coordsDict)
    .combine(statsUnitType)
    .combine(waterFlagDict);

  // Convertir de m² a hectáreas
  const reduceHa = reduce.map((_key: string, val: any) =>
    divideAndFormat(new ee.Number(val) as unknown as number, 10000)
  );

  const areaHa = new ee.Number(reduceHa.get(config.geometryAreaColumn));

  // Decidir si usar hectáreas o porcentajes
  let reducerStats: eeNS.Dictionary;
  if (config.percentOrHa === "ha") {
    reducerStats = reduceHa.set(config.geometryAreaColumn, areaHa);
  } else {
    const reducePercent = reduceHa.map((_key: string, val: any) =>
      percentAndFormat(
        new ee.Number(val) as unknown as number,
        areaHa as unknown as number
      )
    );
    reducerStats = reducePercent.set(config.geometryAreaColumn, areaHa);
  }

  const properties = featureInfo.combine(reducerStats);

  return new ee.Feature(null)
    .set(properties)
    .set("geoid", feature.get("geoid"))
    .set("geometry", feature.geometry());
}

/**
 * Calcula estadísticas para una FeatureCollection
 */
function getStatsFC(featureCol: eeNS.FeatureCollection): eeNS.FeatureCollection {
  return featureCol.map((feature: eeNS.Feature) => getStatsFeature(feature));
}

/**
 * Agrega ID a cada feature
 */
function addIdToFeatureCollection(
  dataset: eeNS.FeatureCollection,
  idName: string
): eeNS.FeatureCollection {
  const indexes = dataset.aggregate_array("system:index");
  const ids = ee.List.sequence(1, indexes.size() as unknown as number);
  const idByIndex = ee.Dictionary.fromLists(indexes, ids);

  const addId = (feature: eeNS.Feature) => {
    const systemIndex = feature.get("system:index");
    const featureId = idByIndex.get(systemIndex);
    return feature.set(idName, featureId);
  };

  return dataset.map(addId);
}

/**
 * Marca valores positivos como 'True' o '-'
 */
function flagPositiveValues(
  feature: eeNS.Feature,
  flagPositive: string[]
): eeNS.Feature {
  let updatedFeature = feature;

  flagPositive.forEach((propName) => {
    const flagValue = ee.Algorithms.If(
      new ee.Number(feature.get(propName)).gt(0),
      "True",
      "-"
    );
    updatedFeature = updatedFeature.set(propName, flagValue);
  });

  return updatedFeature;
}

/**
 * Excluye propiedades
 */
function copyPropertiesAndExclude(
  feature: eeNS.Feature,
  excludeProperties: string[]
): eeNS.Feature {
  return new ee.Feature(feature.geometry()).copyProperties({
    source: feature,
    exclude: excludeProperties,
  });
}

/**
 * Reformatea FeatureCollection con flags y exclusiones
 */
function reformatWhispFC(
  featureCollection: eeNS.FeatureCollection,
  idName: string,
  flagPositive: string[],
  excludeProperties: string[]
): eeNS.FeatureCollection {
  let fc = featureCollection;

  // Agregar ID
  fc = addIdToFeatureCollection(fc, idName);

  // Flag valores positivos
  if (flagPositive.length > 0) {
    fc = fc.map((feature: eeNS.Feature) =>
      flagPositiveValues(feature, flagPositive)
    );
  }

  // Excluir propiedades
  if (excludeProperties.length > 0) {
    fc = fc.map((feature: eeNS.Feature) =>
      copyPropertiesAndExclude(feature, excludeProperties)
    );
  }

  return fc;
}

/**
 * Calcula estadísticas y formatea (función principal)
 */
export function getStatsFormatted(
  featureOrFeatureCol: eeNS.Feature | eeNS.FeatureCollection
): eeNS.FeatureCollection {
  let fc: eeNS.FeatureCollection;

  if (featureOrFeatureCol instanceof ee.Feature) {
    fc = new ee.FeatureCollection([getStatsFeature(featureOrFeatureCol)]);
  } else {
    fc = getStatsFC(featureOrFeatureCol);
  }

  const lookup = itemsDataSet;
  
  const presenceOnlyFlagList = getPresenceOnlyFlags(lookup);
  const excludeList = getExcludeList(lookup);

  const fcFormatted = reformatWhispFC(
    fc,
    config.plotIdColumn,
    presenceOnlyFlagList,
    excludeList
  );

  return fcFormatted;
}

/**
 * Convierte FeatureCollection a array de objetos para usar en Node.js
 */
export async function featureCollectionToArray(
  fc: eeNS.FeatureCollection
): Promise<PlotProperties[]> {
  return new Promise((resolve, reject) => {
    fc.getInfo((result: any, error: any) => {
      if (error) {
        reject(error);
      } else {
        const features = result.features.map((f: any) => f.properties);
        resolve(features);
      }
    });
  });
}
