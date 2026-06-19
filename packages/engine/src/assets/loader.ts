import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetLoader {
  private gltfLoader = new GLTFLoader();
  private cache = new Map<string, GLTF>();

  async loadGltf(url: string): Promise<GLTF> {
    const cached = this.cache.get(url);
    if (cached) return cached;
    const gltf = await this.gltfLoader.loadAsync(url);
    this.cache.set(url, gltf);
    return gltf;
  }
}
