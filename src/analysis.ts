const ee =
  require("@google/earthengine/build/main.js") as typeof import("@google/earthengine");
import { getStatsFormatted, featureCollectionToArray } from "./modules/stats";
import { whispRisk, prepareDataForDataframe } from "./modules/tidyTables";
import { initializeEE } from "./modules/geeInitialize";
import type * as eeNS from "@google/earthengine";
import * as path from "path";
import * as fs from "fs";
import {
  GeoJSONFeatureCollection,
  PlotProperties,
  GeoJSONFeature,
  PlotData,
} from "./types";

const loadGeometriesFromFile = (
  filePath: string
): GeoJSONFeatureCollection | GeoJSONFeature | null => {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent);
    console.log("Archivo cargado, iniciando análisis.");
    return data;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.error(`Archivo no encontrado: ${filePath}`);
    } else if (error instanceof SyntaxError) {
      console.error(`Error decodificando JSON del archivo: ${filePath}`);
    } else {
      console.error(`Ocurrió un error: ${error.message}`);
    }
    return null;
  }
};

const geojsonToFeatureCollection = (
  data: GeoJSONFeatureCollection | GeoJSONFeature
): eeNS.FeatureCollection | null => {
  let features: GeoJSONFeature[] = [];
  let generateGeoids = false;

  if (data.type === "FeatureCollection") {
    features = (data as GeoJSONFeatureCollection).features;
    generateGeoids = (data as GeoJSONFeatureCollection).generateGeoids || false;
  } else if (data.type === "Feature") {
    features = [data as GeoJSONFeature];
  } else {
    console.error("JSON no es un GeoJSON Feature o FeatureCollection válido.");
    return null;
  }

  const outFcList: eeNS.Feature[] = [];

  for (const feature of features) {
    if (!feature.geometry || !feature.geometry.type) {
      console.warn("Formato de geometría inválido en JSON, saltando feature.");
      continue;
    }

    const geometryType = feature.geometry.type;
    const properties: Record<string, any> = {};

    // Preservar geoid si existe
    if (generateGeoids) {
      if (feature.properties?.geoid) {
        properties.geoid = feature.properties.geoid;
      } else {
        properties.geoid = "na";
      }
    }

    let eeFeature: eeNS.Feature;

    if (geometryType === "Polygon") {
      eeFeature = new ee.Feature(
        new ee.Geometry.Polygon(feature.geometry.coordinates as number[][][]),
        properties
      );
    } else if (geometryType === "Point") {
      eeFeature = new ee.Feature(
        new ee.Geometry.Point(
          feature.geometry.coordinates as unknown as number[]
        ),
        properties
      );
    } else {
      console.warn(
        `Tipo de geometría inválido: ${geometryType}, saltando feature.`
      );
      continue;
    }

    outFcList.push(eeFeature);
  }

  if (outFcList.length === 0) {
    console.error("No se pudo crear ninguna feature válida.");
    return null;
  }

  const featureCollection = new ee.FeatureCollection(outFcList);
  console.log("FeatureCollection creado.");
  return featureCollection;
};

export const exportToJSON = (data: PlotData[], outputPath: string): void => {
  const jsonData = JSON.stringify(data, null, 4);
  fs.writeFileSync(outputPath, jsonData, "utf-8");
  console.log(`Datos exportados a ${outputPath}`);
};


const main = async() => {
  // Validar argumentos
  if (process.argv.length < 3) {
    console.error(
      "Error: Uso correcto es node analysis.js <ruta_al_archivo_json>"
    );
    process.exit(1);
  }

  const inputPath = process.argv[2];
  const currentDirectory = process.cwd();

  const filePath = path.resolve(currentDirectory.concat("/"), inputPath);

  console.log(`Procesando archivo: ${filePath}`);

  // Inicializar Earth Engine
  try {
    await initializeEE();
  } catch (error) {
    console.error("Error al inicializar Earth Engine:", error);
    process.exit(1);
  }

  // Cargar geometrías
  const data = loadGeometriesFromFile(filePath);
  if (!data) {
    console.error("No se pudieron cargar las geometrías. Saliendo.");
    process.exit(1);
  }

  // Convertir a FeatureCollection de Earth Engine
  const featureCollection = geojsonToFeatureCollection(data);
  if (!featureCollection) {
    console.error("No se pudo crear la FeatureCollection. Saliendo.");
    process.exit(1);
  }

  console.log("Calculando estadísticas con Google Earth Engine...");
  console.log(
    "Esto puede tomar varios minutos dependiendo del tamaño del área..."
  );

  // Calcular estadísticas
  let featureCollectionWithStats: eeNS.FeatureCollection;
  try {
    featureCollectionWithStats = getStatsFormatted(featureCollection);
  } catch (error) {
    console.error("Error al calcular estadísticas:", error);
    process.exit(1);
  }

  // Convertir a array de JavaScript
  console.log("Descargando resultados de Earth Engine...");
  let plotsData: PlotProperties[];
  try {
    plotsData = await featureCollectionToArray(featureCollectionWithStats);
  } catch (error) {
    console.error("Error al descargar datos de Earth Engine:", error);
    process.exit(1);
  }

  // Preparar datos (agregar plotId)
  const dataWithPlotId = prepareDataForDataframe(plotsData);

  // Calcular indicadores de riesgo EUDR
  console.log("Calculando indicadores de riesgo EUDR...");
  const dataWithRisk = whispRisk(dataWithPlotId, {
    ind_1_pcent_threshold: 10,
    ind_2_pcent_threshold: 10,
    ind_3_pcent_threshold: 0,
    ind_4_pcent_threshold: 0,
  });

  // Exportar resultado JSON
  const outputPath = filePath.replace(".json", "-result.json");
  exportToJSON(dataWithRisk, outputPath);

  console.log("✅ Análisis completado exitosamente.");
}

// Ejecutar
main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
