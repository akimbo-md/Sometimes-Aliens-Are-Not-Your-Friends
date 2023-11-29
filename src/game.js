class Game {
    constructor(state) {
        this.state = state;
        this.canvas = document.querySelector('canvas');
        this.plane = getObject(state, "tempPlane");

        this.controlCamera = false;
        this.cameraSpeed = 5;

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
        this.spaceship.rotationQuaternion = quat.create();
        this.spaceshipSpeed = 0.7;
        this.spaceshipSpawnDelay = 2;
        this.spaceshipSpawned = false;
        this.cubeSpawnInterval = null; // Store the interval ID
        this.cubeSpawnRate = 100; // Time in milliseconds between cube spawns

        this.rollAngle = 0; // Current roll angle
        this.currentRoll = 0;
        this.maxRollAngle = Math.PI / 6; // Maximum roll angle for full roll
        this.rollSpeed = 0.003; // Speed at which the ship rolls
        this.rollReturnSpeed = 0.08; // Speed at which the ship returns to no roll
        this.pitchAngle = 0;
        this.pitchCurrent = 0;
        this.yawAngle = 0;
        this.yawCurrent = 0;
        this.isShipPointedAtMouse = false;
        this.updatePositionDelay = 2; // Delay in seconds
        this.updatePositionStarted = false;

        this.playerHealth = 100;
        this.playerBoost = 50;
        
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
        if (this.keyPressed.w) vec3.add(moveDirection, moveDirection, vec3.fromValues(0, 0.05, 0)); // Move up gradually
        if (this.keyPressed.s) vec3.add(moveDirection, moveDirection, vec3.fromValues(0, -0.05, 0)); // Move down gradually
        if (this.keyPressed.d) {
            vec3.add(moveDirection, moveDirection, vec3.fromValues(-0.05, 0, 0)); // Move left gradually
            this.targetRollAngle = this.maxRollAngle;
        } 
        if (this.keyPressed.a) {
            vec3.add(moveDirection, moveDirection, vec3.fromValues(0.05, 0, 0)); // Move right gradually
            this.targetRollAngle = -this.maxRollAngle;
        }
        if (this.keyPressed.q) {
            //this.rollAngle -= this.rollSpeed * deltaTime;
            this.targetRollAngle = -this.maxRollAngle;
        }
        if (this.keyPressed.e) {
            //this.rollAngle += this.rollSpeed * deltaTime;
            this.targetRollAngle = this.maxRollAngle;
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

        // PITCH & YAW
        // Calculate the difference between spaceship and mouse
        let verticalDifference = mouseWorldPosition[1] - this.spaceship.model.position[1];
        let horizontalDifference = mouseWorldPosition[0] - this.spaceship.model.position[0];

        // Determine direction based on relative position to the mouse
        let pitchDirection = (this.spaceship.model.position[1] > mouseWorldPosition[1]) ? -1 : 1;
        let yawDirection = (this.spaceship.model.position[0] > mouseWorldPosition[0]) ? 1 : -1;
        

        // Map this difference to a target angle, adjusted by direction
        let targetPitchAngle = pitchDirection * Math.atan2(Math.abs(verticalDifference), 2);
        let targetYawAngle = yawDirection * Math.atan2(Math.abs(horizontalDifference), 2);
        //console.log("Target Pitch Angle:", targetPitchAngle, "Target Yaw Angle:", targetYawAngle);

        // Clamp the target pitch angle within a maximum range
        const maxPitchAngle = Math.PI / 3; // 60 degrees in radians
        const maxYawAngle = Math.PI / 3;
        targetPitchAngle = Math.max(-maxPitchAngle, Math.min(maxPitchAngle, targetPitchAngle));
        targetYawAngle = Math.max(-maxYawAngle, Math.min(maxYawAngle, targetYawAngle));

        // Smoothly adjust the spaceship's pitch towards the target pitch
        if (Math.abs(targetPitchAngle - this.pitchCurrent) > 0.01) { // Threshold to avoid constant minor adjustments
            let pitchDiff = targetPitchAngle - this.pitchCurrent;
            this.pitchAngle = pitchDiff * deltaTime * 4; // Adjust the rate of change
        } else {
            this.pitchAngle = 0; // Stop adjusting when target pitch is achieved
        }
        if (Math.abs(targetYawAngle - this.yawCurrent) > 0.01) { // Threshold to avoid constant minor adjustments
            let yawDiff = targetYawAngle - this.yawCurrent;
            this.yawAngle = yawDiff * deltaTime * 4; // Adjust the rate of change
        } else {
            this.yawAngle = 0; // Stop adjusting when target pitch is achieved
        }

        // Update orientation
        this.pitchCurrent += this.pitchAngle;
        this.yawCurrent += this.yawAngle;

        // Convert pitch, yaw, and roll to quaternions
        // let pitchQuaternion = quat.setAxisAngle(quat.create(), [1, 0, 0], this.pitchAngle);
        // let yawQuaternion = quat.setAxisAngle(quat.create(), [0, 1, 0], this.yawAngle);
        // let rollQuaternion = quat.setAxisAngle(quat.create(), [0, 0, 1], this.rollAngle);
        // //console.log("Pitch Quaternion:", pitchQuaternion, "Yaw Quaternion:", yawQuaternion, "Roll Quaternion:", rollQuaternion);

        // // Combine the rotations
        // quat.multiply(this.spaceship.rotationQuaternion, yawQuaternion, this.spaceship.rotationQuaternion);
        // quat.multiply(this.spaceship.rotationQuaternion, this.spaceship.rotationQuaternion, pitchQuaternion);
        // quat.multiply(this.spaceship.rotationQuaternion, this.spaceship.rotationQuaternion, rollQuaternion);
        // //console.log("Combined Quaternion:", this.spaceship.rotationQuaternion);

        // // Normalize the spaceship's quaternion to avoid numerical drift
        // quat.normalize(this.spaceship.rotationQuaternion, this.spaceship.rotationQuaternion);

        // // Apply to spaceship's model matrix
        // mat4.fromQuat(this.spaceship.modelMatrix, this.spaceship.rotationQuaternion);
        // //console.log("Spaceship Model Matrix:", this.spaceship.modelMatrix);

        // // Normalize the spaceship's quaternion to avoid numerical drift
        // quat.normalize(this.spaceship.rotationQuaternion, this.spaceship.rotationQuaternion);

        //this.spaceship.rotate('y', this.yawAngle); 
        //this.spaceship.rotate('z', this.pitchAngle); // not working anymore :(
        this.spaceship.rotate('x', this.rollAngle);

        // Debug logs
        // console.log("Target Pitch", targetPitchAngle);
        // console.log("Pitch Angle:", this.pitchAngle);
        // console.log("Pitch Current:", this.pitchCurrent);
    
        // Scale the move direction by spaceship speed and update the position using RenderObject's translate method
        vec3.scale(moveDirection, moveDirection, this.spaceshipSpeed);
    
        // Define clamping bounds for the spaceship's position
        const minX = -7; // Minimum X position
        const maxX = -4; // Maximum X position
        const minY = -4; // Minimum Y position
        const maxY = -1; // Maximum Y position
    
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
        let worldX = normalizedX * 10; // Scale factor for world coordinates
        let worldY = normalizedY * 10; // Scale factor for world coordinates
        let worldZ = this.state.camera.position[2] + 10;
    
        return vec3.fromValues(worldX, worldY, worldZ);
    }
    
    pointTowardsMouse() {
        const mouseWorldPosition = this.screenToWorld(this.mousePosition, this.state.camera);
        const spaceshipPosition = this.spaceship.model.position;
    
        let directionToMouse = vec3.subtract(vec3.create(), mouseWorldPosition, spaceshipPosition);
        vec3.normalize(directionToMouse, directionToMouse);
    
        // Ensure it's not a zero vector
        if (vec3.length(directionToMouse) === 0) {
            console.error('Direction to mouse is a zero vector');
            return;
        }
    
        // Assuming the spaceship's forward vector is along the Z-axis
        const forwardVector = vec3.fromValues(0, 0, 1);
    
        // Calculate the quaternion for rotation
        let rotationQuaternion = quat.create();
        quat.rotationTo(rotationQuaternion, [0, 0, 1], directionToMouse);
        quat.normalize(rotationQuaternion, rotationQuaternion);

        // Apply this rotation to the spaceship
        //this.spaceship.rotateQuaternion(rotationQuaternion);

        // Debugging
        let testQuaternion = quat.setAxisAngle(quat.create(), [0, 0, 1], Math.PI / 2);
        this.spaceship.rotateQuaternion(testQuaternion);
        //console.log("Direction to Mouse:", directionToMouse);
        //console.log("Rotation Quaternion:", rotationQuaternion);
        //console.log("Spaceship Model Matrix after Rotation:", this.spaceship.modelMatrix);
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
        }
    }

    handleKeyRelease(e) {
        if (this.controlCamera) {
            // ...
        } else {
            if (['w', 'a', 's', 'd', 'z', 'x', 'q', 'e'].includes(e.key)) {
                this.keyPressed[e.key] = false;
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
    
        // ... other camera setup like setting position, view matrix, etc.
    }

    // spawnField() {
    //     console.log("Spawning field");
    //     for (let i = 0; i < 10; i++) {
    //         for (let j = 0; j < 10; j++) {
    //             for (let k = 0; k < 10; k++) {
    //                 spawnObject({
    //                     name: `new-Object${i}${j}${k}`,
    //                     model: "Space_Invader.obj",
    //                     type: "mesh",
    //                     material: {
    //                         diffuse: randomVec3(0, 1)
    //                     },
    //                     position: vec3.fromValues(-15.5 - i, 5 - j, 20 + k + this.state.camera.position[2]),
    //                     scale: vec3.fromValues(0.0078125, 0.0078125, 0.015625)
    //                 }, this.state);
    //             }
    //         }
    //     }
    // }

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
        targetPoint[0] = -mouseWorldPosition[0] - 5; // Align with mouse X
        targetPoint[1] = mouseWorldPosition[1] - 5; // Align with mouse Y
    
        // Calculate the direction from the spaceship to the target point
        let direction = vec3.create();
        vec3.subtract(direction, targetPoint, spaceship.model.position);
        vec3.normalize(direction, direction);
    
        this.spawnCube(this.state, spaceship.model.position);
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
        const upOffset = 6;
        const leftOffset = -5.24;
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
            // Other properties...
        };
    
        // Add the cube to the game state and return the newly created cube
        console.log(`Spawned Cube: ${cubeConfig.name} at Position: ${JSON.stringify(spaceshipPosition)}`);
        console.log("Ship pos:", this.spaceship.model.position);
        return addCube(cubeConfig, state);
    }

    updateCubes(deltaTime, state) {
        const cubeSpeed = 10; // Adjust speed as necessary
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

    spawnField() {
        const fieldDepth = 10;
        const startZ = this.lastSpawnZ + fieldDepth;
    
        console.log(`Queueing field for spawning at Z: ${startZ}`);
    
        for (let k = 0; k < 10; k++) {
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    // Construct the object configuration
                    const objectConfig = {
                        name: `new-Object${i}${j}${k}-${this.layerCount}`,
                        model: "Space_Invader.obj",
                        type: "mesh",
                        material: {
                            diffuse: randomVec3(0.66, 1)
                        },
                        // Make sure the Z position of the new objects is incremented by the fieldDepth
                        position: vec3.fromValues(-15.5 - i, 5 - j, startZ + (k * fieldDepth)),
                        scale: vec3.fromValues(0.0078125, 0.0078125, 0.015625)
                    };
    
                    // Push the object configuration onto the spawn queue
                    this.spawnQueue.push(objectConfig);
                }
            }
        }
    
        // Update the lastSpawnZ to the Z position of the last object in the new field
        this.lastSpawnZ = startZ + (9 * fieldDepth); // The Z position of the last object in the field
        this.isSpawning = true;
        this.layerCount++;
    }
    

    async processSpawnQueue() {
        if (this.isSpawning && this.spawnQueue.length > 0) {
            // Determine how many objects to spawn per frame
            const spawnCountPerFrame = 5;
    
            for (let i = 0; i < spawnCountPerFrame; i++) {
                if (this.spawnQueue.length > 0) {
                    const spawnTask = this.spawnQueue.shift();
                    try {
                        const object = await spawnObject(spawnTask, this.state);
                        if (object) {
                            this.spawnedObjects.push(object); // Add the spawned object to the list
                        }
                    } catch (error) {
                        console.error("Failed to spawn object:", error);
                    }
                } else {
                    this.isSpawning = false;
                    break;
                }
            }
        }
        if (this.spawnQueue.length === 0) {
            this.isSpawning = false;
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

        // spawn some stuff before the scene starts
        this.spawnField();

        // for (let i = 0; i < 10; i++) {
        //     let tempObject = await spawnObject({
        //         name: `new-Object${i}`,
        //         type: "cube",
        //         material: {
        //             diffuse: randomVec3(0, 1)
        //         },
        //         position: vec3.fromValues(4 - i, 0, 0),
        //         scale: vec3.fromValues(0.5, 0.5, 0.5)
        //     }, this.state);


        // tempObject.constantRotate = true; // lets add a flag so we can access it later
        // this.spawnedObjects.push(tempObject); // add these to a spawned objects list

        // tempObject.collidable = true;
        // tempObject.onCollide = (object) => { // we can also set a function on an object without defining the function before hand!
        //     console.log(`I collided with ${object.name}!`);
        // };
        // }
    }

    cleanupCubes(state) {
        state.objects = state.objects.filter(object => {
            if (object.type === 'cube') {
                // Check if the cube is too far or off-screen and return false to remove it
            }
            return true;
        });
    }

    // Runs once every frame non stop after the scene loads
    onUpdate(deltaTime) {
        // Move the camera and ship forward by reducing the Z value
        const forwardDistance = this.cameraSpeed * deltaTime;
        this.state.camera.position[2] += forwardDistance;
        this.spaceship.model.position[2] += forwardDistance;
        this.plane.model.position[2] += forwardDistance;

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
        this.cleanupCubes(state);

        // Update the spaceship orientation based on the current mouse position
        //const mouseWorldPosition = this.screenToWorld(this.mousePosition);
        //this.updateSpaceshipOrientation(mouseWorldPosition);
        //console.log("Mouse World Position:", mouseWorldPosition);
        

        // console.log(`Camera Z Position: ${this.state.camera.position[2]}, Last Spawn Z: ${this.lastSpawnZ}`);

        // Check if it's time to spawn a new field based on the camera's position
        // if (this.state.camera.position[2] - this.lastSpawnZ >= this.spawnThreshold) {
        //     this.spawnField();
        //     // Update lastSpawnZ to the start position of the newly spawned field
        //     this.lastSpawnZ = this.state.camera.position[2] + this.spawnDistanceAhead;
        // }

        // Spawn forever
        // if (!this.isSpawning) {
        //     this.spawnField();
        // }

        // Process the spawn queue
        this.processSpawnQueue().catch(error => console.error("Error processing spawn queue:", error));

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

        // example: Rotate all the 'spawned' objects in the scene
        // this.spawnedObjects.forEach((object) => {
        //     object.rotate('y', deltaTime * 0.5);
        // });


        // example - call our collision check method on our cube
        //this.checkCollision(this.cube);
        // Clean up objects that are behind the camera
        this.cleanupObjectsBehindCamera();
    }
}
