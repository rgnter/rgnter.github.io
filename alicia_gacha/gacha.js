import {OBJFile} from "./OBJFile.js";

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

async function prepareModelResources(gl)
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
      "indices": [],
      "textures": {
        "abledo": 0,
        "spec": 0,
        "sss": 0
      }
    });

    const ref = modelRegistry.get(model.id);

    // Load the mesh
    promises.push(fetch(model.mesh)
      .then(res => res.text())
      .then(text => new OBJFile(text))
      .then(obj => obj.parse())
      .then(obj => {
        let mesh = obj.models[0];
        console.log(mesh)

        const vertices = [];
        const indices = [];

        // Fill verticies
        mesh.vertices.forEach(vertex => {
          vertices.push({
            x: vertex.x,
            y: vertex.y,
            z: vertex.z,
            u: 1.0,
            v: 1.0
          });
        });

        // Process faces to generate index array,
        // and fill in UV coords for verticies.
        mesh.faces.forEach(face => {
          face.vertices.forEach(vertex => {
            // Index
            indices.push(vertex.vertexIndex - 1);

            // UV
            const actualVertex = vertices[vertex.vertexIndex - 1];
            const uvCoords = mesh.textureCoords[vertex.textureCoordsIndex - 1];
            actualVertex.u = uvCoords.u;
            actualVertex.v = uvCoords.v;
          });
        });

        // Lay out the actual vertex data in a tightly-packed stream.
        const verticesStream = [];
        for (let idx = 0; idx < vertices.length; idx++)
        {
          const vertex = vertices[idx];
          // Vertex
          verticesStream.push(vertex.x);
          verticesStream.push(vertex.y);
          verticesStream.push(vertex.z);
          // UV
          verticesStream.push(vertex.u);
          verticesStream.push(vertex.v);
        }

        ref.vertices = new Float32Array(verticesStream);
        // Lay out the actual index data.
        ref.indices = new Int16Array(indices);

        console.log(ref.vertices);
        console.log(ref.indices);
      }));

    // Load the texture.
    const isPowerOf2 = (value) => {
      return (value & (value - 1)) === 0;
    };

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel,
    );

    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        image,
      );

      // WebGL1 has different requirements for power of 2 images
      // vs. non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        // No, it's not a power of 2. Turn off mips and set
        // wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    };

    image.src = model.textures.albedo;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    ref.textures.albedo = texture;

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
      albedoSampler: gl.getUniformLocation(shaderProgram, "albedoSampler")
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
    model.vertices,
    gl.STATIC_DRAW);
  gl.vertexAttribPointer(
    0,
    3, gl.FLOAT,
    false,
    20,
    0);
  gl.vertexAttribPointer(
    1,
    2, gl.FLOAT,
    false,
    20,
    12);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);

  const ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    model.indices,
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

  let drag = {beginX: 0, currentX: 0, deltaX: 0, active: false};

  canvas.addEventListener('mousedown', (event) => {
    drag.active = true;
    drag.x = event.pageX;
  });
  canvas.addEventListener('mouseup', (event) => {
    drag.active = false
    drag.deltaX = 0;
    drag.beginX = 0;
    drag.currentX = 0;
  });

  canvas.addEventListener('mousemove', (event) => {
    if (!drag.active)
    {
      return;
    }

    drag.currentX = event.pageX;
    drag.deltaX = (drag.currentX - drag.beginX) * -1;
    drag.beginX = drag.currentX;
    console.log(drag.deltaX)
  });

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
  await prepareModelResources(gl);

  const scene = {
    objects: [
      {
        model: modelRegistry.get("r02_cbt010_00_b"),
        buffers: null,
      },
      {
        model: modelRegistry.get("r02_cha003_00_a"),
        buffers: null,
      },
      {
        model: modelRegistry.get("r02_cfe000_00_d"),
        buffers: null,
      },
      {
        model: modelRegistry.get("r02_cee000_00_d"),
        buffers: null,
      }
    ]
  };

  const shaders = prepareShaders(
    gl, materialRegistry.get("alicia"));

  scene.objects.forEach(object => {
    object.buffers = prepareBuffers(gl, object.model);
  });

  gl.useProgram(shaders.program);

  let time = 0.0;
  let last_time = 0;
  let delta_time = 0;

  gl.clearColor(151.0 / 255.0, 205.0 / 255.0, 116.0 / 255.0, 1);
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
      (Math.PI / 365),
      [0, 1, 0]);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Render scene objects
    scene.objects.forEach(object => {
      const model = object.model;
      const buffers = object.buffers;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, model.textures.albedo);
      gl.uniform1i(shaders.uniformLocation.albedoSampler, 0);

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
    });

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
}
