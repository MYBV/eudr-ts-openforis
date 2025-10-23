/**
 * Preparación y combinación de datasets de Google Earth Engine
 */

import type * as eeNS from '@google/earthengine';
const ee = require('@google/earthengine/build/main.js') as typeof import('@google/earthengine');

import { config } from "../parameters";

/**
 * Intenta acceder a un dataset y retorna null si falla
 */
function tryAccess(prepFunc: () => eeNS.Image | null): eeNS.Image | null {
  try {
    return prepFunc();
  } catch (error) {
    console.error(`Error accediendo a dataset:`, error);
    return null;
  }
}

// ==================== DATASETS DE COBERTURA FORESTAL ====================

function creafDescalsPalmPrep(): eeNS.Image {
  const oilPalmDescalsRaw = new ee.ImageCollection("BIOPAMA/GlobalOilPalm/v1");
  const oilPalmDescalsMosaic = oilPalmDescalsRaw
    .select("classification")
    .mosaic();
  return oilPalmDescalsMosaic.lte(2).rename("Oil_palm_Descals");
}

function jaxaForestPrep(): eeNS.Image {
  const jaxaForestNonForestRaw = new ee.ImageCollection(
    "JAXA/ALOS/PALSAR/YEARLY/FNF4"
  );
  const jaxaForestNonForest2020 = jaxaForestNonForestRaw
    .filterDate("2020-01-01", "2020-12-31")
    .select("fnf")
    .mosaic();
  return jaxaForestNonForest2020.lte(2).rename("JAXA_FNF_2020");
}

function esriLulcTreesPrep(): eeNS.Image {
  const esriLulc10 = new ee.ImageCollection(
    "projects/sat-io/open-datasets/landcover/ESRI_Global-LULC_10m_TS"
  );
  const esriLulc10_2020 = esriLulc10
    .filterDate("2020-01-01", "2020-12-31")
    .map((image: eeNS.Image) =>
      image.remap([1, 2, 4, 5, 7, 8, 9, 10, 11], [1, 2, 3, 4, 5, 6, 7, 8, 9])
    )
    .mosaic();
  return esriLulc10_2020.eq(2).rename("ESRI_TC_2020");
}

function gladGfc10pcPrep(): eeNS.Image {
  const gfc = new ee.Image("UMD/hansen/global_forest_change_2024_v1_12");
  const gfcTreecover2000 = gfc.select(["treecover2000"]);
  const gfcLoss2001_2020 = gfc.select(["lossyear"]).lte(20);
  const gfcTreecover2020 = gfcTreecover2000.where(gfcLoss2001_2020.eq(1), 0);
  return gfcTreecover2020.gt(10).rename("GFC_TC_2020");
}

function gladLulcStablePrep(): eeNS.Image {
  const gladLandcover2020 = new ee.Image(
    "projects/glad/GLCLU2020/v2/LCLUC_2020"
  ).updateMask(new ee.Image("projects/glad/OceanMask").lte(1));
  const gladLandcover2020Main = gladLandcover2020
    .where(gladLandcover2020.gte(27).and(gladLandcover2020.lte(48)), 27)
    .where(gladLandcover2020.gte(127).and(gladLandcover2020.lte(148)), 27);
  return gladLandcover2020Main.eq(27).rename("GLAD_LULC_2020");
}

function gladPhtPrep(): eeNS.Image {
  const primaryHtForests2001Raw = new ee.ImageCollection(
    "UMD/GLAD/PRIMARY_HUMID_TROPICAL_FORESTS/v1"
  );
  const primaryHtForests2001 = primaryHtForests2001Raw
    .select("Primary_HT_forests")
    .mosaic()
    .selfMask();
  const gfc = new ee.Image("UMD/hansen/global_forest_change_2024_v1_12");
  const gfcLoss2001_2020 = gfc.select(["lossyear"]).lte(20);
  return primaryHtForests2001
    .where(gfcLoss2001_2020.eq(1), 0)
    .rename("GLAD_Primary");
}

function jrcGfc2020Prep(): eeNS.Image {
  const jrcGfc2020Raw = new ee.ImageCollection("JRC/GFC2020/V2");
  return jrcGfc2020Raw.mosaic().rename("EUFO_2020");
}

function jrcTmfTransitionPrep(): eeNS.Image {
  const jrcTmfTransitionsRaw = new ee.ImageCollection(
    "projects/JRC/TMF/v1_2020/TransitionMap_Subtypes"
  );
  const jrcTmfTransitions = jrcTmfTransitionsRaw.mosaic();
  const defaultValue = 0;

  const inListDist = [
    21, 22, 23, 24, 25, 26, 61, 62, 31, 32, 33, 63, 64, 51, 52, 53, 54, 67, 92,
    93, 94,
  ];
  const jrcTmfDisturbed = jrcTmfTransitions
    .remap(inListDist, Array(inListDist.length).fill(1), defaultValue)
    .rename("TMF_disturbed");

  const inListPlnt = [81, 82, 83, 84, 85, 86];
  const jrcTmfPlantations = jrcTmfTransitions
    .remap(inListPlnt, Array(inListPlnt.length).fill(1), defaultValue)
    .rename("TMF_plant");

  const inListUdis = [10, 11, 12];
  const jrcTmfUndisturbed = jrcTmfTransitions
    .remap(inListUdis, Array(inListUdis.length).fill(1), defaultValue)
    .rename("TMF_undist");

  return jrcTmfDisturbed
    .addBands(jrcTmfPlantations)
    .addBands(jrcTmfUndisturbed);
}

function ethKalischekCocoaPrep(): eeNS.Image {
  return new ee.Image(
    "projects/ee-nk-cocoa/assets/cocoa_map_threshold_065"
  ).rename("Cocoa_ETH");
}

function fdapPalmPrep(): eeNS.Image {
  const fdapPalm2020ModelRaw = new ee.ImageCollection(
    "projects/forestdatapartnership/assets/palm/palm_2020_model_20240312"
  );
  const fdapPalm = fdapPalm2020ModelRaw.mosaic().gt(0.95).selfMask();
  return fdapPalm.rename("Oil_palm_FDaP");
}

function esaWorldcoverTreesPrep(): eeNS.Image {
  const esaWorldcover2020Raw = new ee.Image("ESA/WorldCover/v100/2020");
  const esaWorldcoverTrees2020 = esaWorldcover2020Raw
    .eq(95)
    .or(esaWorldcover2020Raw.eq(10));
  return esaWorldcoverTrees2020.rename("ESA_TC_2020");
}

function civOcs2020Prep(): eeNS.Image {
  return new ee.Image("projects/ee-bnetdcign2/assets/OCS_CI_2020vf")
    .eq(9)
    .rename("Cocoa_bnetd");
}

function wcmcWdpaProtectionPrep(): eeNS.Image {
  const wdpaPoly = new ee.FeatureCollection("WCMC/WDPA/current/polygons");
  const wdpaFilt = wdpaPoly.filter(
    ee.Filter.and(
      ee.Filter.neq("STATUS", "Proposed"),
      ee.Filter.neq("STATUS", "Not Reported"),
      ee.Filter.neq("DESIG_ENG", "UNESCO-MAB Biosphere Reserve")
    )
  );
  const wdpaBinary = new ee.Image().paint(wdpaFilt, 1);
  return wdpaBinary.rename("WDPA");
}

// ==================== DISTURBIOS POR AÑO ====================

function tmfDefPerYearPrep(): eeNS.Image {
  const tmfDef = new ee.ImageCollection(
    "projects/JRC/TMF/v1_2022/DeforestationYear"
  ).mosaic();
  let imgStack: eeNS.Image | null = null;

  for (let i = 0; i <= 22; i++) {
    const tmfDefYear = tmfDef.eq(2000 + i).rename(`TMF_def_${2000 + i}`);
    imgStack = imgStack ? imgStack.addBands(tmfDefYear) : tmfDefYear;
  }
  return imgStack!;
}

function tmfDegPerYearPrep(): eeNS.Image {
  const tmfDeg = new ee.ImageCollection(
    "projects/JRC/TMF/v1_2022/DegradationYear"
  ).mosaic();
  let imgStack: eeNS.Image | null = null;

  for (let i = 0; i <= 22; i++) {
    const tmfDegYear = tmfDeg.eq(2000 + i).rename(`TMF_deg_${2000 + i}`);
    imgStack = imgStack ? imgStack.addBands(tmfDegYear) : tmfDegYear;
  }
  return imgStack!;
}

function gladGfcLossPerYearPrep(): eeNS.Image {
  const gfc = new ee.Image("UMD/hansen/global_forest_change_2024_v1_12");
  let imgStack: eeNS.Image | null = null;

  for (let i = 1; i <= 23; i++) {
    const gfcLossYear = gfc
      .select(["lossyear"])
      .eq(i)
      .and(gfc.select(["treecover2000"]).gt(10))
      .rename(`GFC_loss_year_${2000 + i}`);
    imgStack = imgStack ? imgStack.addBands(gfcLossYear) : gfcLossYear;
  }
  return imgStack!;
}

function raddYearPrep(): eeNS.Image {
  const radd = new ee.ImageCollection("projects/radar-wur/raddalert/v1");
  const raddDate = radd
    .filterMetadata("layer", "contains", "alert")
    .select("Date")
    .mosaic();
  const startYear = 19;
  const currentYear = new Date().getFullYear() % 100;
  let imgStack: eeNS.Image | null = null;

  for (let year = startYear; year <= currentYear; year++) {
    const start = year * 1000;
    const end = year * 1000 + 365;
    const raddYear = raddDate
      .updateMask(raddDate.gte(start))
      .updateMask(raddDate.lte(end))
      .gt(0)
      .rename(`RADD_year_20${year}`);
    imgStack = imgStack ? imgStack.addBands(raddYear) : raddYear;
  }
  return imgStack!;
}

function esaFirePrep(): eeNS.Image {
  const esaFire = new ee.ImageCollection("ESA/CCI/FireCCI/5_1");
  let imgStack: eeNS.Image | null = null;

  for (let year = 2001; year <= 2020; year++) {
    const dateSt = `${year}-01-01`;
    const dateEd = `${year}-12-31`;
    const esaYear = esaFire
      .filterDate(dateSt, dateEd)
      .mosaic()
      .select(["BurnDate"])
      .gte(0)
      .rename(`ESA_fire_${year}`);
    imgStack = imgStack ? imgStack.addBands(esaYear) : esaYear;
  }
  return imgStack!;
}

function modisFirePrep(): eeNS.Image {
  const modisFire = new ee.ImageCollection("MODIS/061/MCD64A1");
  const startYear = 2000;
  const currentYear = new Date().getFullYear();
  let imgStack: eeNS.Image | null = null;

  for (let year = startYear; year <= currentYear; year++) {
    const dateSt = `${year}-01-01`;
    const dateEd = `${year}-12-31`;
    const modisYear = modisFire
      .filterDate(dateSt, dateEd)
      .mosaic()
      .select(["BurnDate"])
      .gte(0)
      .rename(`MODIS_fire_${year}`);
    imgStack = imgStack ? imgStack.addBands(modisYear) : modisYear;
  }
  return imgStack!;
}

// ==================== DISTURBIOS COMBINADOS (ANTES/DESPUÉS 2020) ====================

function raddAfter2020Prep(): eeNS.Image {
  const radd = new ee.ImageCollection("projects/radar-wur/raddalert/v1");
  const raddDate = radd
    .filterMetadata("layer", "contains", "alert")
    .select("Date")
    .mosaic();
  const startYear = 21;
  const currentYear = new Date().getFullYear() % 100;
  const start = startYear * 1000;
  const end = currentYear * 1000 + 365;
  return raddDate
    .updateMask(raddDate.gte(start))
    .updateMask(raddDate.lte(end))
    .gt(0)
    .rename("RADD_after_2020");
}

function raddBefore2020Prep(): eeNS.Image {
  const radd = new ee.ImageCollection("projects/radar-wur/raddalert/v1");
  const raddDate = radd
    .filterMetadata("layer", "contains", "alert")
    .select("Date")
    .mosaic();
  const start = 19 * 1000;
  const end = 20 * 1000 + 365;
  return raddDate
    .updateMask(raddDate.gte(start))
    .updateMask(raddDate.lte(end))
    .gt(0)
    .rename("RADD_before_2020");
}

function tmfDegBefore2020Prep(): eeNS.Image {
  const tmfDeg = new ee.ImageCollection(
    "projects/JRC/TMF/v1_2022/DegradationYear"
  ).mosaic();
  return tmfDeg.lte(2020).and(tmfDeg.gte(2000)).rename("TMF_deg_before_2020");
}

function tmfDegAfter2020Prep(): eeNS.Image {
  const tmfDeg = new ee.ImageCollection(
    "projects/JRC/TMF/v1_2022/DegradationYear"
  ).mosaic();
  return tmfDeg.gt(2020).rename("TMF_deg_after_2020");
}

function tmfDefBefore2020Prep(): eeNS.Image {
  const tmfDef = new ee.ImageCollection(
    "projects/JRC/TMF/v1_2022/DeforestationYear"
  ).mosaic();
  return tmfDef.lte(2020).and(tmfDef.gte(2000)).rename("TMF_def_before_2020");
}

function tmfDefAfter2020Prep(): eeNS.Image {
  const tmfDef = new ee.ImageCollection(
    "projects/JRC/TMF/v1_2022/DeforestationYear"
  ).mosaic();
  return tmfDef.gt(2020).rename("TMF_def_after_2020");
}

function gladGfcLossBefore2020Prep(): eeNS.Image {
  const gfc = new ee.Image("UMD/hansen/global_forest_change_2024_v1_12");
  const gfcLoss = gfc
    .select(["lossyear"])
    .lte(20)
    .and(gfc.select(["treecover2000"]).gt(10));
  return gfcLoss.rename("GFC_loss_before_2020");
}

function gladGfcLossAfter2020Prep(): eeNS.Image {
  const gfc = new ee.Image("UMD/hansen/global_forest_change_2024_v1_12");
  const gfcLoss = gfc
    .select(["lossyear"])
    .gt(20)
    .and(gfc.select(["treecover2000"]).gt(10));
  return gfcLoss.rename("GFC_loss_after_2020");
}

function modisFireBefore2020Prep(): eeNS.Image {
  const modisFire = new ee.ImageCollection("MODIS/061/MCD64A1");
  return modisFire
    .filterDate("2000-01-01", "2020-12-31")
    .mosaic()
    .select(["BurnDate"])
    .gte(0)
    .rename("MODIS_fire_before_2020");
}

function modisFireAfter2020Prep(): eeNS.Image {
  const modisFire = new ee.ImageCollection("MODIS/061/MCD64A1");
  const currentYear = new Date().getFullYear();
  return modisFire
    .filterDate("2021-01-01", `${currentYear}-12-31`)
    .mosaic()
    .select(["BurnDate"])
    .gte(0)
    .rename("MODIS_fire_after_2020");
}

function esaFireBefore2020Prep(): eeNS.Image {
  const esaFire = new ee.ImageCollection("ESA/CCI/FireCCI/5_1");
  return esaFire
    .filterDate("2000-01-01", "2020-12-31")
    .mosaic()
    .select(["BurnDate"])
    .gte(0)
    .rename("ESA_fire_before_2020");
}

// ==================== FUNCIÓN PRINCIPAL ====================

/**
 * Combina todos los datasets en una imagen multi-banda
 */
export function combineDatasets(): eeNS.Image {
  let imgCombined = new ee.Image(1).rename(config.geometryAreaColumn);

  // Cobertura forestal
  imgCombined = imgCombined.addBands(tryAccess(creafDescalsPalmPrep));
  imgCombined = imgCombined.addBands(tryAccess(jaxaForestPrep));
  imgCombined = imgCombined.addBands(tryAccess(esriLulcTreesPrep));
  imgCombined = imgCombined.addBands(tryAccess(gladGfc10pcPrep));
  imgCombined = imgCombined.addBands(tryAccess(gladLulcStablePrep));
  imgCombined = imgCombined.addBands(tryAccess(gladPhtPrep));
  imgCombined = imgCombined.addBands(tryAccess(jrcGfc2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(fdapPalmPrep));
  imgCombined = imgCombined.addBands(tryAccess(jrcTmfTransitionPrep));
  imgCombined = imgCombined.addBands(tryAccess(ethKalischekCocoaPrep));
  imgCombined = imgCombined.addBands(tryAccess(wcmcWdpaProtectionPrep));
  imgCombined = imgCombined.addBands(tryAccess(esaWorldcoverTreesPrep));
  imgCombined = imgCombined.addBands(tryAccess(civOcs2020Prep));

  // Disturbios por año
  imgCombined = imgCombined.addBands(tryAccess(tmfDefPerYearPrep));
  imgCombined = imgCombined.addBands(tryAccess(tmfDegPerYearPrep));
  imgCombined = imgCombined.addBands(tryAccess(gladGfcLossPerYearPrep));
  imgCombined = imgCombined.addBands(tryAccess(raddYearPrep));
  imgCombined = imgCombined.addBands(tryAccess(esaFirePrep));
  imgCombined = imgCombined.addBands(tryAccess(modisFirePrep));

  // Disturbios combinados
  imgCombined = imgCombined.addBands(tryAccess(gladGfcLossBefore2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(gladGfcLossAfter2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(esaFireBefore2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(modisFireBefore2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(modisFireAfter2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(tmfDefBefore2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(tmfDefAfter2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(tmfDegBefore2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(tmfDegAfter2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(raddAfter2020Prep));
  imgCombined = imgCombined.addBands(tryAccess(raddBefore2020Prep));

  // Multiplicar todas las bandas por el área de píxel
  imgCombined = imgCombined.multiply(ee.Image.pixelArea());

  return imgCombined;
}
