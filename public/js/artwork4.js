// Artwork 4: Fractal Tunnel
window.Artwork4 = class Artwork4 {
    constructor(canvas) {
        this.canvas = canvas;

        this.gl = canvas.getContext('webgl2');
        if (!this.gl) { console.error('WebGL2 non supporté'); return; }

        this.mouse       = { x: 0.5, y: 0.5 };
        this.targetMouse = { x: 0.5, y: 0.5 };
        this.startTime   = Date.now();

        this.init();
    }

    init() {
        const gl = this.gl;

        const vsSource = `#version 300 es
            in vec2 a_position;
            void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
            `;

        const fsSource = `#version 300 es
        precision highp float;
        out vec4 fragColor;
        
        uniform vec2  u_resolution;
        uniform vec2  u_mouse;
        uniform float u_time;
        
        #define TAU 6.28318530717959
        #define PI  3.14159265358979
        #define STEPS 48
        
        vec3 palette(float t) {
            vec3 a = vec3(0.58, 0.32, 0.58);
            vec3 b = vec3(0.28, 0.22, 0.18);
            vec3 c = vec3(1.00, 0.80, 0.60);
            vec3 d = vec3(0.00, 0.15, 0.50);
            return clamp(a + b * cos(TAU * (c * t + d)), 0.0, 1.0);
        }
        
        vec2 kfold(vec2 p, float n) {
            float a    = PI / n;
            float ang  = floor(atan(p.y, p.x) / a) * a + a * 0.5;
            float ca = cos(ang), sa = sin(ang);
            p = vec2(ca * p.x + sa * p.y, abs(-sa * p.x + ca * p.y));
            return p;
        }
        
        float de(vec3 pos) {
            vec3  p     = pos;
            p.xy        = kfold(p.xy, 5.0);
            float scale = 1.0;
            float trap  = 1e9;
        
            for (int i = 0; i < 5; i++) {    // 5 au lieu de 7
                p       = abs(p) - vec3(0.5, 0.5, 0.35);
                float r2 = dot(p, p);
                float k  = max(1.1 / r2, 0.3);
                p       *= k;
                scale   *= k;
                float a  = u_time * 0.07;
                float ca = cos(a), sa = sin(a);
                p.xz     = vec2(ca * p.x - sa * p.z, sa * p.x + ca * p.z);
                trap     = min(trap, length(p.xy) - 0.1);
            }
            return trap / scale;
        }
        
        vec3 normal(vec3 p) {
            float e = 0.003;
            return normalize(vec3(
                de(p + vec3(e,0,0)) - de(p - vec3(e,0,0)),
                de(p + vec3(0,e,0)) - de(p - vec3(0,e,0)),
                de(p + vec3(0,0,e)) - de(p - vec3(0,0,e))
            ));
        }
        
        void main() {
            vec2 uv  = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
            uv.x    *= u_resolution.x / u_resolution.y;
            uv.y     = -uv.y;
        
            float t   = u_time * 0.3;
            vec2  mOff = (u_mouse - vec2(0.5)) * vec2(1.0, -1.0) * 1.2;
        
            vec3 ro      = vec3(0.0, 0.0, t * 0.9);
            vec3 forward = normalize(vec3(mOff.x, mOff.y, 1.8));
            vec3 right   = normalize(cross(forward, vec3(0,1,0)));
            vec3 up      = cross(right, forward);
            vec3 rd      = normalize(uv.x * right + uv.y * up + forward);
        
            float dist = 0.0;
            float hit  = 0.0;
            float glow = 0.0;
        
            for (int i = 0; i < STEPS; i++) {
                vec3  p = ro + rd * dist;
                float d = de(p);
                glow   += 0.010 / (abs(d) + 0.01);
                if (d < 0.003) { hit = 1.0; break; }
                if (dist > 10.0) break;
                dist   += max(d * 0.6, 0.003);
            }
        
            vec3 col = vec3(0.0);
        
            if (hit > 0.5) {
                vec3  p        = ro + rd * dist;
                vec3  n        = normal(p);
                float hue      = dist * 0.08 + t * 0.04 + length(p.xy) * 0.3;
                vec3  base     = palette(hue);
                vec3  lightDir = normalize(vec3(0.4, 0.6, -0.5));
                float diff     = clamp(dot(n, lightDir), 0.0, 1.0);
                float rim      = pow(1.0 - clamp(dot(-rd, n), 0.0, 1.0), 3.0);
                col = base * (diff * 0.7 + 0.3) + rim * palette(hue + 0.3) * 0.6;
            }
        
            float glowN = clamp(glow * 0.04, 0.0, 1.0);
            col        += palette(dist * 0.05 + t * 0.05) * glowN * 1.0;
        
            vec3 bg = palette(length(uv) * 0.3 + t * 0.03) * 0.07;
            col      = mix(bg, col, clamp(hit + glowN * 2.0, 0.0, 1.0));
        
            col *= 1.0 - smoothstep(0.5, 1.4, length(uv * 0.7));
            col  = pow(max(col, vec3(0.0)), vec3(0.90));
        
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
        };
    }

    setMouse(x, y) {
        this.targetMouse.x = x;
        this.targetMouse.y = y;
    }

    render() {
        const gl = this.gl;
        if (!gl || !this.program) return;

        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.04;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.04;

        const w = this.canvas.width;
        const h = this.canvas.height;

        gl.viewport(0, 0, w, h);
        gl.useProgram(this.program);
        gl.uniform2f(this.uniforms.resolution, w, h);
        gl.uniform2f(this.uniforms.mouse,      this.mouse.x, this.mouse.y);
        gl.uniform1f(this.uniforms.time,       (Date.now() - this.startTime) / 1000 * 0.20);
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