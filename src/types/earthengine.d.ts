/**
 * Declaraciones mínimas útiles para @google/earthengine en Node/TS
 * Ajustado para exponer ee.Reducer como clase (con métodos estáticos), tal como en runtime.
 */

declare module '@google/earthengine' {
  // --- API base ---
  export namespace data {
    export function authenticateViaPrivateKey(
      credentials: any,
      onSuccess: () => void,
      onError?: (error: any) => void
    ): void;
  }

  export function initialize(
    optBaseUrl?: string | null,
    optTileUrl?: string | null,
    onSuccess?: () => void,
    onError?: (error: any) => void,
    optXsrfToken?: string | null,
    optProject?: string | null
  ): void;

  // --- ComputedObject y helpers ---
  export class ComputedObject {
    getInfo(callback?: (result: any, error?: any) => void): any;
    evaluate<T = any>(callback: (value: T, err?: any) => void): void;
  }

  export class Number extends ComputedObject {
    constructor(value: number | ComputedObject);
    eq(other: number | Number): Number;
    gt(other: number | Number): Number;
    gte(other: number | Number): Number;
    lt(other: number | Number): Number;
    lte(other: number | Number): Number;
    divide(other: number | Number): Number;
    multiply(other: number | Number): Number;
    format(pattern: string): String;
    static parse(value: any): Number;
  }

  export class String extends ComputedObject {
    constructor(value: string | ComputedObject);
  }

  export class List extends ComputedObject {
    constructor(values: any[]);
    get(index: number): any;
    size(): Number;
    static sequence(start: number, end: number, step?: number): List;
  }

  export class Dictionary extends ComputedObject {
    constructor(values?: Record<string, any>);
    get(key: string): any;
    set(key: string, value: any): Dictionary;
    combine(other: Dictionary): Dictionary;
    select(selectors: string[]): Dictionary;
    map(callback: (key: string, val: any) => any): Dictionary;
    static fromLists(keys: List, values: List): Dictionary;
  }

  // --- Geometrías ---
  export class Geometry extends ComputedObject {
    type(): String;
    coordinates(): List;
    centroid(maxError?: number): Geometry;
    bounds(maxError?: number, proj?: any): Geometry;
    buffer(distance: number, maxError?: number): Geometry;
  }

  export namespace Geometry {
    export class Point extends Geometry {
      constructor(coords: number[] | List);
    }
    export class Polygon extends Geometry {
      constructor(coords: any); // aceptamos forma laxa
    }
  }

  // --- Feature / FeatureCollection ---
  export class Feature extends ComputedObject {
    constructor(geometry: Geometry | null, properties?: Record<string, any>);
    geometry(): Geometry;
    get(property: string): any;
    set(property: string | Record<string, any>, value?: any): Feature;
    setGeometry(geometry: Geometry | null): Feature;
    copyProperties(options: { source: Feature; exclude?: string[] }): Feature;
    toDictionary(keys?: string[]): Dictionary;
  }

  export class FeatureCollection extends ComputedObject {
    // Acepta lista de Features, un ID de tabla, otra FC o lista de FCs
    constructor(
      features: Feature[] | string | FeatureCollection | FeatureCollection[]
    );
  
    /** Une dos FeatureCollections (inmutable: devuelve una nueva FC) */
    static merge(fc1: FeatureCollection, fc2: FeatureCollection): FeatureCollection;
  
    /** Versión de instancia, igual que la estática, encadenable */
    merge(other: FeatureCollection): FeatureCollection;
  
    map(callback: (feature: Feature) => Feature): FeatureCollection;
    filter(filter: Filter): FeatureCollection;
    filterBounds(geometry: Geometry): FeatureCollection;
    filterDate(start: string | Date, end: string | Date): FeatureCollection;
  
    first(): Feature;
    size(): Number;
    flatten(): FeatureCollection;
  
    aggregate_array(property: string): List;
    distinct(property: string): FeatureCollection;
    limit(max: number, property?: string, ascending?: boolean): FeatureCollection;
    sort(property: string, ascending?: boolean): FeatureCollection;
    toList(count?: number, offset?: number): List;
  }

  // --- Image / ImageCollection ---
  export class Image extends ComputedObject {
    constructor(value?: number | string | Image);
    select(bands: string | string[], newNames?: string | string[]): Image;
    rename(names: string | string[]): Image;
    addBands(image: Image | null): Image;

    eq(value: number | Image): Image;
    gt(value: number | Image): Image;
    gte(value: number | Image): Image;
    lt(value: number | Image): Image;
    lte(value: number | Image): Image;
    and(other: Image): Image;
    or(other: Image): Image;
    where(test: Image, value: number | Image): Image;
    remap(from: number[], to: number[], defaultValue?: number): Image;

    mosaic(): Image;
    selfMask(): Image;
    unmask(value?: number): Image;
    multiply(value: number | Image): Image;

    paint(
      featureCollection: FeatureCollection | Feature | Geometry,
      color?: number | string | Image,
      width?: number
    ): Image;

    updateMask(mask: Image): Image;

    sample(options: {
      region: Geometry | Feature | FeatureCollection;
      scale?: number;
      numPixels?: number;
    }): FeatureCollection;

    reduceRegion(options: {
      reducer: Reducer;
      geometry: Geometry | Feature | FeatureCollection;
      scale?: number;
      maxPixels?: number;
      tileScale?: number;
      bestEffort?: boolean;
    }): Dictionary;

    static pixelArea(): Image;
    clip(geom: Geometry | Feature | FeatureCollection): Image;
    reproject(crs: any, transform?: any, scale?: number): Image;
    normalizedDifference(bands: string[] | [string, string]): Image;
    set(dict: Record<string, any>): Image;
    get(name: string): any;
  }

  export class ImageCollection extends ComputedObject {
    constructor(id: string | Image[] | ImageCollection);
    select(bands: string | string[], newNames?: string | string[]): ImageCollection;
    filterDate(start: string | Date, end: string | Date): ImageCollection;
    filterBounds(geom: Geometry | Feature | FeatureCollection): ImageCollection;
    filterMetadata(property: string, operator: string, value: any): ImageCollection;
    mosaic(): Image;
    map(callback: (image: Image) => Image): ImageCollection;
    mean(): Image;
    median(): Image;
    max(): Image;
    min(): Image;
    first(): Image;
    size(): Number;
    toBands(): Image;
  }

  // --- Reducer (CLASE, no namespace) ---
  export class Reducer extends ComputedObject {
    // creadores estáticos
    static sum(): Reducer;
    static mean(): Reducer;
    static count(): Reducer;
    static min(): Reducer;
    static max(): Reducer;
    static median(): Reducer;
    static mode(): Reducer;
    static stdDev(): Reducer;
    static variance(): Reducer;
    static frequencyHistogram(): Reducer;
    static percentile(percentiles: number[] | number, opt_interpolation?: string): Reducer;

    // combinadores
    combine(other: Reducer, sharedInputs?: boolean): Reducer;
    repeat(n: number): Reducer;
  }

  // --- Filter ---
  export namespace Filter {
    export function and(...filters: any[]): any;
    export function or(...filters: any[]): any;
    export function eq(property: string, value: any): any;
    export function neq(property: string, value: any): any;
    export function gt(property: string, value: number): any;
    export function gte(property: string, value: number): any;
    export function lt(property: string, value: number): any;
    export function lte(property: string, value: number): any;
    export function date(start: string | Date, end: string | Date): any;
    export function bounds(geometry: Geometry): any;
  }

  // --- Algorithms (opcional, útil a veces) ---
  export namespace Algorithms {
    export function If(condition: any, trueValue: any, falseValue: any): any;
  }
}
