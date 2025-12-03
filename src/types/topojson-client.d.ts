declare module "topojson-client" {
  import type { FeatureCollection, Geometry } from "geojson";
  import type { Topology, Objects } from "topojson-specification";

  // Minimal typings for the handful of helpers we use.
  export function feature<T extends Objects<Geometry>>(
    topology: Topology<T>,
    object: T[keyof T],
  ): FeatureCollection<Geometry>;
}
