/* Footer ribbons — vanilla port of react-bits <Ribbons /> on ogl.
   InMark colors; spring-follow trails chase the cursor over the footer. */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover)').matches;

const wrap = document.getElementById('footerRibbons');
const footer = wrap && wrap.closest('.footer__inner');
if (wrap && footer && !REDUCED && FINE) {
  let started = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(async (en) => {
      if (!en.isIntersecting || started) return;
      started = true;
      io.disconnect();
      try {
        const ogl = await import('https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm');
        start(ogl);
      } catch (e) { /* offline — footer just stays static */ }
    });
  }, { threshold: 0.08 });
  io.observe(footer);
}

function start({ Renderer, Transform, Vec3, Color, Polyline }) {
  const colors = ['#E4EA02', '#FF77E5', '#AADCC6'];
  const baseSpring = 0.03;
  const baseFriction = 0.9;
  const baseThickness = 26;
  const offsetFactor = 0.04;
  const maxAge = 600;
  const pointCount = 50;
  const speedMultiplier = 0.55;
  const effectAmplitude = 1.6;

  const renderer = new Renderer({ dpr: Math.min(2, window.devicePixelRatio || 1), alpha: true });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  wrap.appendChild(gl.canvas);

  const scene = new Transform();
  const lines = [];

  const vertex = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 next;
    attribute vec3 prev;
    attribute vec2 uv;
    attribute float side;
    uniform vec2 uResolution;
    uniform float uDPR;
    uniform float uThickness;
    uniform float uTime;
    uniform float uEffectAmplitude;
    varying vec2 vUV;
    vec4 getPosition() {
      vec4 current = vec4(position, 1.0);
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 nextScreen = next.xy * aspect;
      vec2 prevScreen = prev.xy * aspect;
      vec2 tangent = normalize(nextScreen - prevScreen);
      vec2 normal = vec2(-tangent.y, tangent.x);
      normal /= aspect;
      normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));
      float dist = length(nextScreen - prevScreen);
      normal *= smoothstep(0.0, 0.02, dist);
      float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
      float pixelWidth = current.w * pixelWidthRatio;
      normal *= pixelWidth * uThickness;
      current.xy -= normal * side;
      current.xy += normal * sin(uTime + current.x * 10.0) * uEffectAmplitude;
      return current;
    }
    void main() {
      vUV = uv;
      gl_Position = getPosition();
    }
  `;
  const fragment = `
    precision highp float;
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUV;
    void main() {
      gl_FragColor = vec4(uColor, uOpacity);
    }
  `;

  function resize() {
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    lines.forEach((line) => line.polyline.resize());
  }
  addEventListener('resize', resize, { passive: true });

  const center = (colors.length - 1) / 2;
  colors.forEach((color, index) => {
    const line = {
      spring: baseSpring + (Math.random() - 0.5) * 0.05,
      friction: baseFriction + (Math.random() - 0.5) * 0.05,
      mouseVelocity: new Vec3(),
      mouseOffset: new Vec3((index - center) * offsetFactor + (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.1, 0)
    };
    const points = [];
    for (let i = 0; i < pointCount; i++) points.push(new Vec3());
    line.points = points;
    line.polyline = new Polyline(gl, {
      points,
      vertex,
      fragment,
      uniforms: {
        uColor: { value: new Color(color) },
        uThickness: { value: baseThickness + (Math.random() - 0.5) * 3 },
        uOpacity: { value: 0.95 },
        uTime: { value: 0 },
        uEffectAmplitude: { value: effectAmplitude }
      }
    });
    line.polyline.mesh.setParent(scene);
    lines.push(line);
  });
  resize();

  const mouse = new Vec3(0, 0, 0);
  function updateMouse(e) {
    const rect = wrap.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    mouse.set((x / rect.width) * 2 - 1, (y / rect.height) * -2 + 1, 0);
  }
  // the canvas layer is pointer-events:none, so listen on the footer itself
  footer.addEventListener('mousemove', updateMouse, { passive: true });

  let visible = true;
  new IntersectionObserver((es) => es.forEach((en) => { visible = en.isIntersecting; }), { threshold: 0 }).observe(footer);

  const tmp = new Vec3();
  let last = performance.now();
  function update() {
    requestAnimationFrame(update);
    if (!visible || document.hidden) { last = performance.now(); return; }
    const now = performance.now();
    const dt = now - last;
    last = now;
    lines.forEach((line) => {
      tmp.copy(mouse).add(line.mouseOffset).sub(line.points[0]).multiply(line.spring);
      line.mouseVelocity.add(tmp).multiply(line.friction);
      line.points[0].add(line.mouseVelocity);
      for (let i = 1; i < line.points.length; i++) {
        const segmentDelay = maxAge / (line.points.length - 1);
        const alpha = Math.min(1, (dt * speedMultiplier) / segmentDelay);
        line.points[i].lerp(line.points[i - 1], alpha);
      }
      line.polyline.mesh.program.uniforms.uTime.value = now * 0.001;
      line.polyline.updateGeometry();
    });
    renderer.render({ scene });
  }
  update();
}
