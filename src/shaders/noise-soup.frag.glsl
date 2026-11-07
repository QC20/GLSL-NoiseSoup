// Tri-noise shader study based on techniques by Liam Egan and Nimitz,
// with implementation references from Inigo Quilez, Patricio Gonzalez Vivo,
// and Gary "Shane" Warne.
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_pointerForce;
uniform float u_impulse;
uniform float u_palette;
uniform float u_seed;

const mat2 rotation = mat2(0.75, 1.2990381, -1.2990381, 0.75);

float triSmooth(float value) {
  return 0.25 + 0.25 * cos(value * 6.2831853);
}

float triSmoothNoise(vec2 point, float phase) {
  float phaseA = phase * 0.3333;
  float phaseB = phase * 0.15;
  float value = triSmooth(point.x + triSmooth(point.y * 0.5 + phaseA))
    + triSmooth(point.y + triSmooth(point.x * 0.5 - phaseB));

  point *= rotation;
  value += (triSmooth(point.x + triSmooth(point.y * 0.5 + phaseA))
    + triSmooth(point.y + triSmooth(point.x * 0.5 - phaseB))) * 0.7071;

  point *= rotation;
  value += (triSmooth(point.x + triSmooth(point.y * 0.5 + phaseA))
    + triSmooth(point.y + triSmooth(point.x * 0.5 - phaseB))) * 0.5;

  return value / 2.2071 * 0.5 + 0.5;
}

float soupPattern(vec2 point, float phase, float time, out vec2 flowA, out vec2 flowB) {
  flowA = vec2(
    triSmoothNoise(point, phase),
    triSmoothNoise(point + vec2(5.2, 1.3), phase)
  );
  flowB = vec2(
    triSmoothNoise(point + 4.0 * flowA + vec2(1.7 - time * 0.5, 9.2), phase),
    triSmoothNoise(point + 4.0 * flowA + vec2(8.3 - time * 0.5, 2.8), phase)
  );
  vec2 flowC = vec2(
    triSmoothNoise(point + 5.0 * flowB + vec2(21.7 - time * 0.5, 90.2), phase),
    triSmoothNoise(point + 5.0 * flowB + vec2(80.3 - time * 0.5, 20.8), phase)
  );

  return triSmoothNoise(point + 4.0 * flowC, phase);
}

vec3 paletteColor(float field, vec2 flowA, vec2 flowB) {
  vec3 pigment = vec3(field * flowB.x, field * flowB.y, field * flowA.x * 2.0);
  pigment *= pigment * 2.0;

  if (u_palette < 0.5) {
    return pigment;
  }
  if (u_palette < 1.5) {
    return vec3(
      pigment.r * 0.28 + pigment.g * 0.18,
      pigment.g * 0.92 + 0.06,
      pigment.b * 0.62 + pigment.r * 0.4 + 0.08
    );
  }
  return vec3(
    pigment.r * 1.05 + 0.12,
    pigment.g * 0.5 + pigment.b * 0.2,
    pigment.b * 0.28 + 0.04
  );
}

void main() {
  float time = u_time * 0.1;
  vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / u_resolution.y;
  uv *= 3.5;

  vec2 pointer = (u_pointer * u_resolution - u_resolution * 0.5) / u_resolution.y * 3.5;
  vec2 delta = uv - pointer;
  float distanceToPointer = length(delta);
  float influence = exp(-distanceToPointer * 4.2) * u_pointerForce;
  float impulse = exp(-distanceToPointer * 10.0) * u_impulse;
  vec2 tangent = vec2(-delta.y, delta.x);

  // A hand bends the field; a press sends a brief wave through it.
  uv += tangent * influence * 0.22;
  uv += normalize(delta + vec2(0.0001))
    * sin(distanceToPointer * 38.0 - time * 2.0) * impulse * 0.055;

  vec2 flowA;
  vec2 flowB;
  float field = soupPattern(uv, u_seed, time, flowA, flowB);
  vec3 color = paletteColor(field, flowA, flowB);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
