attribute vec3 position;
//attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

//varying highp vec2 uvCoordinates;

void main() {
  //uvCoordinates = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
}