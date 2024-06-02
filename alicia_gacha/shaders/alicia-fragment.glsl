varying highp vec2 uvCoordinates;

uniform sampler2D albedoSampler;
uniform sampler2D specSampler;

void main() {
  gl_FragColor = texture2D(albedoSampler, uvCoordinates);
  //
}