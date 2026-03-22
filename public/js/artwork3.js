// Artwork 3: Kaleidoscope
window.Artwork3 = class Artwork3 {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) { console.error('WebGL2 non supporté'); return; }
    this.mouse    = { x: 0.5, y: 0.5 };
    this.targetMouse = { x: 0.5, y: 0.5 };
    this.startTime = Date.now();

    this.params = {
      speed:      0.3,   // vitesse d'animation
      brightness: 1.0,   // luminosité globale
      segments:   6,     // nombre de segments du kaléidoscope (2–16)
      zoom:       1.0,   // zoom sur le motif
    };

    this.init();
  }

  init() {
    const gl = this.gl;

    const vsSource = `#version 300 es
      in vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
      `;

    const fsSource = `#version 300 es
      precision highp float;
      out vec4 fragColor;
      
      uniform vec2  u_resolution;
      uniform vec2  u_mouse;
      uniform float u_time;
      uniform float u_brightness;
      uniform float u_zoom;
      uniform float u_segments;

      #define PI  3.14159265358979
      #define TAU 6.28318530717959

      // ── Utilitaires ────────────────────────────────────────────────

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)),
                 dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }

      float voronoi(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float minDist = 8.0;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 n   = vec2(float(x), float(y));
            vec2 pos = hash2(i + n) + n;
            minDist  = min(minDist, length(f - pos));
          }
        }
        return minDist;
      }

      // Bruit pour les reflets internes du diamant
      float diamondNoise(vec2 p, float t) {
        float v  = voronoi(p * 2.5 + t * 0.15);
        float v2 = voronoi(p * 5.0 - t * 0.09);
        float v3 = voronoi(p * 9.0 + t * 0.07);
        return v * 0.5 + v2 * 0.3 + v3 * 0.2;
      }

      // ── Kaléidoscope ───────────────────────────────────────────────

      // Replie l'espace en N secteurs (symétrie radiale + miroir)
      vec2 kaleidoscope(vec2 uv, float n) {
        float angle = atan(uv.y, uv.x);           // [-PI, PI]
        float r     = length(uv);

        float sector = TAU / n;
        angle = mod(angle, sector);                // ramène dans [0, sector]
        angle = abs(angle - sector * 0.5);         // miroir dans le secteur

        return vec2(cos(angle), sin(angle)) * r;
      }

      // ── Main ───────────────────────────────────────────────────────

      void main() {
        vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
        uv.x   *= u_resolution.x / u_resolution.y; // correction aspect
        uv.y    = -uv.y;

        float t = u_time;

        // La souris fait tourner doucement le motif
        float mouseAngle = (u_mouse.x - 0.5) * PI * 1.2;
        float mouseTilt  = (u_mouse.y - 0.5) * 0.6;

        // Rotation continue + influence souris
        float rot = t * 0.18 + mouseAngle;
        mat2  R   = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
        uv = R * uv;

        // Zoom
        uv /= u_zoom;

        // ── Kaléidoscope ──
        vec2 kUV = kaleidoscope(uv, u_segments);

        // Déplace le centre selon la souris (effet "tilt")
        kUV += vec2(mouseTilt, mouseTilt * 0.5) * 0.4;

        // ── Calcul des couches diamant ──
        float r   = length(kUV);
        float phi = atan(kUV.y, kUV.x);

        // Cercles concentriques → facettes
        float rings   = abs(sin(r * 8.0 - t * 1.2)) ;
        rings         = pow(rings, 3.0);

        // Rayons → arêtes du diamant
        float spokes  = abs(sin(phi * u_segments * 0.5 + t * 0.4));
        spokes        = pow(spokes, 4.0);

        // Bruit interne
        float noise   = diamondNoise(kUV * u_zoom, t);
        float crystal = 1.0 - smoothstep(0.0, 0.6, noise);

        // Combinaison
        float pattern = rings * 0.45 + spokes * 0.3 + crystal * 0.35;

        // ── Palette prismatique ──────────────────────────────────────
        // HSL-like cycling sur l'angle + rayon + temps
        float hue = phi / TAU * 0.25 + 0.75   // amplitude angulaire (plus de variations de couleurs) + offset magenta/rose
                  + r * 0.10                    // dégradé radial discret
                  + t * 0.04;                   // animation plus lente

        // Conversion HSV → RGB simple
        vec3 hsv2rgb_k = vec3(1.0, 2.0/3.0, 1.0/3.0);
        vec3 p_col = abs(fract(vec3(hue) + hsv2rgb_k) * 6.0 - 3.0);
        float sat  = 0.65 + 0.15 * sin(r * 4.0 - t);
        float val = 0.35 + 0.25 * pattern;
        vec3  col  = val * mix(vec3(1.0), clamp(p_col - 1.0, 0.0, 1.0), sat);

        // Reflets blancs
        float glint = pow(max(0.0, rings), 6.0) * 0.6
                    + pow(max(0.0, spokes), 8.0) * 0.4;
        col += glint * vec3(1.0, 0.97, 1.0);

        // Halo central lumineux
        float center = exp(-r * 2.5) * 0.25;
        col += center * vec3(0.8, 0.6, 1.0);

        // Glow souris
        vec2 uvNorm  = (gl_FragCoord.xy / u_resolution);
        float mDist  = length(uvNorm - u_mouse);
        col += exp(-mDist * 6.0) * 0.25 * vec3(0.4, 0.8, 1.0);

        // Vignette
        float vig = pow(1.0 - smoothstep(0.5, 1.4, r * u_zoom * 0.7), 1.5);
        col *= vig;

        // Brightness + gamma
        col *= u_brightness;
        col  = pow(max(col, vec3(0.0)), vec3(0.9));

        fragColor = vec4(col, 1.0);
      }
    `;

    this.program = this._createProgram(vsSource, fsSource);
    if (!this.program) return;

    gl.useProgram(this.program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1,  1,-1, -1, 1,
      -1, 1,  1,-1,  1, 1,
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = {
      resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      mouse:      gl.getUniformLocation(this.program, 'u_mouse'),
      time:       gl.getUniformLocation(this.program, 'u_time'),
      brightness: gl.getUniformLocation(this.program, 'u_brightness'),
      zoom:       gl.getUniformLocation(this.program, 'u_zoom'),
      segments:   gl.getUniformLocation(this.program, 'u_segments'),
    };
  }

  setMouse(x, y) {
    this.targetMouse.x = x;
    this.targetMouse.y = y;
  }

  render() {
    const gl = this.gl;
    if (!gl || !this.program) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    gl.viewport(0, 0, w, h);
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.resolution, w, h);
    gl.uniform2f(this.uniforms.mouse,      this.mouse.x, this.mouse.y);
    gl.uniform1f(this.uniforms.time,       (Date.now() - this.startTime) / 1000 * this.params.speed);
    gl.uniform1f(this.uniforms.brightness, this.params.brightness);
    gl.uniform1f(this.uniforms.zoom,       this.params.zoom);
    gl.uniform1f(this.uniforms.segments,   this.params.segments);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  resize(w, h) {
    this.canvas.width  = w;
    this.canvas.height = h;
  }

  dispose() {}

  _createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this._compileShader(gl.VERTEX_SHADER,   vsSource);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }
};