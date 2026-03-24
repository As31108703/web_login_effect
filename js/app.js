import { CanvasManager } from './modules/canvas-manager.js';
import { Renderer } from './modules/renderer.js';

const cm = new CanvasManager(document.getElementById('slash-canvas'));
const renderer = new Renderer(cm.ctx);

(async () => {
  await renderer.loadImages('assets/front_icon.png', 'assets/logo.png');
  console.log('State:', renderer.state);
  renderer.drawFrontIcon(cm.getCenter(), cm.getImageRadius());
})();
