// Artwork 1: Ondulation
window.Artwork1 = class Artwork1 {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) { console.error('WebGL2 non supporté'); return; }
    this.mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    this.startTime = Date.now();

    this.params = {
      speed:      0.3,
      mouseForce: 3.5,
      waveScale:  4.0,
      marbleAmp:  0.35,
    };

    this._init();
  }

  _init() {
    const gl = this.gl;

    const vs = `#version 300 es
      in vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;

    const fs = `#version 300 es
      precision highp float;
      out vec4 fragColor;
      
      uniform vec2  u_res;
      uniform vec2  u_mouse;
      uniform float u_time;
      uniform float u_speed;
      uniform float u_mouse_force;
      uniform float u_wave_scale;
      uniform float u_marble_amp;

      #define PI 3.14159265358979

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
      }
      float gnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
          mix(dot(hash2(i),             f),
              dot(hash2(i + vec2(1,0)), f - vec2(1,0)), u.x),
          mix(dot(hash2(i + vec2(0,1)), f - vec2(0,1)),
              dot(hash2(i + vec2(1,1)), f - vec2(1,1)), u.x),
          u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * gnoise(p);
          p  = mat2(0.8, -0.6, 0.6, 0.8) * p * 2.0;
          a *= 0.55;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_res;
        uv.y = 1.0 - uv.y;
        float aspect = u_res.x / u_res.y;
        vec2 st = vec2(uv.x * aspect, uv.y);
        float t = u_time * u_speed;

        vec2 mouseUV = vec2(u_mouse.x * aspect, u_mouse.y);
        float distM  = length(st - mouseUV);
        float ripple = sin(distM * 18.0 - t * 4.0) * exp(-distM * 3.5) * u_mouse_force * 0.06;
        vec2 dir     = normalize(st - mouseUV + 0.001);
        float warp   = exp(-distM * 2.5) * u_mouse_force * 0.12;
        vec2 warped  = st + dir * warp + vec2(ripple);

        float wave1 = sin(warped.x * u_wave_scale       + t * 1.1
                          + fbm(warped * 0.8 + t * 0.2) * u_marble_amp * PI);
        float wave2 = sin(warped.y * u_wave_scale * 0.7 + t * 0.8
                          + fbm(warped * 1.2 - t * 0.15) * u_marble_amp * PI);
        float wave3 = sin((warped.x + warped.y) * u_wave_scale * 0.5 + t * 1.4
                          + fbm(warped * 1.5 + t * 0.1) * u_marble_amp * PI);

        float marble = (wave1 * 0.45 + wave2 * 0.35 + wave3 * 0.2) * 0.5 + 0.5;
        marble = smoothstep(0.0, 1.0, marble);

        vec3 c0 = vec3(0.02, 0.01, 0.10);
        vec3 c1 = vec3(0.20, 0.04, 0.45);
        vec3 c2 = vec3(0.65, 0.08, 0.65);
        vec3 c3 = vec3(0.90, 0.50, 0.90);
        vec3 c4 = vec3(1.00, 0.92, 1.00);

        vec3 col;
        if      (marble < 0.25) col = mix(c0, c1, marble / 0.25);
        else if (marble < 0.50) col = mix(c1, c2, (marble - 0.25) / 0.25);
        else if (marble < 0.75) col = mix(c2, c3, (marble - 0.50) / 0.25);
        else                    col = mix(c3, c4, (marble - 0.75) / 0.25);

        float glow = exp(-distM * 4.0) * 0.5;
        col = mix(col, vec3(1.0, 0.85, 1.0), glow * u_mouse_force * 0.15);

        vec2 vigUV = uv - 0.5;
        col *= clamp(1.0 - dot(vigUV, vigUV) * 1.2, 0.0, 1.0);

        fragColor = vec4(col, 1.0);
      }
    `;

    this.program = this._link(vs, fs);
    gl.useProgram(this.program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1
    ]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {
      res:        gl.getUniformLocation(this.program, 'u_res'),
      mouse:      gl.getUniformLocation(this.program, 'u_mouse'),
      time:       gl.getUniformLocation(this.program, 'u_time'),
      speed:      gl.getUniformLocation(this.program, 'u_speed'),
      mouseForce: gl.getUniformLocation(this.program, 'u_mouse_force'),
      waveScale:  gl.getUniformLocation(this.program, 'u_wave_scale'),
      marbleAmp:  gl.getUniformLocation(this.program, 'u_marble_amp'),
    };
  }

  setMouse(x, y) { this.mouse.tx = x; this.mouse.ty = y; }

  render() {
    const gl = this.gl, m = this.mouse;
    m.x += (m.tx - m.x) * 0.06;
    m.y += (m.ty - m.y) * 0.06;
    const w = this.canvas.width, h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.program);
    gl.uniform2f(this.u.res,        w, h);
    gl.uniform2f(this.u.mouse,      m.x, m.y);
    gl.uniform1f(this.u.time,       (Date.now() - this.startTime) / 1000);
    gl.uniform1f(this.u.speed,      this.params.speed);
    gl.uniform1f(this.u.mouseForce, this.params.mouseForce);
    gl.uniform1f(this.u.waveScale,  this.params.waveScale);
    gl.uniform1f(this.u.marbleAmp,  this.params.marbleAmp);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose() {}

  _link(vs, fs) {
    const gl = this.gl;
    const p = gl.createProgram();
    gl.attachShader(p, this._compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, this._compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
  }
  _compile(type, src) {
    const gl = this.gl, s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  }
};