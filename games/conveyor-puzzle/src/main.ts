import { Renderer, GameLoop } from '@arcade/engine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({
  canvas,
  width: window.innerWidth,
  height: window.innerHeight,
});

window.addEventListener('resize', () => {
  renderer.resize(window.innerWidth, window.innerHeight);
});

const loop = new GameLoop((_dt) => {
  renderer.render();
});

loop.start();
