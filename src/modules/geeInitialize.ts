/**
 * Inicialización de Google Earth Engine
 */

const ee =
  require("@google/earthengine/build/main.js") as typeof import("@google/earthengine");
import * as fs from "fs";
import * as path from "path";

/**
 * Inicializa Google Earth Engine con credenciales de service account
 */
export async function initializeEE(): Promise<void> {
  const credentialsPath = path.join(process.cwd(), "credentials.json");

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`No se encontró credentials.json en: ${credentialsPath}`);
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));

  return new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      credentials,
      () => {
        ee.initialize(
          null,
          null,
          () => {
            console.log("Earth Engine inicializado correctamente.");
            resolve();
          },
          (error: any) => {
            console.error("Error al inicializar Earth Engine:", error);
            reject(error);
          }
        );
      },
      (error: any) => {
        console.error("Error en autenticación:", error);
        reject(error);
      }
    );
  });
}
