import {OBJFile} from "./OBJFile.js";

const model = {
  vertices: [
    // Front face
    -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
    // Back face
    -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0,
    // Top face
    -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0,
    // Bottom face
    -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
    // Right face
    1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0,
    // Left face
    -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0,
  ],
  indices: [
    0, 1, 2, 0, 2, 3, // front
    4,
    5,
    6,
    4,
    6,
    7, // back
    8,
    9,
    10,
    8,
    10,
    11, // top
    12,
    13,
    14,
    12,
    14,
    15, // bottom
    16,
    17,
    18,
    16,
    18,
    19, // right
    20,
    21,
    22,
    20,
    22,
    23, // left
  ]
};

const materialRegistry = new Map()
const modelRegistry = new Map()

await main();

async function prepareShaderResources()
{
  const vertexShaderPromise = fetch(`shaders/alicia-vertex.glsl`)
    .then(res => res.text());
  const fragmentShaderPromise = fetch(`shaders/alicia-fragment.glsl`)
    .then(res => res.text());

  const [vertexShader, fragmentShader] = await Promise.all(
    [vertexShaderPromise, fragmentShaderPromise]);
  materialRegistry.set("alicia", {
    "vertexShader": vertexShader,
    "fragmentShader": fragmentShader
  });
}

async function prepareModelResources()
{
  const indexPromise = fetch(`models/index.json`)
    .then(res => res.json());

  const promises = []
  const index = await indexPromise;
  index.forEach(model => {
    modelRegistry.set(model.id, {
      "name": model.name,
      "materialId": model.material_id,
      "vertices": [],
      "indices": []
    });
    promises.push(fetch(model.mesh)
      .then(res => res.text())
      .then(text => new OBJFile(text))
      .then(obj => obj.parse())
      .then(obj => {
        let mesh = obj.models[0];
        let ref = modelRegistry.get(model.id);
        console.log(mesh)

        // Get verticies
        mesh.vertices.forEach(vertex => {
          ref.vertices.push(vertex.x);
          ref.vertices.push(vertex.y);
          ref.vertices.push(vertex.z);
        });

        // Get Vertex indices
        mesh.faces.forEach(face => {
          face.vertices.forEach(vertex => {
            ref.indices.push(vertex.vertexIndex - 1);
          });
        });
        console.log(ref.vertices)
        console.log(ref.indices)
      }));
  });

  await Promise.all(promises);
}

function prepareShaders(gl, material)
{
  const compileShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!status)
    {
      const message = gl.getShaderInfoLog(shader);
      alert(`Couldn't compile shader: ${message}`);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  const shaders = {
    vertexShader: compileShader(gl, gl.VERTEX_SHADER, material.vertexShader),
    fragmentShader: compileShader(gl, gl.FRAGMENT_SHADER, material.fragmentShader)
  };

  const shaderProgram = gl.createProgram();
  gl.attachShader(
    shaderProgram, shaders.vertexShader);
  gl.attachShader(
    shaderProgram, shaders.fragmentShader);
  gl.linkProgram(shaderProgram);

  const status = gl.getProgramParameter(shaderProgram, gl.LINK_STATUS);
  if (!status)
  {
    const message = gl.getProgramInfoLog(shaderProgram);
    alert(`Couldn't link shader program: ${message}`);
    return null;
  }

  return {
    program: shaderProgram,
    attributeLocations: {
      position: gl.getAttribLocation(shaderProgram, "position"),
    },
    uniformLocation: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, "projectionMatrix"),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "modelViewMatrix"),
    }
  };
}

function prepareBuffers(gl, model)
{
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(model.vertices),
    gl.STATIC_DRAW);
  gl.vertexAttribPointer(
    0,
    3, gl.FLOAT,
    false,
    0,
    0);
  /*gl.vertexAttribPointer(
    1,
    2, gl.FLOAT,
    false,
    0,
    12);*/
  gl.enableVertexAttribArray(0);
  /*gl.enableVertexAttribArray(1);*/

  const ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(model.indices),
    gl.STATIC_DRAW);

  return {
    vbo: vbo,
    ebo: ebo,
    vao: vao
  }
}

async function main() {
  const canvas = document.querySelector(
    "#app");
  const gl = canvas.getContext("webgl2");

  if (gl === null) {
    alert("Unable to initialize WebGL.");
    return;
  }

  // Projection matrix
  const projectionMatrix = mat4.create();
  mat4.perspective(
    projectionMatrix, (45 * Math.PI) / 180,
    gl.canvas.clientWidth / gl.canvas.clientHeight,
    0.1,
    100.0);

  // Model matrix
  const modelViewMatrix = mat4.create();
  mat4.translate(
    modelViewMatrix,
    modelViewMatrix,
    [-0.0, -1.0, -4.0]);
  mat4.rotate(
    modelViewMatrix,
    modelViewMatrix,
    Math.PI,
    [1, 0, 0]);

  await prepareShaderResources();
  await prepareModelResources();

  const model = modelRegistry.get("r00_cbt002");
  console.log(model.indices.length)
  const shaders = prepareShaders(gl, materialRegistry.get("alicia"));
  const buffers = prepareBuffers(gl, model);

  gl.useProgram(shaders.program);

  let time = 0.0;
  let last_time = 0;
  let delta_time = 0;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  const render = (current_time) => {
    delta_time = current_time - last_time;
    time += delta_time;
    last_time = current_time;

    mat4.rotate(
      modelViewMatrix,
      modelViewMatrix,
      Math.PI / 365,
      [0, 1, 0]);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaders.program);
    gl.uniformMatrix4fv(
      shaders.uniformLocation.projectionMatrix,
      false,
      projectionMatrix,
    );
    gl.uniformMatrix4fv(
      shaders.uniformLocation.modelViewMatrix,
      false,
      modelViewMatrix,
    );

    gl.bindVertexArray(buffers.vao);
    gl.drawElements(
      gl.TRIANGLES,
      model.indices.length,
      gl.UNSIGNED_SHORT,
      0);

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
}
