// Artwork 2: Particle Field - Attraction/Repulsion
window.Artwork2 = class Artwork2 {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mouse = { x: -9999, y: -9999, active: false };
    this.particles = [];
    this.mode = 1; // 1=attract, -1=repel (toggles with click inside overlay)
    this.startTime = Date.now();
    this._initParticles();
    this._boundClick = this._toggleMode.bind(this);
    canvas.addEventListener('click', this._boundClick);
  }

  _initParticles() {
    const count = 600;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 250;
      this.particles.push({
        x: this.canvas.width / 2 + Math.cos(angle) * radius,
        y: this.canvas.height / 2 + Math.sin(angle) * radius,
        ox: this.canvas.width / 2 + Math.cos(angle) * radius,
        oy: this.canvas.height / 2 + Math.sin(angle) * radius,
        vx: 0, vy: 0,
        size: 0.8 + Math.random() * 1.8,
        hue: 220 + Math.random() * 100, // purple-cyan range
        brightness: 0.4 + Math.random() * 0.6,
        speed: 0.3 + Math.random() * 0.7,
      });
    }
  }

  setMouse(x, y) {
    this.mouse.x = x * this.canvas.width;
    this.mouse.y = y * this.canvas.height;
    this.mouse.active = true;
  }

  _toggleMode() {
    this.mode *= -1;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = (Date.now() - this.startTime) / 1000;

    // Fade trail
    ctx.fillStyle = 'rgba(0, 0, 5, 0.18)';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    for (const p of this.particles) {
      // Orbital drift back to origin
      const dox = p.ox - p.x;
      const doy = p.oy - p.y;
      p.vx += dox * 0.004;
      p.vy += doy * 0.004;

      // Natural swirl
      const dx0 = p.x - cx;
      const dy0 = p.y - cy;
      p.vx += -dy0 * 0.00015;
      p.vy +=  dx0 * 0.00015;

      // Mouse interaction
      if (this.mouse.active) {
        const mdx = p.x - this.mouse.x;
        const mdy = p.y - this.mouse.y;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        const influence = Math.min(120 / (dist + 1), 4.0);
        const nx = mdx / (dist + 0.001);
        const ny = mdy / (dist + 0.001);
        // mode: 1=repel, -1=attract
        p.vx += nx * influence * this.mode * 0.3;
        p.vy += ny * influence * this.mode * 0.3;
      }

      // Damping
      p.vx *= 0.92;
      p.vy *= 0.92;

      p.x += p.vx * p.speed;
      p.y += p.vy * p.speed;

      // Velocity magnitude for glow
      const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const glow = Math.min(vel * 0.6, 1.0);

      // Color
      const hue = p.hue + t * 10 + vel * 20;
      const lightness = 55 + glow * 35;
      const alpha = p.brightness * (0.6 + glow * 0.4);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Glow
      if (glow > 0.2) {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gradient.addColorStop(0, `hsla(${hue}, 90%, ${lightness}%, ${alpha * 0.6})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
      }

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + glow * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 90%, ${lightness}%, ${alpha})`;
      ctx.fill();
      ctx.restore();
    }

    // Mode indicator
    ctx.save();
    ctx.font = '10px "Space Mono", monospace';
    ctx.fillStyle = 'rgba(200,168,255,0.3)';
    ctx.letterSpacing = '0.2em';
    ctx.fillText(this.mode === 1 ? 'MODE: REPEL' : 'MODE: ATTRACT', 16, h - 16);
    ctx.restore();

    // Mouse glow
    if (this.mouse.active) {
      const grad = ctx.createRadialGradient(
        this.mouse.x, this.mouse.y, 0,
        this.mouse.x, this.mouse.y, 60
      );
      grad.addColorStop(0, this.mode === 1
        ? 'rgba(122,244,244,0.12)'
        : 'rgba(200,168,255,0.12)');
      grad.addColorStop(1, 'transparent');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.fillRect(this.mouse.x - 60, this.mouse.y - 60, 120, 120);
      ctx.restore();
    }
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this._initParticles();
  }

  dispose() {
    this.canvas.removeEventListener('click', this._boundClick);
  }
};
