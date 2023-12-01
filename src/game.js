class Game {
    constructor(state) {
        this.state = state;
        this.state.lights = [];
        this.canvas = document.querySelector('canvas');
        this.plane = getObject(state, "tempPlane");
        this.light = getObject(state, "lightSource");

        this.controlCamera = false;
        this.cameraSpeed = 10;

        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.mouseDownPosition = { x: 0, y: 0 };
        this.mouseSensitivity = 0.002;
        this.mousePosition = {
            x: 0,
            y: 0
        };
        this.prevMousePosition = {
            x: 0,
            y: 0
        };
        this.isMousePressed = false;

        this.keyPressed = {
            w: false,
            a: false,
            s: false,
            d: false,
            z: false,
            x: false,
            q: false,
            e: false 
        };

        this.spaceship = getObject(state, "SpaceShip");
        //this.spaceship.offset = { x: 3, y: 2, z: 0 };
        this.spaceshipSpeed = 0.7;
        this.spaceshipSpawnDelay = 2;
        this.spaceshipSpawned = false;
        this.cubeSpawnInterval = null; // Store the interval ID
        this.cubeSpawnRate = 200; // Time in milliseconds between cube spawns

        this.asteroidPool = [];
        this.spawnAsteroidField();

        this.rollAngle = 0; // Current roll angle
        this.currentRoll = 0;
        this.maxRollAngle = Math.PI / 6; // Maximum roll angle for full roll
        this.rollSpeed = 0.0003; // Speed at which the ship rolls
        this.rollReturnSpeed = 0.00004; // Speed at which the ship returns to no roll
        this.pitchAngle = 0;
        this.pitchCurrent = 0;
        this.yawAngle = 0;
        this.yawCurrent = 0;
        this.isShipPointedAtMouse = false;
        this.updatePositionDelay = 2; // Delay in seconds
        this.updatePositionStarted = false;

        this.playerHealth = 100;
        this.playerBoost = 50;
        this.playerScore = 0;

        this.isBoosting = false; // to be added later
        this.currentBoost = this.maxBoost;
        this.boostDecayRate = 1;
        this.boostRegenRate = 0.5;
        
        this.spawnedObjects = [];
        this.collidableObjects = [];
        this.lastSpawnZ = 0;
        this.layerCount = 0; 
        this.spawnQueue = []; // Queue of spawn taskss
        this.isSpawning = false; // Flag to indicate if we're currently spawning
        this.spawnThreshold = 20; // Adjust as needed based on camera speed
        this.spawnDistanceAhead = 20; // How far ahead to spawn the new field
    }

    toggleControls() {
        this.controlCamera = !this.controlCamera;
        console.log(`Controls toggled. Camera control is now ${this.controlCamera ? 'on' : 'off'}.`);
    }

    updateCameraPosition(directionVector) {
        // Update the camera's position based on the direction vector
        vec3.scaleAndAdd(
            this.state.camera.position,
            this.state.camera.position,
            directionVector,
            this.cameraSpeed
        );

        // Update the view matrix since the camera's position has changed
        mat4.lookAt(
            this.state.camera.viewMatrix,
            this.state.camera.position,
            this.state.camera.target,
            this.state.camera.up
        );d
    }

    angleBetweenVectors(v1, v2) {
        let dot = vec3.dot(v1, v2);
        let lenProd = vec3.length(v1) * vec3.length(v2);
        let div = dot / lenProd;
        // Clamp the division result to avoid NaN due to floating point precision issues
        div = Math.max(-1, Math.min(1, div));
        return Math.acos(div); // Return angle in radians
    }

    updateSpaceshipPosition(deltaTime) {
        let moveDirection = vec3.create();
    
        // Adjust the direction and target roll angle based on the keys pressed
        if (this.keyPressed.w) vec3.add(moveDirection, moveDirection, vec3.fromValues(0, 0.035, 0)); // Move up gradually
        if (this.keyPressed.s) vec3.add(moveDirection, moveDirection, vec3.fromValues(0, -0.035, 0)); // Move down gradually
        if (this.keyPressed.d) {
            vec3.add(moveDirection, moveDirection, vec3.fromValues(-0.035, 0, 0)); // Move left gradually
            this.targetRollAngle = -this.maxRollAngle;
        } 
        if (this.keyPressed.a) {
            vec3.add(moveDirection, moveDirection, vec3.fromValues(0.035, 0, 0)); // Move right gradually
            this.targetRollAngle = this.maxRollAngle;
        }
        if (this.keyPressed.q) {
            //this.rollAngle -= this.rollSpeed * deltaTime;
            this.targetRollAngle = this.maxRollAngle;
        }
        if (this.keyPressed.e) {
            //this.rollAngle += this.rollSpeed * deltaTime;
            this.targetRollAngle = -this.maxRollAngle;
        }

        // Clamp the currentRollAngle to prevent excessive rolling
        this.currentRollAngle = Math.max(-this.maxRollAngle, Math.min(this.maxRollAngle, this.currentRollAngle));
        this.rollAngle = Math.max(-this.maxRollAngle, Math.min(this.maxRollAngle, this.rollAngle));
    
        // Gradually adjust the roll angle towards the target roll angle
        if (this.rollAngle < this.targetRollAngle) {
            this.rollAngle = Math.min(this.rollAngle + this.rollSpeed, this.targetRollAngle);
        } else if (this.rollAngle > this.targetRollAngle) {
            this.rollAngle = Math.max(this.rollAngle - this.rollSpeed, this.targetRollAngle);
        }
    
        // Gradually return the roll angle to zero when no left/right movement
        if (!this.keyPressed.a && !this.keyPressed.d) {
            if (this.rollAngle > 0) {
                this.rollAngle = Math.max(this.rollAngle - this.rollReturnSpeed, 0);
            } else if (this.rollAngle < 0) {
                this.rollAngle = Math.min(this.rollAngle + this.rollReturnSpeed, 0);
            }
            this.targetRollAngle = 0; // Reset target roll angle
        }

        // Calculate the mouse world position
        const mouseWorldPosition = this.screenToWorld(this.mousePosition, this.state.camera);
        mouseWorldPosition[1] -= 3; // y Axis offset
        mouseWorldPosition[0] -= 3;
        //console.log("Mouse World Position:", mouseWorldPosition);

        //this.spaceship.rotate('y', this.yawAngle); 
        //this.spaceship.rotate('z', this.pitchAngle); // not working anymore :(
        this.spaceship.rotate('z', this.rollAngle);
    
        vec3.scale(moveDirection, moveDirection, this.spaceshipSpeed);

        // if (this.isBoosting && this.currentBoost > 0) {
        //     vec3.scale(moveDirection, moveDirection, this.spaceshipSpeed * 1.3); // Boosted speed
        //     this.currentBoost -= this.boostDecayRate;
        // } else {
        //     vec3.scale(moveDirection, moveDirection, this.spaceshipSpeed);
        //     this.currentBoost = Math.min(this.maxBoost, this.currentBoost + this.boostRegenRate);
        // }

        // Define clamping bounds for the spaceship's position
        const minX = -8; // Minimum X position
        const maxX = 8; // Maximum X position
        const minY = -4; // Minimum Y position
        const maxY = 6; // Maximum Y position
    
        // Clamp the spaceship's position within the bounds
        this.spaceship.model.position[0] = Math.min(Math.max(this.spaceship.model.position[0] + moveDirection[0], minX), maxX);
        this.spaceship.model.position[1] = Math.min(Math.max(this.spaceship.model.position[1] + moveDirection[1], minY), maxY);
    
        // Translate the position of the spaceship
        this.spaceship.translate(vec3.fromValues(
            this.spaceship.model.position[0] - this.spaceship.model.position[0],
            this.spaceship.model.position[1] - this.spaceship.model.position[1],
            0
        ));
    }

    screenToWorld(mousePosition) {
        const normalizedX = (mousePosition.x / this.canvas.width) * 2 - 1;
        const normalizedY = -((mousePosition.y / this.canvas.height) * 2 - 1);
    
        // Convert to world coordinates at a fixed Z depth
        let worldX = (normalizedX * 10) - 5; // Scale factor for world coordinates
        let worldY = (normalizedY * 10) + 5; // Scale factor for world coordinates
        let worldZ = this.state.camera.position[2] + 5;
    
        return vec3.fromValues(worldX, worldY, worldZ);
    }

    // Handle mouse move events to get the current mouse position
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePosition.x = e.clientX - rect.left;
        this.mousePosition.y = e.clientY - rect.top;
    
        const mouseWorldPosition = this.screenToWorld(this.mousePosition);
        this.updateSpaceshipPosition(mouseWorldPosition);
        if (this.isMousePressed) {
            this.updateFiringDirection();
        }
    }

    // Handle mouse down and up events to track mouse button presses
    handleMouseDown(e) {
        this.isMousePressed = true;
        this.startCubeSpawning(e);
    
        // Start an interval to continuously update the direction while firing
        if (!this.updateDirectionInterval) {
            this.updateDirectionInterval = setInterval(() => {
                if (this.isMousePressed) {
                    this.updateFiringDirection();
                }
            }, this.cubeSpawnRate);
        }
    }

    handleMouseUp() {
        this.isMousePressed = false;
        clearInterval(this.cubeSpawnInterval);
        this.cubeSpawnInterval = null;
    
        clearInterval(this.updateDirectionInterval);
        this.updateDirectionInterval = null;
    }

    // Initialize mouse input handling
    initializeMouseInput() {
        document.addEventListener("mousemove", (e) => this.handleMouseMove(e));
        document.addEventListener("mousedown", (e) => this.handleMouseDown(e));
        document.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    }

    handleKeyPress(e) {
        if (e.key === '`') {
            this.toggleControls();
        } else if (this.controlCamera) {
            // Camera control logic
            let directionVector;
            switch (e.key) {
                case 'w':
                    directionVector = vec3.fromValues(0, 0, -1); // Move forward
                    break;
                case 'a':
                    directionVector = vec3.fromValues(-1, 0, 0); // Move left
                    break;
                case 's':
                    directionVector = vec3.fromValues(0, 0, 1); // Move backward
                    break;
                case 'd':
                    directionVector = vec3.fromValues(1, 0, 0); // Move right
                    break;
                case 'z':
                    directionVector = vec3.fromValues(0, 1, 0); // Move up
                    break;
                case 'x':
                    directionVector = vec3.fromValues(0, -1, 0); // Move down
                    break;
            }
            if (directionVector) {
                this.updateCameraPosition(directionVector);
            }
        } else {
            // Spaceship control logic
            if (['w', 'a', 's', 'd', 'z', 'x', 'q', 'e'].includes(e.key)) { // W A S D
                this.keyPressed[e.key] = true;
            }
            if (e.key === 'Shift') {
                this.isBoosting = true;
            }
        }
    }

    handleKeyRelease(e) {
        if (this.controlCamera) {
            // ...
        } else {
            if (['w', 'a', 's', 'd', 'z', 'x', 'q', 'e'].includes(e.key)) {
                this.keyPressed[e.key] = false;
            }
            if (e.key === 'Shift') {
                this.isBoosting = false;
            }
        }
    }

    initializeControls() {
        document.addEventListener("keypress", (e) => this.handleKeyPress(e));
        document.addEventListener("keyup", (e) => this.handleKeyRelease(e));
    }

    initializeCamera() {
        const fov = 45 * Math.PI / 180;   // Field of view in radians
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        const near = 0.1;
        const far = 100.0;
        this.state.camera.projectionMatrix = mat4.create();
        mat4.perspective(this.state.camera.projectionMatrix, fov, aspect, near, far);
    }

    getDirectionToMouse(spaceshipPosition, mouseWorldPosition) {
        let direction = vec3.create();
        vec3.subtract(direction, mouseWorldPosition, spaceshipPosition);
        vec3.normalize(direction, direction);
        return direction;
    }

    // Update the firing direction based on the current mouse position
    updateFiringDirection() {
        const spaceship = getObject(this.state, "SpaceShip");
        const mouseWorldPosition = this.screenToWorld(this.mousePosition);
    
        // Iterate over all cubes and update their direction?? Bug or Feature?
        this.state.objects.forEach(object => {
            if (object.type === 'cube') {
                let direction = vec3.create();
                vec3.subtract(direction, vec3.fromValues(-mouseWorldPosition[0] - 5, mouseWorldPosition[1] - 5, mouseWorldPosition[2] + 25), spaceship.model.position);
                vec3.normalize(direction, direction);
                object.direction = direction;
            }
        });
    }

    flashWeaponLight(state) {
        const weaponLight = state.pointLights.find(light => light.name === "weaponLight");
        
        if (weaponLight) {
            const originalIntensity = weaponLight.intensity;
            const originalStrength = weaponLight.strength;
            
            // Make the weapon light brighter
            weaponLight.intensity += 1;
            weaponLight.strength += 3;
    
            // Restore the original intensity after 150 milliseconds
            setTimeout(() => {
                weaponLight.intensity = originalIntensity;
                weaponLight.strength = originalStrength;
            }, 100); // miliseconds
        }
    }

    spawnCubeOnInterval(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const mousePosition = { x: mouseX, y: mouseY };
    
        const spaceship = getObject(this.state, "SpaceShip");
        const mouseWorldPosition = this.screenToWorld(mousePosition);
        
        // Adjust the mouse world position to align with a point 25 units in front of the ship
        const targetPoint = vec3.clone(spaceship.model.position);
        targetPoint[2] += 25; // Move 25 units in front
        targetPoint[0] = -mouseWorldPosition[0]; // Align with mouse X
        targetPoint[1] = mouseWorldPosition[1]; // Align with mouse Y
    
        // Calculate the direction from the spaceship to the target point
        let direction = vec3.create();
        vec3.subtract(direction, targetPoint, spaceship.model.position);
        vec3.normalize(direction, direction);

        let spawnPosition = vec3.clone(spaceship.model.position);
        spawnPosition[2] += 0.9; // Adjust z offset
        
    
        this.spawnCube(this.state, spawnPosition);
        this.state.objects[this.state.objects.length - 1].direction = direction;
    }

    startCubeSpawning(e) {
        // Initial spawn
        this.spawnCubeOnInterval(e);
    
        // Set up interval for continuous spawning
        this.cubeSpawnInterval = setInterval(() => {
            this.spawnCubeOnInterval(e);
        }, this.cubeSpawnRate);
    }

    spawnCube(state, spaceshipPosition) {
        // Define the initial properties of the cube
        const upOffset = -0.5;
        const leftOffset = 0.24;
        let adjustedPosition = vec3.clone(spaceshipPosition);
        adjustedPosition[0] -= leftOffset; // Move left
        adjustedPosition[1] += upOffset;   // Move up

        const cubeConfig = {
            name: `Cube-${Date.now()}`,
            model: "Space_Invader.obj",
            type: "mesh",
            material: {
                diffuse: [0, 1, 0]
            },
            position: adjustedPosition,
            scale: vec3.fromValues(0.2, 0.2, 0.2),
        };

        // Create a light source associated with the cube
        const lightConfig = {
            type: 'point', // For a point light source
            position: vec3.clone(adjustedPosition),
            colour: [0, 1, 0], // Adjust color as needed
            intensity: 100, // Adjust intensity as needed
            strength: 30,
        };

        const cube = addCube(cubeConfig, state);
        this.addLight(lightConfig, state);
        cube.lightSource = lightConfig;

        this.flashWeaponLight(state);

        return cube;
    }

    updateCubes(deltaTime, state) {
        const cubeSpeed = 20;
        state.objects.forEach(object => {
            if (object.type === 'cube') {
                vec3.scaleAndAdd(
                    object.model.position,
                    object.model.position,
                    object.direction,
                    cubeSpeed * deltaTime
                );
            }
        });
    }

    addLight(lightConfig, state) {
        // state.pointLights.push(lightConfig);
        // console.log("Created light:", lightConfig);
        // console.log("State Point Lights: ", state.pointLights.length);
    
        // return lightConfig;
    }

    spawnAsteroidField() {
        // Calculate the number of asteroids to spawn
        const travelTime = 400 / this.cameraSpeed;
        const numAsteroids = Math.floor(travelTime / 2) * 1.25;

        for (let i = 0; i < numAsteroids; i++) {
            // Calculate the Z position for each asteroid
            const zPos = 200 + (i * (400 / numAsteroids));
            this.spawnAsteroid(zPos);
        }
    }

    spawnAsteroid(zPos) {
        // Define the range for spawning asteroids (adjust as needed)
        const xMin = -7; // Adjusted minimum X position
        const xMax = 12; // Adjusted maximum X position
        const yMin = -6; // Adjusted minimum Y position
        const yMax = 7;  // Adjusted maximum Y position
        const zOffsetAhead = 200; // Distance ahead of the spaceship

        // Randomly choose an asteroid model
        const asteroidModels = ["asteroid3.obj", "asteroid4.obj", "asteroid5.obj", 
                                "asteroid6.obj", "asteroid7.obj", "asteroid8.obj", "asteroid9.obj", "asteroid10.obj"];
        const asteroidModel = asteroidModels[Math.floor(Math.random() * asteroidModels.length)];

        // Random size variation
        const sizeFactor = 0.1 + Math.random() * 1.2; // Random scale between 0.5 and 2

        // Define the asteroid configuration
        const asteroidConfig = {
            name: `Asteroid-${Date.now()}`,
            model: asteroidModel,
            type: "mesh",
            material: {
                // diffuse: [0.1, 0, 0],
                // ambient: [0.5, 0.5, 0.5],
                // specular: [0.5, 0.5, 0.5],
                // n: 32,
                // alpha: 1,
                shaderType: 3
            },
            position: vec3.fromValues(
                Math.random() * (xMax - xMin) + xMin - 20,
                Math.random() * (yMax - yMin) + yMin + 5,
                //spaceshipPosition[2] + zOffsetAhead // Z position ahead of the spaceship
                zPos + zOffsetAhead
            ),
            scale: vec3.fromValues(sizeFactor, sizeFactor, sizeFactor),
            diffuseTexture: "apple.jpg", // apple for testing
            normalTexture: "DefaultMaterial_normal.png"
        };

        // Add the asteroid to the game state
        const newAsteroid = spawnObject(asteroidConfig, this.state);
        if (newAsteroid && newAsteroid.model) { // Check if the model property exists ?? Doesn't work
            this.spawnedObjects.push(newAsteroid);
            this.asteroidPool.push(newAsteroid); // Add to the asteroid pool
            console.log(this.asteroidPool[0]);
        }
    }

    repositionAsteroids() {
        const xMin = -7; // Adjusted minimum X position
        const xMax = 12; // Adjusted maximum X position
        const yMin = -6; // Adjusted minimum Y position
        const yMax = 7;  // Adjusted maximum Y position

        this.state.objects.forEach((object) => {
            if (object.name.startsWith('Asteroid-')) {
                // Check if the asteroid is behind the spaceship
                if (object.model.position[2] < this.spaceship.model.position[2] - 17.5) {
                    // Calculate the new Z position, 300 units in front of the spaceship
                    const newZ = this.spaceship.model.position[2] + 400;
    
                    // Randomly determine new X and Y positions within a specified range
                    const newX = Math.random() * (xMax - xMin) + xMin - 20;
                    const newY = Math.random() * (yMax - yMin) + yMin + 5;
    
                    // Reposition the asteroid
                    vec3.set(object.model.position, newX, newY, newZ);
                    //console.log("Asteroid repositioned: ", object.model.position);
                }
            }
        });
    }

    updateHealthBar() {
        const healthPercent = this.playerHealth;
        const healthBar = document.getElementById('healthBar');
        healthBar.style.width = `${healthPercent}%`;

        // Change color based on health
        if (healthPercent < 20) {
            healthBar.style.backgroundColor = 'red';
        } else if (healthPercent < 40) {
            healthBar.style.backgroundColor = 'orange';
        } else {
            healthBar.style.backgroundColor = 'green';
        }
    }

    cleanupObjectsBehindCamera() { // Does this even work? Maybe change to outside of plane
        // Check that the camera and its position are defined
        if (this.state.camera && Array.isArray(this.state.camera.position)) {
            this.spawnedObjects = this.spawnedObjects.filter(object => {
                // Only retain objects that have a defined position and are in front of the camera
                return Array.isArray(object.position) && object.position[2] > this.state.camera.position[2];
            });
        } else {
            console.error('Camera position is not defined.');
        }
    }

    // example - create a collider on our object with various fields we might need (you will likely need to add/remove/edit how this works)
    createSphereCollider(object, radius, onCollide = null) {
        object.collider = {
            type: "SPHERE",
            radius: radius,
            onCollide: onCollide ? onCollide : (otherObject) => {
                console.log(`Collided with ${otherObject.name}`);
            }
        };
        this.collidableObjects.push(object);
    }

    // example - function to check if an object is colliding with collidable objects
    checkCollision(object) {
        // Check collision between the given object and other collidable objects
        if (object.collider && object.position) {
            const sphere1 = object.collider;
    
            this.collidableObjects.forEach(otherObject => {
                if (otherObject !== object && otherObject.collider && otherObject.position) {
                    const sphere2 = otherObject.collider;
    
                    // Get the transformed positions of the cubes
                    const transformedPos1 = vec3.transformMat4(vec3.create(), object.position, object.rotationMatrix);
                    const transformedPos2 = vec3.transformMat4(vec3.create(), otherObject.position, otherObject.rotationMatrix);
    
                    // Calculate the distance between the transformed positions
                    const distance = vec3.distance(transformedPos1, transformedPos2);
    
                    if (distance < sphere1.radius + sphere2.radius) {
                        sphere1.onCollide(otherObject);
    
                        // Calculate the direction from cube1 to cube2 in cube1's local space
                        const directionLocal = vec3.subtract(vec3.create(), transformedPos2, transformedPos1);
                        vec3.normalize(directionLocal, directionLocal);
    
                        // Move cube1 backwards along the direction vector
                        const backwardDirection = vec3.scale(vec3.create(), directionLocal, -0.1); // Adjust the factor as needed
                        object.translate(backwardDirection);
                    }
                }
            });
        }
    }

    cleanupCubes(state) {
        state.objects = state.objects.filter(object => {
            if (object.type === 'cube') {
                // Check if the cube is too far or off-screen and return false to remove it
            }
            return true;
        });
    }

    // runs once on startup after the scene loads the objects
    async onStart() {
        console.log("On start");

        // this just prevents the context menu from popping up when you right click
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        }, false);

        // Setup controls
        this.initializeControls();
        this.initializeMouseInput();
        this.initializeCamera();

        // example - create sphere colliders on our two objects as an example, we give 2 objects colliders otherwise
        // no collision can happen
        // this.createSphereCollider(this.cube, 0.5, (otherObject) => {
        //     console.log(`This is a custom collision of ${otherObject.name}`)
        // });
        // this.createSphereCollider(otherCube, 0.5);

        // tempObject.constantRotate = true; // lets add a flag so we can access it later
        // this.spawnedObjects.push(tempObject); // add these to a spawned objects list

        // tempObject.collidable = true;
        // tempObject.onCollide = (object) => { // we can also set a function on an object without defining the function before hand!
        //     console.log(`I collided with ${object.name}!`);
        // };
        // }
    }

    // Runs once every frame non stop after the scene loads
    onUpdate(deltaTime) {
        // Move the camera and ship forward by reducing the Z value
        const forwardDistance = this.cameraSpeed * deltaTime;

        this.state.camera.position[2] += forwardDistance;
        this.spaceship.model.position[2] += forwardDistance;
        this.plane.model.position[2] += forwardDistance;

        let lightSource = state.pointLights.find(light => light.name === "lightSource");
        let playerLight = state.pointLights.find(light => light.name === "playerLight");
        let weaponLight = state.pointLights.find(light => light.name === "weaponLight");
        if (lightSource) {
            lightSource.position[2] += forwardDistance;
            playerLight.position[2] += forwardDistance;
            weaponLight.position[2] += forwardDistance;
        }

        // Calculate the position difference between the spaceship and weaponLight
        const positionDifference = vec3.create();
        vec3.subtract(positionDifference, this.spaceship.model.position, weaponLight.position);

        // Add the position difference to the weaponLight's position
        vec3.add(weaponLight.position, weaponLight.position, positionDifference);

        // Update the model matrix for the spaceship
        mat4.fromTranslation(this.spaceship.modelMatrix, this.spaceship.model.position);
        mat4.fromTranslation(this.plane.modelMatrix, this.plane.model.position);
        // Update the view matrix since the camera's position has changed
        mat4.lookAt(
            this.state.camera.viewMatrix,
            this.state.camera.position,
            vec3.add(vec3.create(), this.state.camera.position, vec3.fromValues(0, 0, -1)), // Target is one unit in front of the camera
            this.state.camera.up // Assuming you have an up vector property for the camera
        );

        // Update Player Ship
        if (!this.updatePositionStarted) {
            this.updatePositionDelay -= deltaTime;
            if (this.updatePositionDelay <= 0) {
                this.updatePositionStarted = true;
            }
        }
    
        if (this.updatePositionStarted) {
            this.updateSpaceshipPosition(deltaTime);
        }
        
        //this.pointTowardsMouse();

        this.updateCubes(deltaTime, state);

        this.repositionAsteroids();

        //this.cleanupCubes(state);

        // example: Rotate all objects in the scene marked with a flag
        // this.state.objects.forEach((object) => {
        //     if (object.constantRotate) {
        //         object.rotate('y', deltaTime * 0.5);
        //     }
        // });

        // simulate a collision between the first spawned object and 'cube' 
        // if (this.spawnedObjects[0].collidable) {
        //     this.spawnedObjects[0].onCollide(this.cube);
        // }

        // Mod projectiles
        this.state.objects.forEach((object) => {
            if (object.name.startsWith('Cube-')) {
                object.rotate('z', Math.random() * 1.5);

            }
        });

        // Rotate the asteroids
        this.state.objects.forEach((object) => {
            if (object.name.startsWith('Asteroid-')) {
                // Random rotation around each axis
                object.rotate('x', Math.random() * 0.02);
                object.rotate('y', Math.random() * 0.02);
                object.rotate('z', Math.random() * 0.02);
            }
        });

        state.pointLights.forEach(light => {
            // Find the associated cube and update the light's position
            const associatedCube = state.objects.find(obj => obj.lightSource === light);
            if (associatedCube) {
                light.position = vec3.clone(associatedCube.model.position);
            }
        });
    

        // example - call our collision check method on our cube
        //this.checkCollision(this.cube);
        // Clean up objects that are behind the camera
        //this.cleanupObjectsBehindCamera();
    }
}
