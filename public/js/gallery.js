// SHADER GALLERY - Main Three.js Scene
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { MODES } from './controlsConfig.js';

const ARTWORKS = [
  {
    id: 1,
    title: 'Undulation',
    description: "Deformation of the undulations by the mouse",
    color: 0xc8a8ff,
    wallColor: new THREE.Color(0.06, 0.03, 0.14),
  },
  {
    id: 2,
    title: 'Attraction/Repulsion',
    description: 'The particles are repelled by the mouse; click to reverse',
    color: 0x7af4f4,
    wallColor: new THREE.Color(0.06, 0.03, 0.14),
  },
  {
    id: 3,
    title: 'Kaleidoscope',
    description: 'Mouse-controlled rotation',
    color: 0xf4a87a,
    wallColor: new THREE.Color(0.06, 0.03, 0.14),
  },
  {
    id: 4,
    title: 'Fractal',
    description: "Mouse-oriented camera",
    color: 0xa0e8ff,
    wallColor: new THREE.Color(0.06, 0.03, 0.14),
  },
];

class ShadersGallery {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.activeArtwork = null;
    this.artworkInstances = {};
    this.frameId = null;
    this.overlayCanvas = null;
    this.overlayRaf = null;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.isTransitioning = false;
    this.frameObjects = [];
    this.hoveredId = null;

    // Tooltip HTML
    this.tooltip = this._createTooltip();

    this._initScene();
    this._buildRoom();
    this._buildArtworkFrames();
    this._buildParticles();
    this._buildLights();
    this._bindEvents();

    setTimeout(() => {
      this._initPreviewSnapshots();
      document.getElementById('loading').classList.add('hidden');
    }, 800);

    this._animate();
  }

  _createTooltip() {
    const el = document.createElement('div');
    el.id = 'artwork-tooltip';
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.25s ease, transform 0.25s ease;
    `;

    const title = document.createElement('div');
    title.id = 'tooltip-title';
    title.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #fff;
      text-shadow: 0 0 12px currentColor;
      white-space: nowrap;
    `;

    const desc = document.createElement('div');
    desc.id = 'tooltip-desc';
    desc.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 10px;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.5);
      white-space: nowrap;
    `;

    el.appendChild(title);
    el.appendChild(desc);
    document.body.appendChild(el);
    return el;
  }

  _showTooltip(artwork, x, y) {
    const title = this.tooltip.querySelector('#tooltip-title');
    const desc  = this.tooltip.querySelector('#tooltip-desc');
    title.textContent = artwork.title;
    title.style.color = `#${0xc8a8ff.toString(16).padStart(6, '0')}`;
    title.style.textShadow = `0 0 16px #${0xc8a8ff.toString(16).padStart(6, '0')}88`;
    desc.textContent  = artwork.description;
    this._moveTooltip(x, y);
    this.tooltip.style.opacity  = '1';
    this.tooltip.style.transform = 'translateY(0px)';
  }

  _hideTooltip() {
    this.tooltip.style.opacity   = '0';
    this.tooltip.style.transform = 'translateY(8px)';
  }

  _moveTooltip(x, y) {
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    // Centré horizontalement sur le curseur, décalé vers le bas
    const tx = Math.min(Math.max(x - tw / 2, 8), window.innerWidth  - tw - 8);
    const ty = Math.min(y + 20, window.innerHeight - th - 8);
    this.tooltip.style.left = tx + 'px';
    this.tooltip.style.top  = ty + 'px';
  }

  _initScene() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000005);
    this.scene.fog = new THREE.FogExp2(0x000005, 0.08);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.cameraPos    = new THREE.Vector3(0, 0, 5);
  }

  _buildRoom() {
    const mat = (color, emissive = 0x000000, emissiveIntensity = 0) =>
        new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, roughness: 0.95, metalness: 0.05 });

    const roomSize = { w: 18, h: 7, d: 14 };

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize.w, roomSize.d, 40, 40),
        new THREE.MeshStandardMaterial({ color: 0x050308, roughness: 0.7, metalness: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.5;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomSize.w, roomSize.d), mat(0x020104));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3.5;
    this.scene.add(ceiling);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize.w, roomSize.h), mat(0x030110, 0x050218, 0.3));
    backWall.position.z = -7;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize.d, roomSize.h), mat(0x020109, 0x04010f, 0.2));
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -9;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize.d, roomSize.h), mat(0x060202, 0x0c0404, 0.15));
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = 9;
    this.scene.add(rightWall);

    const gridHelper = new THREE.GridHelper(18, 18, 0x3a1a6e, 0x1e0d3a);
    gridHelper.position.y = -3.49;
    this.scene.add(gridHelper);
  }

  _buildArtworkFrames() {
    const configs = [
      { pos: new THREE.Vector3(-8.8, 0, -2),   rot: new THREE.Euler(0,  Math.PI / 2, 0), artworkId: 1 },
      { pos: new THREE.Vector3( 3.0, 0, -4.8), rot: new THREE.Euler(0, 0, 0),             artworkId: 2 },
      { pos: new THREE.Vector3(-3.0, 0, -4.8), rot: new THREE.Euler(0, 0, 0),             artworkId: 4 },
      { pos: new THREE.Vector3( 8.8, 0, -2),   rot: new THREE.Euler(0, -Math.PI / 2, 0), artworkId: 3 },
    ];

    configs.forEach(cfg => {
      const artwork    = ARTWORKS.find(a => a.id === cfg.artworkId);
      const frameGroup = new THREE.Group();
      frameGroup.position.copy(cfg.pos);
      frameGroup.rotation.copy(cfg.rot);

      const frameW = 4.2, frameH = 2.6;
      const borderMat = new THREE.MeshStandardMaterial({
        color: 0x100820,
        emissive: new THREE.Color(0xc8a8ff).multiplyScalar(0.15),
        emissiveIntensity: 1, roughness: 0.3, metalness: 0.7,
      });

      const thickness = 0.08, depth = 0.04;
      [[frameW + thickness*2, thickness, depth, 0,  frameH/2 + thickness/2],
        [frameW + thickness*2, thickness, depth, 0, -frameH/2 - thickness/2],
        [thickness, frameH, depth, -frameW/2 - thickness/2, 0],
        [thickness, frameH, depth,  frameW/2 + thickness/2, 0],
      ].forEach(([w, h, d, x, y]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), borderMat);
        b.position.set(x, y, 0);
        frameGroup.add(b);
      });

      // Canvas mesh — snapshot injecté plus tard
      const canvasMat  = new THREE.MeshBasicMaterial({ color: 0x020008 });
      const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), canvasMat);
      canvasMesh.position.z = 0.01;
      canvasMesh.userData.artworkId = cfg.artworkId;
      canvasMesh.userData.isArtwork = true;
      frameGroup.add(canvasMesh);
      this.frameObjects.push({ mesh: canvasMesh, artworkId: cfg.artworkId });

      // Glow
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xc8a8ff), transparent: true, opacity: 0.03,
      });
      const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(frameW + 1, frameH + 0.8), glowMat);
      glowPlane.position.z = -0.1;
      frameGroup.add(glowPlane);

      // ── Pas de label 3D ───────────────────────────────────────

      // Spot
      const spot = new THREE.SpotLight(0xc8a8ff, 2.5, 12, Math.PI / 6, 0.4, 1.5);
      spot.position.copy(cfg.pos).add(new THREE.Vector3(0, 3.5, 0).applyEuler(cfg.rot));
      spot.target.position.copy(cfg.pos);
      this.scene.add(spot);
      this.scene.add(spot.target);

      frameGroup.userData.artworkId = cfg.artworkId;
      this.scene.add(frameGroup);
    });
  }

  _initPreviewSnapshots() {
    ARTWORKS.forEach(artwork => {
      const id           = artwork.id;
      const ArtworkClass = window[`Artwork${id}`];
      if (!ArtworkClass) return;

      const canvas    = document.createElement('canvas');
      canvas.width    = 640;
      canvas.height   = 360;

      let instance;
      try { instance = new ArtworkClass(canvas); }
      catch (e) { console.warn(`Snapshot artwork ${id} failed:`, e); return; }

      for (let i = 0; i < 5; i++) {
        try { instance.render(); } catch(e) {}
      }

      const texture      = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const frameObj = this.frameObjects.find(f => f.artworkId === id);
      if (frameObj) {
        frameObj.mesh.material.dispose();
        frameObj.mesh.material = new THREE.MeshBasicMaterial({ map: texture });
      }

      try { instance.dispose?.(); } catch(e) {}
    });
  }

  _buildParticles() {
    const count     = 800;
    const geo       = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const floorY = -3.5, ceilY = 3.5;

    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 16;
      positions[i*3+1] = floorY + Math.random() * (ceilY - floorY);
      positions[i*3+2] = (Math.random() - 0.5) * 12;
      colors[i*3]   = 0.5 + Math.random() * 0.5;
      colors[i*3+1] = 0.05 + Math.random() * 0.15;
      colors[i*3+2] = 0.6 + Math.random() * 0.4;
      sizes[i] = 0.04 + Math.random() * 0.10;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const texCanvas = document.createElement('canvas');
    texCanvas.width = texCanvas.height = 64;
    const ctx2d = texCanvas.getContext('2d');
    const grad  = ctx2d.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0,    'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.5,  'rgba(255,255,255,0.35)');
    grad.addColorStop(1,    'rgba(255,255,255,0)');
    ctx2d.fillStyle = grad;
    ctx2d.fillRect(0, 0, 64, 64);

    const mat = new THREE.PointsMaterial({
      size: 0.1, vertexColors: true, transparent: true, opacity: 1.0,
      sizeAttenuation: true, map: new THREE.CanvasTexture(texCanvas),
      alphaTest: 0.01, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  _buildLights() {
    this.scene.add(new THREE.AmbientLight(0x0a0520, 0.8));
    const ceiling = new THREE.PointLight(0x1a0840, 1.5, 20);
    ceiling.position.set(0, 3, -3);
    this.scene.add(ceiling);
  }

  _bindEvents() {
    const audio   = document.getElementById('ambiance');
    const muteBtn = document.getElementById('mute-btn');
    const muteIcon = document.getElementById('mute-icon');

    window.addEventListener('resize',    this._onResize.bind(this));
    window.addEventListener('mousemove', this._onMouseMove.bind(this));
    window.addEventListener('click',     this._onClick.bind(this));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') this._closeOverlay(); });
    document.getElementById('close-btn').addEventListener('click', () => this._closeOverlay());

    audio.volume = 0;
    let audioStarted = false;

    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      if (!audioStarted) {
        audio.play()
            .then(() => {
              audioStarted = true;
              audio.volume = 1;
              muteIcon.style.opacity = '1';
            })
            .catch(err => console.warn('Audio play failed:', err));
        return;
      }

      if (audio.paused) {
        audio.play();
        audio.volume = 1;
        muteIcon.style.opacity = '1';
      } else if (audio.volume > 0) {
        audio.volume = 0;
        muteIcon.style.opacity = '0.3';
      } else {
        audio.volume = 1;
        muteIcon.style.opacity = '1';
      }
    });
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _onMouseMove(e) {
    const nx = e.clientX / window.innerWidth;
    const ny = e.clientY / window.innerHeight;

    document.getElementById('cursor').style.left = e.clientX + 'px';
    document.getElementById('cursor').style.top  = e.clientY + 'px';
    setTimeout(() => {
      document.getElementById('cursor-ring').style.left = e.clientX + 'px';
      document.getElementById('cursor-ring').style.top  = e.clientY + 'px';
    }, 80);

    this.mouse.x        = (nx * 2) - 1;
    this.mouse.y        = -(ny * 2) + 1;
    this.cameraTarget.x = (nx - 0.5) * -1.5;
    this.cameraTarget.y = (ny - 0.5) * 0.8;

    // Déplacer le tooltip avec la souris
    if (this.hoveredId !== null) {
      this._moveTooltip(e.clientX, e.clientY);
    }

    if (this.activeArtwork && this.artworkInstances[this.activeArtwork]) {
      const rect = this.overlayCanvas.getBoundingClientRect();
      const ax   = (e.clientX - rect.left) / rect.width;
      const ay   = (e.clientY - rect.top)  / rect.height;
      this.artworkInstances[this.activeArtwork].setMouse(ax, ay);
    }
  }

  _onClick(e) {
    if (this.activeArtwork || this.isTransitioning) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.frameObjects.map(f => f.mesh));
    if (hits.length > 0) this._openArtwork(hits[0].object.userData.artworkId);
  }

  _openArtwork(id) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.activeArtwork   = id;
    this._hideTooltip();

    const artwork = ARTWORKS.find(a => a.id === id);
    document.getElementById('artwork-title-display').textContent = artwork.title;
    document.getElementById('artwork-subtitle').textContent      = artwork.description ?? '';

    const overlay = document.getElementById('artwork-overlay');
    const frame   = document.getElementById('artwork-frame');

    frame.innerHTML = '';
    const canvas    = document.createElement('canvas');
    canvas.width    = 1280;
    canvas.height   = 720;
    canvas.style.width  = '100%';
    canvas.style.height = '100%';
    frame.appendChild(canvas);
    this.overlayCanvas = canvas;

    const ArtworkClass = window[`Artwork${id}`];
    if (ArtworkClass) this.artworkInstances[id] = new ArtworkClass(canvas);

    overlay.classList.add('visible');

    const controls = document.getElementById('shader-controls');
    const inst     = this.artworkInstances[id];

    const config = MODES[id];

    if (!config || !inst) {
      controls.classList.add('hidden');
    } else {
      controls.classList.remove('hidden');

      const rows = controls.querySelectorAll('.ctrl-row');

      rows.forEach((row, i) => {
        const cfg = config[i];
        if (!cfg) return;

        const label = row.querySelector('label');
        const input = row.querySelector('input');
        const value = row.querySelector('span');

        label.textContent = cfg.label;

        input.min = cfg.min;
        input.max = cfg.max;
        input.step = cfg.step;
        input.value = inst.params[cfg.key];

        value.textContent = inst.params[cfg.key].toFixed(cfg.decimals);

        const fresh = input.cloneNode(true);
        input.parentNode.replaceChild(fresh, input);

        fresh.oninput = (e) => {
          const val = parseFloat(e.target.value);
          inst.params[cfg.key] = val;
          value.textContent = val.toFixed(cfg.decimals);
        };
      });
    }

    const renderArtwork = () => {
      if (!this.activeArtwork) return;
      if (this.artworkInstances[id]) this.artworkInstances[id].render();
      this.overlayRaf = requestAnimationFrame(renderArtwork);
    };
    renderArtwork();

    setTimeout(() => { this.isTransitioning = false; }, 600);
  }

  _closeOverlay() {
    if (!this.activeArtwork) return;
    const id = this.activeArtwork;

    document.getElementById('artwork-overlay').classList.remove('visible');
    cancelAnimationFrame(this.overlayRaf);

    setTimeout(() => {
      if (this.artworkInstances[id]) {
        this.artworkInstances[id].dispose?.();
        delete this.artworkInstances[id];
      }
      document.getElementById('shader-controls').classList.add('hidden');
      this.activeArtwork = null;
      this.overlayCanvas = null;
    }, 600);
  }

  _animate() {
    this.frameId = requestAnimationFrame(this._animate.bind(this));
    const t = performance.now() * 0.001;

    // Camera
    this.cameraPos.x += (this.cameraTarget.x - this.cameraPos.x) * 0.04;
    this.cameraPos.y += (this.cameraTarget.y - this.cameraPos.y) * 0.04;
    this.camera.position.x = this.cameraPos.x;
    this.camera.position.y = this.cameraPos.y + Math.sin(t * 0.3) * 0.08;
    this.camera.position.z = 5 + Math.sin(t * 0.2) * 0.15;
    this.camera.lookAt(this.cameraPos.x * 0.3, this.cameraPos.y * 0.2, 0);

    // Particles
    if (this.particles) {
      this.particles.rotation.y = t * 0.01;
      this.particles.rotation.x = Math.sin(t * 0.07) * 0.02;
    }

    // Hover + tooltip
    if (!this.activeArtwork) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits   = this.raycaster.intersectObjects(this.frameObjects.map(f => f.mesh));
      const cursor = document.getElementById('cursor');
      const ring   = document.getElementById('cursor-ring');

      if (hits.length > 0) {
        const hitId = hits[0].object.userData.artworkId;
        cursor.classList.add('hovering');
        ring.classList.add('hovering');

        if (this.hoveredId !== hitId) {
          this.hoveredId = hitId;
          const artwork  = ARTWORKS.find(a => a.id === hitId);
          // Position approximative du curseur en pixels
          const cx = (this.mouse.x + 1) / 2 * window.innerWidth;
          const cy = (1 - (this.mouse.y + 1) / 2) * window.innerHeight;
          this._showTooltip(artwork, cx, cy);
        }
      } else {
        cursor.classList.remove('hovering');
        ring.classList.remove('hovering');
        if (this.hoveredId !== null) {
          this.hoveredId = null;
          this._hideTooltip();
        }
      }
    } else {
      this._hideTooltip();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => { new ShadersGallery(); });