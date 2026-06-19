export type UpdateFn = (dt: number) => void;

export class GameLoop {
  private running = false;
  private lastTime = 0;
  private rafId = 0;

  constructor(private readonly onUpdate: UpdateFn) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.onUpdate(dt);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
