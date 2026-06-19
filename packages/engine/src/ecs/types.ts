export interface Transform {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
}

export interface Renderable {
  meshId: string;
  visible?: boolean;
}

/** Base entity shape — game packages extend this via intersection. */
export type Entity = {
  transform?: Transform;
  renderable?: Renderable;
};
