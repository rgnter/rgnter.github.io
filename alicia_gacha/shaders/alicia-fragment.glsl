//varying highp vec2 uvCoordinates;

uniform sampler2D albedoSampler;
uniform sampler2D specSampler;

void main() {
  gl_FragColor = vec4(1, 1, 1, 1);//vec4(1.0 * uvCoordinates.x, 1.0 * uvCoordinates.y, 1.0, 1.0);texture2D(albedoSampler, uvCoordinates);
}