import { CanvasManager } from './modules/canvas-manager.js';
import { Renderer } from './modules/renderer.js';
import { InputHandler } from './modules/input-handler.js';
import { SliceEngine } from './modules/slice-engine.js';
import { AnimationController } from './modules/animation-controller.js';

const canvas = document.getElementById('slash-canvas');
const loginArea = document.getElementById('login-area');
const loginBtn = document.getElementById('login-btn');

const cm = new CanvasManager(canvas);
const renderer = new Renderer(cm.ctx);
const input = new InputHandler(canvas);
const sliceEngine = new SliceEngine();
const anim = new AnimationController();

let sliceResult = null;

/** Draw the current frame based on animation state. */
function draw(phase, progress) {
  const center = cm.getCenter();
  const radius = cm.getImageRadius();

  cm.clear();

  if (phase === 'idle') {
    renderer.drawFrontIcon(center, radius);
    return;
  }

  // Calculate separation offset
  const separationDist = 200; // each half moves 200px → total 400px
  let sep = 0;

  if (phase === 'separate') {
    sep = AnimationController.easeOutCubic(progress) * separationDist;
  } else {
    sep = separationDist; // fully separated in later phases
  }

  const offsetA = {
    x: -sliceResult.normal.x * sep,
    y: -sliceResult.normal.y * sep,
  };
  const offsetB = {
    x: sliceResult.normal.x * sep,
    y: sliceResult.normal.y * sep,
  };

  // Calculate logo and halves opacity
  let logoOpacity = 0;
  let halvesOpacity = 1;
  if (phase === 'fadeIn') {
    logoOpacity = progress;
    halvesOpacity = 1 - progress;
  } else if (phase === 'complete') {
    logoOpacity = 1;
    halvesOpacity = 0;
  }

  // Draw halves first, logo on top.
  if (halvesOpacity > 0) {
    renderer.drawHalf(center, radius, sliceResult.clipA, offsetA, halvesOpacity, sliceResult.splashA);
    renderer.drawHalf(center, radius, sliceResult.clipB, offsetB, halvesOpacity, sliceResult.splashB);
  }

  // Draw logo ON TOP so it's never affected by halves' clearRect/compositing
  renderer.drawLogo(center, radius, logoOpacity);
}

/** Handle a slice gesture. */
function handleSlice(start, end) {
  const center = cm.getCenter();
  const radius = cm.getImageRadius();
  const result = sliceEngine.compute(start, end, center, radius);

  if (!result) return; // missed the icon

  sliceResult = result;
  input.disable(); // only one cut allowed

  // Pre-generate splash paths once (so they don't change each frame)
  const n = result.normal;
  sliceResult.splashA = renderer.buildSplashPaths(center, radius, { x: n.x, y: n.y }, result.p1, result.p2);
  sliceResult.splashB = renderer.buildSplashPaths(center, radius, { x: -n.x, y: -n.y }, result.p1, result.p2);

  anim.start();
}

/** Animation frame callback. */
anim.onFrame((phase, progress) => {
  draw(phase, progress);
});

/** Animation complete callback. */
anim.onComplete(() => {
  // Final frame: only logo visible, halves fully faded out
  const center = cm.getCenter();
  const radius = cm.getImageRadius();
  cm.clear();
  renderer.drawLogo(center, radius, 1);
  loginArea.style.display = 'block';
  console.log('登入');
});

/** Resize handler — only redraw when idle (no slice yet). */
cm.onResize(() => {
  if (anim.phase === 'idle') {
    draw('idle', 0);
  }
});

/** Login button handler (placeholder). */
loginBtn.addEventListener('click', () => {
  console.log('登入');
});

/** Init. */
input.onSlice(handleSlice);

(async () => {
  await renderer.loadImages('assets/front_icon.png', 'assets/logo.png');

  if (renderer.state === 'error') {
    renderer.drawError(cm.getCenter());
    return;
  }

  draw('idle', 0);
  input.enable();
})();
