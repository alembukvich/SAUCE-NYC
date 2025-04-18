document.addEventListener("DOMContentLoaded", function () {
  // Utilities
  const easeOutSine = (t, b, c, d) => c * Math.sin((t / d) * (Math.PI / 2)) + b;
  const easeOutQuad = (t, b, c, d) => {
    t /= d;
    return -c * t * (t - 2) + b;
  };

  class TouchTexture {
    constructor(options = {}) {
      this.size = options.size || 64;
      this.width = this.height = this.size;
      this.maxAge = 64;
      this.radius = 0.15 * this.size;
      this.trail = [];
      this.last = null;
      this.debug = options.debug || false;

      this.initTexture();
      if (this.debug) {
        this.canvas.style.position = "fixed";
        this.canvas.style.bottom = "0";
        this.canvas.style.right = "0";
        this.canvas.style.width = "240px";
        this.canvas.style.height = "240px";
        this.canvas.style.border = "1px solid white";
        this.canvas.style.zIndex = 1000;
        document.body.appendChild(this.canvas);
      }
    }

    initTexture() {
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext("2d");
      this.clear();

      this.texture = new THREE.Texture(this.canvas);
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.magFilter = THREE.LinearFilter;
    }

    clear() {
      this.ctx.fillStyle = "black";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    update() {
      this.clear();
      for (let i = this.trail.length - 1; i >= 0; i--) {
        const point = this.trail[i];
        let slowDown = 1 - point.age / this.maxAge;
        let force = point.force * 0.016 * slowDown;

        point.x += point.vx * force;
        point.y += point.vy * force;
        point.age++;

        if (point.age > this.maxAge) this.trail.splice(i, 1);
      }

      this.trail.forEach((point) => this.drawPoint(point));
      this.texture.needsUpdate = true;
    }

    addTouch(point) {
      let force = 0,
        vx = 0,
        vy = 0;
      if (this.last) {
        const dx = point.x - this.last.x;
        const dy = point.y - this.last.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0.001) {
          vx = dx / distance;
          vy = dy / distance;
          force = Math.min(distance * 20, 1);
        } else {
          vx = Math.random() * 0.2 - 0.1;
          vy = Math.random() * 0.2 - 0.1;
          force = 0.3;
        }
      } else {
        force = 0.7;
      }

      this.last = { x: point.x, y: point.y };
      this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
    }

    drawPoint(point) {
      const pos = {
        x: point.x * this.width,
        y: (1 - point.y) * this.height,
      };

      let intensity = 1;
      if (point.age < this.maxAge * 0.3) {
        intensity = easeOutSine(point.age / (this.maxAge * 0.3), 0, 1, 1);
      } else {
        intensity = easeOutQuad(
          1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7),
          0,
          1,
          1
        );
      }

      intensity *= point.force;
      let red = ((point.vx + 1) / 2) * 255;
      let green = ((point.vy + 1) / 2) * 255;
      let blue = intensity * 255;
      const color = `${red}, ${green}, ${blue}`;
      const radius = this.radius * (0.5 + intensity * 0.5);
      const offset = this.width * 5;

      this.ctx.shadowOffsetX = offset;
      this.ctx.shadowOffsetY = offset;
      this.ctx.shadowBlur = 2;
      this.ctx.shadowColor = `rgba(${color}, ${0.2 * intensity})`;

      this.ctx.beginPath();
      this.ctx.fillStyle = "rgba(255,0,0,1)";
      this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  class WaterEffect extends POSTPROCESSING.Effect {
    constructor(texture) {
      const fragment = `
        uniform sampler2D uTexture;
  
        // Simplex or pseudo-random noise function
        float rand(vec2 co) {
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }
  
        void mainUv(inout vec2 uv) {
          vec4 tex = texture2D(uTexture, uv);
          float vx = -(tex.r * 2.0 - 1.0);
          float vy = -(tex.g * 2.0 - 1.0);
          float intensity = tex.b;
  
          float maxAmplitude = 0.2;
          float distortionAmount = intensity * maxAmplitude;
  
          // Pixelization only when distortion intensity is significant
          if (intensity > 0.1) {
            float pixelSize = 1.0 / 320.0; // adjust to taste
            uv = floor(uv / pixelSize) * pixelSize;
          }
  
          // Add glitchy UV noise
          float noiseStrength = 0.005;
          float n = rand(uv * 100.0 + vec2(tex.r, tex.g) * 10.0);
          uv.x += (n - 0.5) * noiseStrength * intensity;
          uv.y += (n - 0.5) * noiseStrength * intensity;
  
          uv.x += vx * distortionAmount;
          uv.y += vy * distortionAmount;
        }
  
        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          // Get displacement vector from texture
          vec4 displacementTex = texture2D(uTexture, uv);
          vec2 displacementVector = vec2(
            -(displacementTex.r * 2.0 - 1.0), 
            -(displacementTex.g * 2.0 - 1.0)
          );
          
          // Base aberration amount
          float aberrationAmount = 0.0005;
          
          // Scale aberration by displacement intensity
          float displacementIntensity = displacementTex.b;
          float scaledAberration = aberrationAmount * (1.0 + displacementIntensity * 5.0);
          
          // Mix between radial direction and displacement direction
          vec2 center = vec2(0.5);
          vec2 radialDir = normalize(uv - center);
          vec2 aberrationDir = normalize(mix(radialDir, displacementVector, displacementIntensity * 2.0));
          
          // Sample with offset in the calculated direction
          float r = texture2D(inputBuffer, uv - aberrationDir * scaledAberration).r;
          float g = texture2D(inputBuffer, uv).g;
          float b = texture2D(inputBuffer, uv + aberrationDir * scaledAberration).b;
          
          outputColor = vec4(r, g, b, inputColor.a);
        }
      `;

      super("WaterEffect", fragment, {
        uniforms: new Map([["uTexture", new THREE.Uniform(texture)]]),
      });
    }
  }

  class App {
    constructor(container) {
      this.container = container;
      const rect = container.getBoundingClientRect();
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(rect.width, rect.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.container.innerHTML = "";
      this.container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        45,
        rect.width / rect.height,
        0.1,
        1000
      );
      this.camera.position.z = 50;
      this.clock = new THREE.Clock();
      this.touchTexture = new TouchTexture({ debug: false });

      this.loadTextImage();

      this.onPointerMove = this.onPointerMove.bind(this);
      document.addEventListener("mousemove", this.onPointerMove);
      document.addEventListener(
        "touchmove",
        (ev) => {
          ev.preventDefault();
          const touch = ev.targetTouches[0];
          this.onPointerMove({
            clientX: touch.clientX,
            clientY: touch.clientY,
          });
        },
        { passive: false }
      );

      this.setupResizeObserver();

      for (let i = 0; i < 5; i++) {
        this.touchTexture.addTouch({
          x: 0.5 + (Math.random() - 0.5) * 0.2,
          y: 0.5 + (Math.random() - 0.5) * 0.2,
        });
      }
    }

    setupResizeObserver() {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
      window.addEventListener("resize", () => this.onResize());
    }

    loadTextImage() {
      const loader = new THREE.TextureLoader();
      loader.load(
        "https://cdn.prod.website-files.com/67ed10875886d7af22d322f0/67ffda3db0e974837d8a76d7_LOGO2.png",
        (texture) => {
          this.textTexture = texture;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          this.initTextPlane();
          this.initComposer();
          this.animate();
        }
      );
    }

    getViewSize() {
      const fovInRadians = (this.camera.fov * Math.PI) / 180;
      const height = Math.abs(
        this.camera.position.z * Math.tan(fovInRadians / 2) * 2
      );
      return { width: height * this.camera.aspect, height };
    }

    initTextPlane() {
      const view = this.getViewSize();
      const imageRatio =
        this.textTexture.image.width / this.textTexture.image.height;
      let planeWidth, planeHeight;

      if (imageRatio > 1) {
        planeWidth = view.width * 0.95;
        planeHeight = planeWidth / imageRatio;
      } else {
        planeHeight = view.height * 0.95;
        planeWidth = planeHeight * imageRatio;
      }

      const geo = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1);
      const mat = new THREE.MeshBasicMaterial({
        map: this.textTexture,
        transparent: true,
      });

      this.textMesh = new THREE.Mesh(geo, mat);
      this.scene.add(this.textMesh);
    }

    initComposer() {
      this.composer = new POSTPROCESSING.EffectComposer(this.renderer);
      this.composer.addPass(
        new POSTPROCESSING.RenderPass(this.scene, this.camera)
      );

      const waterEffect = new WaterEffect(this.touchTexture.texture);
      const bloomEffect = new POSTPROCESSING.BloomEffect({
        luminanceThreshold: 0.3,
        luminanceSmoothing: 0.4,
        intensity: 0.5,
        blendMode: POSTPROCESSING.BlendMode.SCREEN,
        kernelSize: POSTPROCESSING.KernelSize.VERY_LARGE,
      });

      const effectPass = new POSTPROCESSING.EffectPass(
        this.camera,
        waterEffect,
        bloomEffect
      );
      effectPass.renderToScreen = true;
      this.composer.addPass(effectPass);
    }

    onPointerMove(ev) {
      const rect = this.container.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width;
      const y = 1 - (ev.clientY - rect.top) / rect.height;
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        this.touchTexture.addTouch({ x, y });
      }
    }

    onResize() {
      const rect = this.container.getBoundingClientRect();
      this.camera.aspect = rect.width / rect.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rect.width, rect.height);
      if (this.composer) this.composer.setSize(rect.width, rect.height);

      if (this.textTexture && this.textMesh) {
        this.scene.remove(this.textMesh);
        this.initTextPlane();
      }
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      this.touchTexture.update();
      this.composer.render(this.clock.getDelta());
    }
  }

  const webGLApp = document.getElementById("webGLApp");
  if (webGLApp) {
    webGLApp.style.position = "absolute";
    webGLApp.style.top = "0";
    webGLApp.style.left = "0";
    webGLApp.style.width = "100%";
    webGLApp.style.height = "100%";
    webGLApp.style.zIndex = "0";
    webGLApp.style.overflow = "hidden";

    try {
      window.app = new App(webGLApp);
    } catch (error) {
      console.error("Error initializing app:", error);
    }
  } else {
    console.error("WebGL container #webGLApp not found");
  }
});
