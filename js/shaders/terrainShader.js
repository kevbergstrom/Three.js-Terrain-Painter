function waterFunction(x) {
  return `sin((${x} + uTime/10.0)*30.0)*0.01`
}

export const vertex = `
varying vec2 vUv;
varying vec4 worldPos;

uniform sampler2D heightMap;
uniform float mapScaleFactor;
uniform vec3 mapOffset;
uniform float displacement;
uniform float uTime;

void main() {

  vUv = uv;
  vec3 terrainPosition = position;
  float height = texture2D(heightMap, (uv - floor(mapOffset.xy)/16.0/mapScaleFactor)).r;
  //makes lower areas more narrow
  if(height < 0.45){
    height = height*0.8;
  }
  //prevents very bright terrain at max height
  if(height >= 0.95){
    height = 0.95;
  }
  //prevents very bright terrain at min height
  if(height < 2.0/256.0){
    height = 2.0/256.0;
  }
  terrainPosition.z = height * displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( terrainPosition, 1.0 );
  worldPos = modelMatrix * vec4(terrainPosition, 1.0);

}
`

export const fragment = `
varying vec2 vUv;
varying vec4 worldPos;

uniform vec3 mapOffset;
uniform float displacement;
uniform float stepSize;
uniform float ringHeight;
uniform vec3 peakColor;
uniform vec3 valleyColor;
uniform float uTime;
uniform float waterLevel;
uniform vec2 selectPoint;
uniform float selectRadius;

uniform sampler2D surfaceTexture;

vec3 LerpRGB(vec3 a, vec3 b, float t){
  return vec3(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

void main() {
  
  gl_FragColor = vec4(vec3(valleyColor.rgb) + LerpRGB(valleyColor, peakColor, (worldPos.z-1.0)/(displacement-1.0)), 1.0);

  float stepDist = mod(worldPos.z, stepSize);
  float waveLevel = ${waterFunction('worldPos.x - mapOffset.x')};
  float stepDistUnderwater = mod(worldPos.z + waveLevel * (worldPos.z/displacement), stepSize);

  //ring at water's edge
  if(abs(waterLevel + waveLevel - worldPos.z) < ringHeight){
    gl_FragColor += gl_FragColor*0.25;
  }

  if(worldPos.z < waterLevel + waveLevel){
    //below water
    if(stepDistUnderwater < ringHeight){
      gl_FragColor += vec4( 1.0, 1.0, 1.0, 1.0 )*0.25;
    }
    gl_FragColor.rgb = gl_FragColor.rgb * 0.9;
  }else{
    //above water
    if(stepDist < ringHeight){
        gl_FragColor += vec4( 1.0, 1.0, 1.0, 1.0 )*0.25;
      }
  }

  float selectDist = distance(worldPos.xy, selectPoint);
  if(abs(selectDist - selectRadius) < ringHeight/2.0){
    gl_FragColor += vec4( 1.0, 1.0, 1.0, 1.0 )*0.25;
  }

  //texutre mapping
  vec2 surfacePos = vec2(worldPos.x - mapOffset.x + uTime/30.0, worldPos.y - mapOffset.y);
  vec4 surface = texture2D(surfaceTexture, surfacePos*1.0);

  gl_FragColor += surface*0.15*(worldPos.z/displacement);
}
`