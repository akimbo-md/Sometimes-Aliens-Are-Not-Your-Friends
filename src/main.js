var state = {};
var game;
var sceneFile = "scene.json"; // can change this to be the name of your scene

// This function loads on window load, uses async functions to load the scene then try to render it
window.onload = async () => {
    try {
        console.log("Starting to load scene file");
        await parseSceneFile(`./statefiles/${sceneFile}`, state);
        main();
    } catch (err) {
        console.error(err);
        alert(err);
    }
}

/**
 * 
 * @param {object - contains vertex, normal, uv information for the mesh to be made} mesh 
 * @param {object - the game object that will use the mesh information} object 
 * @purpose - Helper function called as a callback function when the mesh is done loading for the object
 */
async function createMesh(mesh, object, vertShader, fragShader) {
    let testModel = new Model(state.gl, object, mesh);
    testModel.vertShader = vertShader ? vertShader : state.vertShaderSample;
    testModel.fragShader = fragShader ? fragShader : state.fragShaderSample;
    await testModel.setup();
    addObjectToScene(state, testModel);
    return testModel;
}

/**
 * Main function that gets called when the DOM loads
 */
async function main() {
    //document.body.appendChild( stats.dom );
    const canvas = document.querySelector("#glCanvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");

    // Only continue if WebGL2 is available and working
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }

    /**
     * Sample vertex and fragment shader here that simply applies MVP matrix 
     * and diffuse colour of each object
     */
    const vertShaderSample =
        `#version 300 es
        in vec3 aPosition;
        in vec3 aNormal;
        in vec2 aUV;

        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform mat4 uNormalMatrix;
        uniform vec3 uCameraPosition;

        out vec2 oUV;
        out vec3 oFragPosition;
        out vec3 oNormal;
        out vec3 oCameraPosition;

        void main() {
            oNormal = normalize((uNormalMatrix * vec4(aNormal, 0.0)).xyz);
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
            oUV = aUV;
            oCameraPosition = uCameraPosition;
            oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;
        }
        `;

    const fragShaderSample =
        `#version 300 es
        #define MAX_LIGHTS 100
        precision highp float;
        
        struct PointLight {
            vec3 position;
            vec3 colour;
            float strength;
            float linear;
            float quadratic;
        };
        
        in vec2 oUV;
        in vec3 oNormal;
        in vec3 oFragPosition;
        in vec3 oCameraPosition;
        
        uniform PointLight pointLights[MAX_LIGHTS];
        uniform int numLights;
        uniform vec3 diffuseVal;
        uniform vec3 ambientVal;
        uniform vec3 specularVal;
        uniform float nVal;
        uniform float uAlpha;
        uniform int samplerExists;
        uniform sampler2D uTexture;
        
        out vec4 fragColor;
        
        void main() {
            vec3 normal = normalize(oNormal);
            vec3 viewDir = normalize(oCameraPosition - oFragPosition);
            vec3 result = ambientVal; // Start with ambient lighting
        
            vec3 textureColor = vec3(1.0); // Default to white if no texture
            if (samplerExists == 1) {
                textureColor = texture(uTexture, oUV).rgb;
            }
        
            for (int i = 0; i < numLights; i++) {
                PointLight light = pointLights[i];
                vec3 lightDir = normalize(light.position - oFragPosition);
        
                // Diffuse shading
                float diff = max(dot(normal, lightDir), 0.0);
                vec3 diffuse = light.colour * light.strength * diff * (samplerExists == 1 ? textureColor : diffuseVal);
        
                // Specular shading
                vec3 reflectDir = reflect(-lightDir, normal);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), nVal);
                vec3 specular = light.colour * light.strength * spec * specularVal;
        
                // Attenuation
                float distance = length(light.position - oFragPosition);
                float attenuation = 1.0 / (1.0 + light.linear * distance + light.quadratic * (distance * distance));
        
                diffuse *= attenuation;
                specular *= attenuation;
        
                result += diffuse + specular;
            }
        
            fragColor = vec4(result, uAlpha);
        }`;

    const skyboxVertShaderSource = 
        `#version 300 es
        in vec3 aPosition;
        
        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        
        out vec3 CameraDirection;
        
        void main() {
            CameraDirection = aPosition;
            mat4 view = uViewMatrix;
            view[3][0] = 0.0;
            view[3][1] = 0.0;
            view[3][2] = 0.0;
        
            gl_Position = uProjectionMatrix * view * vec4(aPosition, 1.0);
            gl_Position = gl_Position.xyww;
        }`;

    const skyboxFragShaderSource = 
        `#version 300 es
        precision highp float;
        in vec3 CameraDirection;
        
        uniform samplerCube uSkybox;
        
        out vec4 fragColor;
        
        void main() {
            vec3 envColor = texture(uSkybox, CameraDirection).rgb;
            //fragColor = vec4(envColor, 1.0);
            fragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color
        }`;

    // Initialize the shader program for the skybox
    const skyboxShaderProgram = initShaderProgram(gl, skyboxVertShaderSource, skyboxFragShaderSource);
    state.skyboxProgramInfo = {
        program: skyboxShaderProgram,
        uniformLocations: {
            uProjectionMatrix: gl.getUniformLocation(skyboxShaderProgram, 'uProjectionMatrix'),
            uViewMatrix: gl.getUniformLocation(skyboxShaderProgram, 'uViewMatrix'),
            uSkybox: gl.getUniformLocation(skyboxShaderProgram, 'uSkybox'),
        },
    };

    /**
     * Initialize state with new values (some of these you can replace/change)
     */
    state = {
        ...state, // this just takes what was already in state and applies it here again
        gl,
        vertShaderSample,
        fragShaderSample,
        canvas: canvas,
        objectCount: 0,
        lightIndices: [],
        keyboard: {},
        mouse: { sensitivity: 0.2 },
        meshCache: {},
        samplerExists: 0,
        samplerNormExists: 0,
        sceneLoaded: false,
    };

    state.numLights = state.pointLights.length;

    const now = new Date();
    for (let i = 0; i < state.loadObjects.length; i++) {
        const object = state.loadObjects[i];

        if (object.type === "mesh") {
            await addMesh(object);
        } else if (object.type === "cube") {
            addCube(object, state);
        } else if (object.type === "plane") {
            addPlane(object, state);
        } else if (object.type.includes("Custom")) {
            addCustom(object, state);
        }
    }

    const skyboxImagePaths = {
        px: 'skybox/sky4rt.jpg', // Positive x
        nx: 'skybox/sky4lf.jpg', // Negative x
        py: 'skybox/sky4up.jpg', // Positive y (up)
        ny: 'skybox/sky4dn.jpg', // Negative y (down)
        pz: 'skybox/sky4ft.jpg', // Positive z
        nz: 'skybox/sky4bk.jpg'  // Negative z
    };
    
    state.skyboxTexture = loadCubemap(gl, skyboxImagePaths);
    state.skyboxBuffers = initSkyboxBuffers(gl);

    const then = new Date();
    const loadingTime = (then.getTime() - now.getTime()) / 1000;
    console.log(`Scene file loaded in ${loadingTime} seconds.`);

    game = new Game(state);
    await game.onStart();
    loadingPage.remove();
    startRendering(gl, state); // now that scene is setup, start rendering it
    state.sceneLoaded = true;

    const mainMenu = document.getElementById('mainMenu');
    const gameTitleMessage = document.getElementById('gameTitleMessage');
    const startButton = document.getElementById('startButton');

    mainMenu.style.display = 'block';
    gameTitleMessage.style.display = 'block';
    startButton.style.display = 'block';
}

/**
 * 
 * @param {object - object containing scene values} state 
 * @param {object - the object to be added to the scene} object 
 * @purpose - Helper function for adding a new object to the scene and refreshing the GUI
 */
function addObjectToScene(state, object) {
    object.name = object.name;
    state.objects.push(object);
}

/**
 * 
 * @param {gl context} gl 
 * @param {object - object containing scene values} state 
 * @purpose - Calls the drawscene per frame
 */
function startRendering(gl, state) {
    // A variable for keeping track of time between frames
    var then = 0.0;

    // This function is called when we want to render a frame to the canvas
    function render(now) {
        now *= 0.001; // convert to seconds
        const deltaTime = now - then;
        then = now;

        state.deltaTime = deltaTime;
        drawScene(gl, deltaTime, state);
        game.onUpdate(deltaTime); //constantly call our game loop

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }
    // Draw the scene
    requestAnimationFrame(render);
}

/**
 * 
 * @param {gl context} gl 
 * @param {float - time from now-last} deltaTime 
 * @param {object - contains the state for the scene} state 
 * @purpose Iterate through game objects and render the objects aswell as update uniforms
 */
function drawScene(gl, deltaTime, state) {
    gl.clearColor(state.settings.backgroundColor[0], state.settings.backgroundColor[1], state.settings.backgroundColor[2], 1.0); // Here we are drawing the background color that is saved in our state
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.enable(gl.CULL_FACE); // Cull the backface of our objects to be more efficient // enable?
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // gl.frontFace(gl.CCW);
    gl.clearDepth(1.0); // Clear everything
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Projection Matrix
    let projectionMatrix = mat4.create();
    let fovy = 90.0 * Math.PI / 180.0;
    let aspect = state.canvas.clientWidth / state.canvas.clientHeight;
    let near = 0.1;
    let far = 1000.0;
    mat4.perspective(projectionMatrix, fovy, aspect, near, far);

    // View Matrix
    let viewMatrix = mat4.create();
    let camFront = vec3.create();
    vec3.add(camFront, state.camera.position, state.camera.front);
    mat4.lookAt(viewMatrix, state.camera.position, camFront, state.camera.up);

    // console.log("Projection Matrix:", projectionMatrix);
    // console.log("View Matrix:", viewMatrix);

    // Draw the skybox
    drawSkybox(gl, state.skyboxProgramInfo, state.skyboxBuffers, state.skyboxTexture, projectionMatrix, viewMatrix);

    // sort objects by nearness to camera
    let sorted = state.objects.sort((a, b) => {
        let aCentroidFour = vec4.fromValues(a.centroid[0], a.centroid[1], a.centroid[2], 1.0);
        vec4.transformMat4(aCentroidFour, aCentroidFour, a.modelMatrix);

        let bCentroidFour = vec4.fromValues(b.centroid[0], b.centroid[1], b.centroid[2], 1.0);
        vec4.transformMat4(bCentroidFour, bCentroidFour, b.modelMatrix);

        return vec3.distance(state.camera.position, vec3.fromValues(aCentroidFour[0], aCentroidFour[1], aCentroidFour[2]))
            >= vec3.distance(state.camera.position, vec3.fromValues(bCentroidFour[0], bCentroidFour[1], bCentroidFour[2])) ? -1 : 1;
    });
    // iterate over each object and render them
    sorted.map((object) => {
        gl.useProgram(object.programInfo.program);
        {
            // Projection Matrix ....
            let projectionMatrix = mat4.create();
            let fovy = 90.0 * Math.PI / 180.0; // Vertical field of view in radians
            let aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
            let near = 0.1; // Near clipping plane
            let far = 1000000.0; // Far clipping plane

            mat4.perspective(projectionMatrix, fovy, aspect, near, far);
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);
            state.projectionMatrix = projectionMatrix;

            // View Matrix & Camera ....
            let viewMatrix = mat4.create();
            let camFront = vec3.fromValues(0, 0, 0);
            vec3.add(camFront, state.camera.position, state.camera.front);
            mat4.lookAt(
                viewMatrix,
                state.camera.position,
                camFront,
                state.camera.up,
            );
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);
            gl.uniform3fv(object.programInfo.uniformLocations.cameraPosition, state.camera.position);
            state.viewMatrix = viewMatrix;

            // Model Matrix ....
            let modelMatrix = mat4.create();
            let negCentroid = vec3.fromValues(0.0, 0.0, 0.0);
            vec3.negate(negCentroid, object.centroid);
            mat4.translate(modelMatrix, modelMatrix, object.model.position);
            mat4.translate(modelMatrix, modelMatrix, object.centroid);
            mat4.mul(modelMatrix, modelMatrix, object.model.rotation);
            mat4.scale(modelMatrix, modelMatrix, object.model.scale);
            mat4.translate(modelMatrix, modelMatrix, negCentroid);

            if (object.parent) {
                let parent = getObject(state, object.parent);
                if (parent.model && parent.model.modelMatrix) {
                    mat4.multiply(modelMatrix, parent.model.modelMatrix, modelMatrix);
                }
            }

            object.model.modelMatrix = modelMatrix;
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);

            // Normal Matrix ....
            let normalMatrix = mat4.create();
            mat4.invert(normalMatrix, modelMatrix);
            mat4.transpose(normalMatrix, normalMatrix);
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.normalMatrix, false, normalMatrix);

            // Object material
            gl.uniform3fv(object.programInfo.uniformLocations.diffuseVal, object.material.diffuse);
            gl.uniform3fv(object.programInfo.uniformLocations.ambientVal, object.material.ambient);
            gl.uniform3fv(object.programInfo.uniformLocations.specularVal, object.material.specular);
            gl.uniform1f(object.programInfo.uniformLocations.nVal, object.material.n);
            gl.uniform1f(object.programInfo.uniformLocations.alphaVal, object.material.alpha);

            // Lights
            gl.uniform1i(object.programInfo.uniformLocations.numLights, state.numLights);
            if (state.pointLights.length > 0) {
                for (let i = 0; i < state.pointLights.length; i++) {
                    gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].position'), state.pointLights[i].position);
                    gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].colour'), state.pointLights[i].colour);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].strength'), state.pointLights[i].strength);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].linear'), state.pointLights[i].linear);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].quadratic'), state.pointLights[i].quadratic);
                }
            }


            {
                // Bind the buffer we want to draw
                gl.bindVertexArray(object.buffers.vao);

                //check for diffuse texture and apply it
                if (object.material.shaderType === 3) {
                    state.samplerExists = 1;
                    gl.activeTexture(gl.TEXTURE0);
                    gl.uniform1i(object.programInfo.uniformLocations.samplerExists, state.samplerExists);
                    gl.uniform1i(object.programInfo.uniformLocations.sampler, 0);
                    gl.bindTexture(gl.TEXTURE_2D, object.model.texture);
                } else {
                    gl.activeTexture(gl.TEXTURE0);
                    state.samplerExists = 0;
                    gl.uniform1i(object.programInfo.uniformLocations.samplerExists, state.samplerExists);
                }

                //console.log("samplerExists: ", state.samplerExists); // debug

                //check for normal texture and apply it
                if (object.material.shaderType === 4) {
                    state.samplerNormExists = 1;
                    gl.activeTexture(gl.TEXTURE1);
                    gl.uniform1i(object.programInfo.uniformLocations.normalSamplerExists, state.samplerNormExists);
                    gl.uniform1i(object.programInfo.uniformLocations.normalSampler, 1);
                    gl.bindTexture(gl.TEXTURE_2D, object.model.textureNorm);
                } else {
                    gl.activeTexture(gl.TEXTURE1);
                    state.samplerNormExists = 0;
                    gl.uniform1i(object.programInfo.uniformLocations.normalSamplerExists, state.samplerNormExists);
                }

                // Draw the object
                const offset = 0; // Number of elements to skip before starting

                //if its a mesh then we don't use an index buffer and use drawArrays instead of drawElements
                if (object.type === "mesh" || object.type === "meshCustom") {
                    gl.drawArrays(gl.TRIANGLES, offset, object.buffers.numVertices / 3);
                } else {
                    gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
                }
            }
        }
    });
}

function loadCubemap(gl, imagePaths) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, path: imagePaths.px },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, path: imagePaths.nx },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, path: imagePaths.py },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, path: imagePaths.ny },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, path: imagePaths.pz },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, path: imagePaths.nz },
    ];

    faceInfos.forEach((faceInfo, index) => {
        const { target, path } = faceInfo;
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1024;
        const height = 1024;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;

        // Initialize texture with empty data for proper allocation
        gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

        const image = new Image();
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(target, level, internalFormat, format, type, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

            console.log(`Skybox texture ${path} loaded`);
        };
        image.src = path;
    });

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    return texture;
}


function drawSkybox(gl, skyboxProgramInfo, skyboxBuffers, skyboxTexture, projectionMatrix, viewMatrix) {
    // console.log("Drawing skybox");
    gl.useProgram(skyboxProgramInfo.program);
    gl.bindVertexArray(skyboxBuffers.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.uniform1i(skyboxProgramInfo.uniformLocations.uSkybox, 0);

    // Remove the translation part of the view matrix
    let skyboxViewMatrix = mat4.clone(viewMatrix);
    skyboxViewMatrix[12] = 0;
    skyboxViewMatrix[13] = 0;
    skyboxViewMatrix[14] = 0;

    gl.uniformMatrix4fv(skyboxProgramInfo.uniformLocations.uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(skyboxProgramInfo.uniformLocations.uViewMatrix, false, skyboxViewMatrix);

    gl.depthFunc(gl.LEQUAL); // Render the skybox at the far depth
    gl.drawArrays(gl.TRIANGLES, 0, 36); // Assuming the VAO contains a cube
    gl.depthFunc(gl.LESS); // Reset depth function
}


function initSkyboxBuffers(gl) {
    const vertices = [
        // Back face
        -1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,       
         1.0,  1.0, -1.0,
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
        // Front face
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0, -1.0,  1.0,
        // Left face
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
        -1.0, -1.0, -1.0,
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        // Right face
         1.0,  1.0,  1.0,
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,    
         1.0, -1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0,  1.0,
        // Bottom face
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
        -1.0, -1.0, -1.0,
        // Top face
        -1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0
    ];

    const skyboxVAO = gl.createVertexArray();
    gl.bindVertexArray(skyboxVAO);

    const skyboxVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const positionAttributeLocation = 0;
    const numComponents = 3;  // (x, y, z)
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.vertexAttribPointer(positionAttributeLocation, numComponents, type, normalize, stride, offset);
    gl.enableVertexAttribArray(positionAttributeLocation);

    gl.bindVertexArray(null); // Unbind the VAO

    // console.log("Skybox buffers returning..");
    return {
        vao: skyboxVAO
    };
}