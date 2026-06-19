import * as THREE from 'three';

export interface GridPointerEvent {
  col: number;
  row: number;
}

export class PointerSystem {
  private raycaster = new THREE.Raycaster();
  private ndcPointer = new THREE.Vector2();
  private listeners: Array<(e: GridPointerEvent) => void> = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: THREE.Camera,
    private plane: THREE.Plane,
    private cellSize: number,
  ) {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  onGridClick(fn: (e: GridPointerEvent) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
  }

  private onPointerDown = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.ndcPointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndcPointer, this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, target);
    const col = Math.floor(target.x / this.cellSize);
    const row = Math.floor(target.z / this.cellSize);
    const evt: GridPointerEvent = { col, row };
    this.listeners.forEach((l) => l(evt));
  };
}
