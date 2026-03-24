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
  const separationDist = 25; // each half moves 25px → total 50px
  let sep = 0;

  if (phase === 'separate') {
    sep = AnimationController.easeOutCubic(progress) * separationDist;
  } else {
    sep = separationDist; // fully separated in later phases
  }

  const offsetA = {
    x: sliceResult.normal.x * sep,
    y: sliceResult.normal.y * sep,
  };
  const offsetB = {
    x: -sliceResult.normal.x * sep,
    y: -sliceResult.normal.y * sep,
  };

  // Draw logo behind the halves (if fading in)
  let logoOpacity = 0;
  if (phase === 'fadeIn') {
    logoOpacity = progress;
  } else if (phase === 'complete') {
    logoOpacity = 1;
  }
  renderer.drawLogo(center, radius, logoOpacity);

  // Draw the two halves
  renderer.drawHalf(center, radius, sliceResult.clipA, offsetA);
  renderer.drawHalf(center, radius, sliceResult.clipB, offsetB);
}

/** Handle a slice gesture. */
function handleSlice(start, end) {
  const center = cm.getCenter();
  const radius = cm.getImageRadius();
  const result = sliceEngine.compute(start, end, center, radius);

  if (!result) return; // missed the icon

  sliceResult = result;
  input.disable(); // only one cut allowed

  anim.start();
}

/** Animation frame callback. */
anim.onFrame((phase, progress) => {
  draw(phase, progress);
});

/** Animation complete callback. */
anim.onComplete(() => {
  draw('complete', 1);
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
