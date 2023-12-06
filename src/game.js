class Game {
    constructor(state) {
        this.state = state;
        this.state.lights = [];
        this.canvas = document.querySelector('canvas');
        this.plane = getObject(state, "tempPlane");
        this.light = getObject(state, "lightSource");

        this.lightSource = state.pointLights.find(light => light.name === "lightSource");
        this.playerLight = state.pointLights.find(light => light.name === "playerLight");
        this.weaponLight = state.pointLights.find(light => light.name === "weaponLight");
        this.enemy1light = state.pointLights.find(light => light.name === "Enemy1Light");

        this.controlCamera = false;
        this.cameraSpeed = 15;
        this.isFirstPersonCamera = false;

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
        this.spaceshipSpeed = 0.7;
        this.spaceshipVelocity = { x: 0, y: 0 }; // Track spaceship's velocity
        this.spaceshipSpawnDelay = 2;
        this.spaceshipSpawned = false;
        this.cubeSpawnInterval = null; // Store the interval ID
        this.cubeSpawnRate = 100; // Time in milliseconds between cube spawns
        this.cubeSpeed = 75;
        this.shootingCurve = 35; // How much the player can change projectile trajectory

        this.wave = 0;
        this.waveNumber = document.getElementById('waveNumber');
        this.waveComplete = false; // For round intermission

        
        this.enemy1 = getObject(state, "Enemy1");
        this.enemySpeed = 1;
        this.enemy1Health = 200;
        this.enemy2Health = 0;
        this.enemy3Health = 0;
        this.enemy4Health = 0;
        this.enemy5Health = 0;
        this.lastWaveHealth = 200; // Base health
        this.enemyNum = 1; // Number of enemies in play
        this.enemyHealthTotal = 200;
        this.maxEnemyHealthTotal = 200; // Max health of the enemy health pool
        this.enemyHealthBar = document.getElementById('enemyHealth');
        this.enemy1.xMovementFactor = 1;
        this.enemy1.yMovementFactor = 1;
        this.enemy1.zMovementFactor = 1;
        this.enemy1MoveDirection = [];
        this.enemy1Velocity = [];
        
        this.enemyIsAttacking = false;
        this.enemyAttackIntervalSet = false;
        this.enemyFireRate = 350;
        this.enemy1Killed = false;
        this.enemyInvulnerable = false;
        this.intermission = true;
        // this.enemy2 = getObject(state, "Enemy2");
        // this.enemy3 = getObject(state, "Enemy3");
        // this.enemy4 = getObject(state, "Enemy4");
        // this.enemy5 = getObject(state, "Enemy5");
        // this.enemy6 = getObject(state, "Enemy6");
        // this.enemy7 = getObject(state, "Enemy7");
        // this.enemy8 = getObject(state, "Enemy8");
        // this.enemy9 = getObject(state, "Enemy9");
        // this.enemy10 = getObject(state, "Enemy10");

        this.asteroidPool = [];
        //this.spawnAsteroidField();

        this.rollAngle = 0; // Current roll angle
        this.currentRoll = 0;
        this.maxRollAngle = Math.PI / 6; // Maximum roll angle for full roll
        this.rollSpeed = 0.0003; // Speed at which the ship rolls
        this.rollReturnSpeed = 0.00004; // Speed at which the ship returns to no roll
        this.shipUp = vec3.fromValues(0, 1, 0); // Up vector for the ship
        this.spaceshipTotalRotation = 0;
        this.isShipPointedAtMouse = false;
        this.updatePositionDelay = 2; // Delay in seconds
        this.updatePositionStarted = false;

        this.playerHealth = 100;
        this.playerHealthBar = document.getElementById('healthBar');
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

        this.gameOver = false;

        this.frame = 0;
    }

    initializeMouseInput() {
        document.addEventListener("mousemove", (e) => this.handleMouseMove(e));
        document.addEventListener("mousedown", (e) => this.handleMouseDown(e));
        document.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    }

    toggleControls() {
        this.controlCamera = !this.controlCamera;
        console.log(`Controls toggled. Camera control is now ${this.controlCamera ? 'on' : 'off'}.`);
    }

    updateCameraPosition() {
        // Calculate direction vectors
        let forward = vec3.clone(this.state.camera.front);
        let right = vec3.create();
        vec3.cross(right, this.state.camera.up, forward);
        vec3.normalize(right, right);

        let movementDirection = vec3.create();

        // Combine directions based on key states
        if (this.keyPressed.w) vec3.add(movementDirection, movementDirection, forward);
        if (this.keyPressed.s) vec3.subtract(movementDirection, movementDirection, forward);
        if (this.keyPressed.a) vec3.add(movementDirection, movementDirection, right);
        if (this.keyPressed.d) vec3.subtract(movementDirection, movementDirection, right);
        if (this.keyPressed.z) vec3.add(movementDirection, movementDirection, this.state.camera.up);
        if (this.keyPressed.x) vec3.subtract(movementDirection, movementDirection, this.state.camera.up);

        vec3.scale(movementDirection, movementDirection, 0.1);

        // Update the camera's position
        vec3.add(this.state.camera.position, this.state.camera.position, movementDirection);

        // Update the view matrix
        mat4.lookAt(
            this.state.camera.viewMatrix,
            this.state.camera.position,
            vec3.add(vec3.create(), this.state.camera.position, this.state.camera.front),
            this.state.camera.up
        );
    }

    updateFirstPersonCamera() {
        // Constant z-offset
        const zOffset = -3;
    
        // Calculate the dynamic offset based on the ship's up vector
        let dynamicOffset = vec3.create();
        vec3.scale(dynamicOffset, this.shipUp, 1); // Scale the ship's up vector by 1 unit
        dynamicOffset[2] = zOffset; // Set the z component to the constant offset
    
        // Add the dynamic offset to the spaceship's position for the camera's world position
        let cameraWorldPosition = vec3.create();
        vec3.add(cameraWorldPosition, this.spaceship.model.position, dynamicOffset);
        this.state.camera.position = cameraWorldPosition;
    
        this.state.camera.front = vec3.fromValues(0, 0, 1);
        this.state.camera.up = vec3.clone(this.shipUp);
    
        // Update the camera view matrix
        mat4.lookAt(
            this.state.camera.viewMatrix,
            this.state.camera.position,
            vec3.add(vec3.create(), this.state.camera.position, this.state.camera.front),
            this.state.camera.up
        );
    }

    resetCamera() {
        // Reset the position with the current z-position of the spaceship
        const zPosition = this.spaceship.model.position[2];
        this.state.camera.position = vec3.fromValues(0, 5, zPosition - 7);

        // Reset the up vector
        this.state.camera.up = vec3.fromValues(0, 1, 0);

        // Reset the lookat
        this.state.camera.front = vec3.fromValues(-0.01313674737364058, -0.33873793690267073, 0.9407890496659511) // Original values

        // Update the view matrix to reflect these changes
        mat4.lookAt(
            this.state.camera.viewMatrix,
            this.state.camera.position,
            vec3.add(vec3.create(), this.state.camera.position, this.state.camera.front),
            this.state.camera.up
        );
    }

    rotateCamera(angle) {
        // Create a rotation matrix around the Y-axis
        let rotationMatrix = mat4.create();
        mat4.rotateY(rotationMatrix, rotationMatrix, angle);
    
        // Apply the rotation to the camera's front vector
        let rotatedFront = vec3.create();
        vec3.transformMat4(rotatedFront, this.state.camera.front, rotationMatrix);
        this.state.camera.front = rotatedFront;
    
        // Update the view matrix
        mat4.lookAt(
            this.state.camera.viewMatrix,
            this.state.camera.position,
            vec3.add(vec3.create(), this.state.camera.position, this.state.camera.front),
            this.state.camera.up
        );
    }

    // Movement involved with the player's ship
    updateSpaceshipPosition(deltaTime) {
        let moveDirection = vec3.create();
    
        // Movement keys
        const movementIncrement = 0.003;
        if (this.isFirstPersonCamera) { // For first person mode
            // Calculate the direction vectors based on the ship's up vector
            let forward = vec3.fromValues(0, 0, 1);
            let right = vec3.create();
            vec3.cross(right, this.shipUp, forward);
            vec3.normalize(right, right);

            if (this.keyPressed.w) {
                vec3.add(moveDirection, moveDirection, this.shipUp);
            } 
            if (this.keyPressed.s) {
                vec3.subtract(moveDirection, moveDirection, this.shipUp);
            }
            if (this.keyPressed.a) {
                vec3.add(moveDirection, moveDirection, right);
                this.targetRollAngle = this.maxRollAngle;
            }
            if (this.keyPressed.d) {
                vec3.subtract(moveDirection, moveDirection, right);
                this.targetRollAngle = -this.maxRollAngle;
            }

            // Apply the movement
            vec3.scale(moveDirection, moveDirection, movementIncrement);
            this.spaceshipVelocity.x += moveDirection[0];
            this.spaceshipVelocity.y += moveDirection[1];
        } else {
            if (this.keyPressed.w) {
                this.spaceshipVelocity.y += movementIncrement;
            } 
            if (this.keyPressed.s) {
                this.spaceshipVelocity.y -= movementIncrement;
            }
            if (this.keyPressed.a) {
                this.spaceshipVelocity.x += movementIncrement;
                this.targetRollAngle = this.maxRollAngle;
            } 
            if (this.keyPressed.d) {
                this.spaceshipVelocity.x -= movementIncrement;
                this.targetRollAngle = -this.maxRollAngle;
            }
        }
        if (this.keyPressed.q) {
            this.targetRollAngle = this.maxRollAngle;
        }
        if (this.keyPressed.e) {
            this.targetRollAngle = -this.maxRollAngle;
        }
        
        // Clamp the currentRollAngle to prevent excessive rolling
        this.currentRollAngle = Math.max(-this.maxRollAngle, Math.min(this.maxRollAngle, this.currentRollAngle));
        if (this.isFirstPersonCamera) {
            this.rollAngle = Math.max(-0.03, Math.min(0.01, this.rollAngle));
        } else {
            this.rollAngle = Math.max(-0.1, Math.min(0.1, this.rollAngle));
        }

        // Gradually adjust the roll angle towards the target roll angle
        if (this.isFirstPersonCamera && (this.keyPressed.a || this.keyPressed.d)) {  // Slower roll speed in first person A and D keys
            const firstPersonRollSpeed = this.rollSpeed / 6;
            if (this.rollAngle < this.targetRollAngle) {
                this.rollAngle = Math.min(this.rollAngle + firstPersonRollSpeed, this.targetRollAngle);
            } else if (this.rollAngle > this.targetRollAngle) {
                this.rollAngle = Math.max(this.rollAngle - firstPersonRollSpeed, this.targetRollAngle);
            }
        } else {
            // Original logic for outside first-person mode
            if (this.rollAngle < this.targetRollAngle) {
                this.rollAngle = Math.min(this.rollAngle + this.rollSpeed, this.targetRollAngle);
            } else if (this.rollAngle > this.targetRollAngle) {
                this.rollAngle = Math.max(this.rollAngle - this.rollSpeed, this.targetRollAngle);
            }
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

        // Apply rotation
        this.spaceship.rotate('z', this.rollAngle);

        // Update the total rotation of the spaceship
        const scaleFactor = 180 / 1.5; // Calibrated to match the actual rotation
        this.spaceshipTotalRotation += (this.rollAngle * deltaTime) * scaleFactor;
        this.spaceshipTotalRotation = (this.spaceshipTotalRotation + 2 * Math.PI) % (2 * Math.PI); // Normalize the total rotation

        // Calculate the up vector components based on the scaled rotation
        let upVectorX = Math.cos(this.spaceshipTotalRotation - Math.PI / 2);
        let upVectorY = -Math.sin(this.spaceshipTotalRotation - Math.PI / 2);

        // Normalize the up vector
        const length = Math.sqrt(upVectorX * upVectorX + upVectorY * upVectorY);
        upVectorX /= length;
        upVectorY /= length;

        // Set the up vector for the spaceship
        this.shipUp = vec3.fromValues(upVectorX, upVectorY, 0);

        // Limit the spaceship's velocity
        const spaceshipVelocityMaximum = 0.1;
        this.spaceshipVelocity.x = Math.max(-spaceshipVelocityMaximum, Math.min(spaceshipVelocityMaximum, this.spaceshipVelocity.x));
        this.spaceshipVelocity.y = Math.max(-spaceshipVelocityMaximum, Math.min(spaceshipVelocityMaximum, this.spaceshipVelocity.y));

        // Apply deceleration when movement keys are not pressed
        const decelerationFactor = 0.99; // More pronounced deceleration
        if (!this.keyPressed.w && !this.keyPressed.s) {
            this.spaceshipVelocity.y *= decelerationFactor;
        }
        if (!this.keyPressed.a && !this.keyPressed.d) {
            this.spaceshipVelocity.x *= decelerationFactor;
        }

        // Define clamping bounds with a slight overstep allowance
        const minX = -7, maxX = 7, minY = -3, maxY = 5;

        // Update spaceship's position based on its velocity
        let newX = this.spaceship.model.position[0] + this.spaceshipVelocity.x;
        let newY = this.spaceship.model.position[1] + this.spaceshipVelocity.y;
        vec3.scale(moveDirection, moveDirection, this.spaceshipSpeed);

        // Check if spaceship is out of bounds and adjust position accordingly
        let outOfBoundsX = newX < minX || newX > maxX;
        let outOfBoundsY = newY < minY || newY > maxY;

        const maxReturnSpeed = 0.06; // Maximum speed for returning to bounds
        const overstepMargin = 0.2; // Allow some overstepping
        const returnAcceleration = 0.002; // Acceleration when returning to bounds

        if (outOfBoundsX) {
            let boundaryX = newX < minX ? minX : maxX;
            let distanceX = Math.abs(newX - boundaryX) - overstepMargin;
            let directionX = newX < minX ? 1 : -1;
            this.spaceshipVelocity.x += directionX * Math.max(0, distanceX) * returnAcceleration;
            this.spaceshipVelocity.x = Math.min(maxReturnSpeed, Math.max(-maxReturnSpeed, this.spaceshipVelocity.x));
            newX += this.spaceshipVelocity.x;
        } else {
            this.spaceshipVelocity.x *= decelerationFactor;
        }

        if (outOfBoundsY) {
            let boundaryY = newY < minY ? minY : maxY;
            let distanceY = Math.abs(newY - boundaryY) - overstepMargin;
            let directionY = newY < minY ? 1 : -1;
            this.spaceshipVelocity.y += directionY * Math.max(0, distanceY) * returnAcceleration;
            this.spaceshipVelocity.y = Math.min(maxReturnSpeed, Math.max(-maxReturnSpeed, this.spaceshipVelocity.y));
            newY += this.spaceshipVelocity.y;
        } else {
            this.spaceshipVelocity.y *= decelerationFactor;
        }

        // Allow slight overstep before clamping
        this.spaceship.model.position[0] = Math.max(minX - overstepMargin, Math.min(maxX + overstepMargin, newX));
        this.spaceship.model.position[1] = Math.max(minY - overstepMargin, Math.min(maxY + overstepMargin, newY));

        //Apply boosting
        // if (this.isBoosting && this.currentBoost > 0) {
        //     vec3.scale(moveDirection, moveDirection, this.spaceshipSpeed * 1.3); // Boosted speed
        //     this.currentBoost -= this.boostDecayRate;
        // } else {
        //     vec3.scale(moveDirection, moveDirection, this.spaceshipSpeed);
        //     this.currentBoost = Math.min(this.maxBoost, this.currentBoost + this.boostRegenRate);
        // }
    
        // Translate the position of the spaceship
        this.spaceship.translate(vec3.fromValues(
            newX - this.spaceship.model.position[0],
            newY - this.spaceship.model.position[1],
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
        if (this.isMousePressed) {
            this.updateFiringDirection();
        }
    }

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

    handleKeyPress(e) {
        if (e.key === '`') {
            this.toggleControls();
        } else if (this.controlCamera) {
            // Camera control logic
            if (['w', 'a', 's', 'd', 'z', 'x'].includes(e.key)) {
                this.keyPressed[e.key] = true;
            }
            switch (e.key) {
                case 'q':
                    // Rotate the camera left
                    this.rotateCamera(0.02);
                    break;
                case 'e':
                    // Rotate the camera right
                    this.rotateCamera(-0.02);
                    break;
            }
        } else {
            // Spaceship control logic
            if (['w', 'a', 's', 'd', 'z', 'x', 'q', 'e'].includes(e.key)) {
                this.keyPressed[e.key] = true;
            }
            if (e.key === 'Shift') {
                this.isBoosting = true;
            }
            if (e.key === 'v') {
                this.isFirstPersonCamera = !this.isFirstPersonCamera;
                console.log(`First-person camera mode is now ${this.isFirstPersonCamera ? 'on' : 'off'}.`);
                if (!this.isFirstPersonCamera) {
                    this.resetCamera(); // Reset camera when exiting first-person mode
                }
            }
        }
    }

    handleKeyRelease(e) {
        if (this.controlCamera) {
            this.keyPressed[e.key] = false;
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
        const mouseWorldPosition = this.screenToWorld(this.mousePosition);
    
        // Iterate over all cubes and update their direction
        this.state.objects.forEach(object => {
            if (object.name.startsWith('Cube-') && object.model.position[2] < this.spaceship.model.position[2] + this.shootingCurve) {
                let direction = vec3.create();
                vec3.subtract(direction, vec3.fromValues(-mouseWorldPosition[0] - 5, mouseWorldPosition[1] - 5, mouseWorldPosition[2] + 25), this.spaceship.model.position);
                vec3.normalize(direction, direction);
                object.direction = direction;
            }
        });
    }

    flashWeaponLight(state) {
        const weaponLight = state.pointLights.find(light => light.name === "weaponLight");
        
        if (weaponLight) {
            const originalIntensity = 0.001;
            const originalStrength = 0.01;
            
            // Make the weapon light brighter
            weaponLight.intensity += 1;
            weaponLight.strength += 3;
    
            // Restore the original strength/intensity
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
        
        // Adjust the mouse world position
        const targetPoint = vec3.clone(spaceship.model.position);
        targetPoint[2] += 20; // Move 25 units in front
        targetPoint[0] = -mouseWorldPosition[0] - 5; // Align with mouse X 
        targetPoint[1] = mouseWorldPosition[1] - 5; // Align with mouse Y
    
        // Direction from the spaceship to the target point
        let direction = vec3.create();
        vec3.subtract(direction, targetPoint, spaceship.model.position);
        vec3.normalize(direction, direction);

        let spawnPosition = vec3.clone(spaceship.model.position);
        spawnPosition[2] += 0.9;
    
        // this.spawnCube(this.state, spawnPosition);
        // this.state.objects[this.state.objects.length - 1].direction = direction;
        
        const cube = this.spawnCube(this.state, spawnPosition);
        cube.direction = direction;
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
                diffuse: [0, 1, 0],
                alpha: 0.9,
            },
            position: adjustedPosition,
            scale: vec3.fromValues(0.2, 0.2, 0.2),
        };

        // Create a light source associated with the cube
        const lightConfig = {
            type: 'pointLights',
            position: vec3.clone(adjustedPosition),
            colour: [0, 1, 0],
            intensity: 100,
            strength: 30,
        };

        const cube = addCube(cubeConfig, state);
        this.addLight(lightConfig, state);
        cube.lightSource = lightConfig;

        this.flashWeaponLight(state);

        return cube;
    }

    spawnEnemyCube(state, spawnPosition, direction) {
        const cubeConfig = {
            name: `EnemyCube-${Date.now()}`,
            type: "cube",
            material: {
                diffuse: [1, 0, 0],
                alpha: 0.99,
            },
            position: spawnPosition,
            scale: vec3.fromValues(0.5, 0.5, 0.5),
        };
    
        // Create a light source associated with the enemy's projectile
        const lightConfig = {
            type: 'pointLights',
            position: vec3.clone(spawnPosition),
            colour: [1, 0, 0],
            intensity: 100,
            strength: 30,
        };
    
        const cube = addCube(cubeConfig, state);
        //this.addLight(lightConfig, state);
        cube.direction = direction;
        //cube.lightSource = lightConfig;
    }
    

    updateCubes(deltaTime, state) {
        const cubeSpeed = this.cubeSpeed;
        const spaceshipOffset = { x: 0, y: 0, z: 0 };

        state.objects.forEach(object => {
            if (object.type === 'enemyCube') {

                let adjustedSpaceshipPosition = vec3.create();
                vec3.add(adjustedSpaceshipPosition, this.spaceship.model.position, vec3.fromValues(spaceshipOffset.x, spaceshipOffset.y, spaceshipOffset.z));

                // Calculate new direction towards the player's spaceship
                let direction = vec3.create();
                vec3.subtract(direction, adjustedSpaceshipPosition, object.model.position);
                vec3.normalize(direction, direction);
                object.direction = direction;
    
                // Update position based on the new direction
                vec3.scaleAndAdd(
                    object.model.position,
                    object.model.position,
                    object.direction,
                    cubeSpeed * deltaTime
                );
            } else if (object.type === 'cube') {
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
        const numAsteroids = 1;

        for (let i = 0; i < numAsteroids; i++) {
            const zPos = 200 + (i * (400 / numAsteroids));
            this.spawnAsteroid(0, 0, zPos);
        }
    }

    spawnAsteroid(xPos, yPos, zPos) {
        // Define the range for spawning asteroids (adjust as needed)
        // const xMin = -7; // Adjusted minimum X position
        // const xMax = 12; // Adjusted maximum X position
        // const yMin = -6; // Adjusted minimum Y position
        // const yMax = 7;  // Adjusted maximum Y position


        // Randomly choose an asteroid model
        const asteroidModels = ["asteroid3.obj", "asteroid4.obj", "asteroid5.obj", 
                                "asteroid6.obj", "asteroid7.obj", "asteroid8.obj", "asteroid9.obj", "asteroid10.obj"];
        const asteroidModel = asteroidModels[Math.floor(Math.random() * asteroidModels.length)];

        // Random size variation
        const sizeFactor = 0.3 + Math.random() * 1.7; // Random scale

        // Define the asteroid configuration
        const asteroidConfig = {
            name: `Asteroid-${Date.now()}`,
            model: asteroidModel,
            type: "mesh",
            material: {
                diffuse: [0.1, 0.1, 0.1],
                ambient: [0.05, 0.05, 0.05],
                specular: [0.1, 0.1, 0.1],
                n: 10,
                alpha: 1,
                shaderType: 3
            },
            position: vec3.fromValues(
                xPos,
                yPos,
                zPos
            ),
            scale: vec3.fromValues(sizeFactor, sizeFactor, sizeFactor),
            diffuseTexture: "DefaultMaterial_albedo.jpg",
            normalTexture: "DefaultMaterial_normal.png"
        };

        // Add the asteroid to the game state
        const newAsteroid = spawnObject(asteroidConfig, this.state);
        this.spawnedObjects.push(newAsteroid);
        this.asteroidPool.push(asteroidConfig);
        
        if (newAsteroid && newAsteroid.model) { // Check if the model property exists ?? Doesn't work
             // Add to the asteroid pool
            console.log(this.asteroidPool[0]);
        }
    }

    repositionAsteroids() {
        const xMin = -80;
        const xMax = 80;
        const yMin = -10;
        const yMax = 10;
        const zMin = 400;
        const zMax = 800;

        this.state.objects.forEach((object) => {
            if (object.name.startsWith('Asteroid-')) {
                // Check if the asteroid is behind the spaceship
                if (object.model.position[2] < this.spaceship.model.position[2] - 17.5) {
                    const newZ = this.spaceship.model.position[2] + Math.random() * (zMax - zMin) + zMin;
    
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

    updateEnemyMovement(deltaTime) {
        // Define the range of movement along the x-axis and y-axis
        const minX = -40;
        const maxX = 40;
        const minY = -7;
        const maxY = 15;
        const minZ = 12;
        const maxZ = 35;
    
        // Movement speed along x-axis and y-axis
        const xSpeed = 10 * this.enemySpeed;
        const ySpeed = 3 * this.enemySpeed;
        const zSpeed = 8 * this.enemySpeed;
    
        // Check if the enemy is at or beyond the x-axis boundaries
        if (this.enemy1.model.position[0] >= maxX || this.enemy1.model.position[0] <= minX) {
            this.enemy1.xMovementFactor *= -1;
        }
    
        // Check if the enemy is at or beyond the y-axis boundaries
        if (this.enemy1.model.position[1] >= maxY || this.enemy1.model.position[1] <= minY) {
            this.enemy1.yMovementFactor *= -1;
        }

        // Check if the enemy is at or beyond the z-axis boundaries
        if (this.enemy1.model.position[2] >= maxZ || this.enemy1.model.position[2] <= minZ) {
            this.enemy1.zMovementFactor *= -1;
        }

        this.enemy1Velocity = {
            x: this.enemy1.xMovementFactor * xSpeed * deltaTime,
            y: this.enemy1.yMovementFactor * ySpeed * deltaTime,
            z: this.enemy1.zMovementFactor * zSpeed * deltaTime
        };
    
        // Update position
        this.enemy1.model.position[0] += this.enemy1.xMovementFactor * xSpeed * deltaTime;
        this.enemy1.model.position[1] += this.enemy1.yMovementFactor * ySpeed * deltaTime;
        this.enemy1.model.position[2] += this.enemy1.zMovementFactor * zSpeed * deltaTime;

        // Enemy AI unstuck mechanic
        let enemyStuckTimer = 0;
        const enemyStuckThreshold = 5; // Time limit until enemy gets forcefully repositioned
        const boundaryBuffer = 1; // buffer zone if their close but not touching the boundary. May need adjusting.
        const isStuck =
        (this.enemy1.model.position[0] >= maxX - boundaryBuffer|| this.enemy1.model.position[0] <= minX + boundaryBuffer) || 
        (this.enemy1.model.position[1] >= maxY - boundaryBuffer|| this.enemy1.model.position[1] <= minY) + boundaryBuffer||
        (this.enemy1.model.position[2] >= maxZ - boundaryBuffer|| this.enemy1.model.position[2] <= minZ + boundaryBuffer);
    
    
        if (isStuck) {
            enemyStuckTimer += deltaTime; // Increment the timer when the enemy is stuck
            //console.log(`Enemy stuck timer: ${enemyStuckTimer}`); // dev tool
            if (enemyStuckTimer >= enemyStuckThreshold) {
                // Teleport the enemy x units in front of the spaceship
                const spaceshipPosition = getObject(this.state, "SpaceShip").model.position;
                const teleportDistance = 100;
                this.enemy1.model.position = vec3.fromValues(
                    spaceshipPosition[0],
                    spaceshipPosition[1],
                    spaceshipPosition[2] + teleportDistance
                );

                // Reset the stuck timer after teleportation
                enemyStuckTimer = 0;
                console.log("Enemy has been teleported due to being stuck")
            }
        } else {
            // Reset the timer when the enemy is not stuck
            enemyStuckTimer = 0;
        }
        }

    enemyAttack() {
        // Spawn point
        let spawnPosition = vec3.clone(this.enemy1.model.position);
        spawnPosition[1] -= 1;
        spawnPosition[2] += 45;
    
        // Target point (adjusted for enemy's predicted position)
        let targetPosition = vec3.clone(this.spaceship.model.position);
        targetPosition[0] -= 0.25;
        targetPosition[2] += 18; // 22
    
        // Calculate the direction from the enemy's future position to the spaceship
        let direction = vec3.create();
        vec3.subtract(direction, targetPosition, spawnPosition);
        vec3.normalize(direction, direction);
    
        // Check if the direction vector is valid
        if (!vec3.length(direction)) {
            console.error("Invalid direction vector. Check calculations.");
            return;
        }
    
        // Spawn the projectile (cube) from the enemy
        this.spawnEnemyCube(this.state, spawnPosition, direction);
    }

    enemyKilled() {
        // Update wave number text
        this.waveNumber.innerText = "Complete"; // remove later
        this.enemy1Killed = true; // Will need a parameter and switch later

        // Stop enemy from shooting
        this.stopEnemyAttacks();

        // Flash enemy light
        this.flashEnemyLight();

        // Updates player score (this lasts way too long)
        this.playerScore += 10;
        this.updateScoreDisplay(this.score);
    }

    // A function to update the displayed score
    updateScoreDisplay() {
        const scoreDisplay = document.getElementById('scoreDisplay');
        if (scoreDisplay) {
            scoreDisplay.innerText = `Score: ${this.playerScore}`;
        }
    }

    stopEnemyAttacks() {
        clearInterval(this.enemyAttackInterval);
        this.enemyAttackInterval = null;
    }

    flashEnemyLight() {
        let enemyLight = this.enemy1light;

        // Flash the light on and off
        if (enemyLight) {
            let flashInterval = setInterval(() => {
                enemyLight.strength = enemyLight.strength === 0 ? 40 : 0;
            }, 333);

            // Stop flashing after a certain duration
            setTimeout(() => {
                clearInterval(flashInterval);
                enemyLight.strength = 10; // Reset light
            }, 3300);
        }
    }

    // Increment the difficulty as the player progresses
    initializeWave() {
        this.wave += 1;
        console.log("Wave: ", this.wave);
        this.waveNumber.innerText = `Wave ${this.wave}`;

        if (this.wave === 1) { // Starting wave
            this.enemy1Health = this.lastWaveHealth;
            this.enemyNum = 1;
            this.enemyHealthTotal = this.enemy1Health + this.enemy2Health + this.enemy3Health + this.enemy4Health + this.enemy5Health; 
            this.waveComplete = false;
            return;
        } else {
            this.enemy1Health = this.lastWaveHealth * 1.2; // Increment enemy health every wave
            this.lastWaveHealth = this.enemy1Health;
        }
        // Player increments
        this.cameraSpeed *= 1.2; // 10% increase in spaceship speed
        this.cubeSpeed *= 1.2; // Accomodate cube speed
        this.playerHealth = 100; // Reset player health

        // Reposition enemies
        this.enemy1.model.position = [0, 9, 300 + this.spaceship.model.position[2]];
        this.enemy1.model.rotation = [1, 0, 1.518794157107095e-8, 0, -1.518794157107095e-8, 0.0000023556663109047804, 1, 0, -3.6014726221894264e-14, -1, 0.0000023556663109047804, 0, 0, 0, 0, 1];

        // Update total and max enemy health
        this.enemyHealthTotal = this.enemy1Health;
        this.maxEnemyHealthTotal = this.enemy1Health;

        this.enemyFireRate *= 0.9;
        this.enemySpeed *= 1.15;

        this.enemy1light.strength = 15;
        this.enemyAttackIntervalSet = false;
        this.enemy1Killed = false;

        // Add total enemy health
        this.maxEnemyHealthTotal = this.enemy1Health + this.enemy2Health + this.enemy3Health + this.enemy4Health + this.enemy5Health; 
        console.log(this.maxEnemyHealthTotal);

        this.waveComplete = false;
        this.updateHealthBar();
    }
      
    updateHealthBar() {
        const playerHealthPercent = this.playerHealth;
        const playerHealthBar = document.getElementById('healthBar');

        const enemyHealthPercent = (this.enemyHealthTotal / this.maxEnemyHealthTotal) * 100;
        const enemyHealthBar = document.getElementById('enemyHealthBar');

        playerHealthBar.style.width = `${playerHealthPercent}%`;
        enemyHealthBar.style.width = `${enemyHealthPercent}%`;

        // Change color based on health of player
        if (this.playerHealth < 20) {
            healthBar.style.backgroundColor = 'red';
        } else if (this.playerHealth < 40) {
            healthBar.style.backgroundColor = 'orange';
        } else {
            healthBar.style.backgroundColor = 'green';
        }

    }

    playerKilled() {
        this.gameOver = true;
        this.stopEnemyAttacks();

        showGameOverMessage();
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
        const maxDistance = 300;
        // Filter through all objects
        state.objects = state.objects.filter(object => {
            // Determine if the object is a cube
            if (object.type === 'cube') {
                const distance = vec3.distance(object.model.position, this.spaceship.model.position);
    
                // Check if the cube is further than the maximum allowed distance
                if (distance > maxDistance) {
                    //console.log(`Removing cube at distance: ${distance}`);
    
                    // Release resources and remove the cube
                    if (object.model && object.model.release) {
                        object.model.release();
                    }
                    return false; // Only remove the cube if it's beyond the maximum distance
                }
            }
        
            // Keep the object if it's not a cube or within the maximum allowed distance
            return true;
        });
    }

    is_between(A, B, distance){
        var min = B - distance;
        var max = B + distance;

        if( A > min && A < max){
            return true;
        }else{
            return false;
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
        this.initializeWave();
        this.spawnAsteroid(-17, 0, 100);
        this.spawnAsteroid(-17, 0, 150);
        this.spawnAsteroid(-17, 0, 200);
        /*
        for(var i = 0; i < 50 ; i++){
            let randX = Math.random() * (11 - -11) + -11;
            let randY = Math.random() * (5 - -5) + -5;
            this.spawnAsteroid(randX + 17, randY, 500 + i * 10);
        }
        */
        
    
    }

    // Runs once every frame non stop after the scene loads
    onUpdate(deltaTime) {
        // Move the camera and ship forward by reducing the Z value
        const forwardDistance = this.cameraSpeed * deltaTime;

        if (this.state.sceneLoaded) {
            this.state.camera.position[2] += forwardDistance;
            this.plane.model.position[2] += forwardDistance;

            if (!this.gameOver) {
                this.spaceship.model.position[2] += forwardDistance;
            } else {
                this.spaceship.rotate('z', 0.1);
            }

            this.lightSource.position[2] += forwardDistance;
            this.playerLight.position[2] += forwardDistance;
            this.weaponLight.position[2] += forwardDistance;

            if (this.wave == 0){
                showTitleMessage();
                this.initializeWave();
            }
        }
        
        // Calculate the position difference between the spaceship and weaponLight
        const positionDifference = vec3.create();
        vec3.subtract(positionDifference, this.spaceship.model.position, this.weaponLight.position);

        // Add the position difference to the weaponLight's position
        vec3.add(this.weaponLight.position, this.weaponLight.position, positionDifference);

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

        // First person mode
        if (this.isFirstPersonCamera) {
            this.shootingCurve += 5;
            this.updateFirstPersonCamera();
        }

        // Free cam mode
        if (this.controlCamera) {
            this.updateCameraPosition();
        } else if (this.updatePositionStarted) {
            this.updateSpaceshipPosition(deltaTime);
        }

        // Update projectiles
        this.updateCubes(deltaTime, state);

        // Move asteroids if behind path
        this.repositionAsteroids();

        // Check for collisions
        //this.checkCollision();

        // Start wave when enemy approaches player
        if (this.spaceship.model.position[2] >= this.enemy1.model.position[2] - 15) {
            this.intermission = false;

            if (!this.enemyAttackIntervalSet) {
                this.enemyAttackInterval = setInterval(() => {
                    this.enemyAttack();
                }, this.enemyFireRate);
                this.enemyAttackIntervalSet = true;
            }

            // When each enemy is killed, move them off screen
            if (!this.enemy1Killed) {
                // Enemy health pool
                this.enemyHealthTotal = this.enemy1Health + this.enemy2Health + this.enemy3Health + this.enemy4Health + this.enemy5Health; 

                // Track spaceship 
                this.enemy1light.position[2] += forwardDistance;
                this.enemy1.model.position[2] += forwardDistance;

                // Move enemy
                this.updateEnemyMovement(deltaTime);
            } else {
                // Animate ship off screen
                this.enemy1.rotate('y', 0.05);
                this.enemy1.model.position[1] += 0.02;
            }
            
        }

        // Check if the player is still alive
        if (this.playerHealth <= 0) {
            this.playerKilled();
        }

        // Wave is complete when all enemies are eliminated
        if (this.enemyHealthTotal <= 0) {
            this.waveComplete = true;
        }

        if (this.enemy1Health <= 0) {
            this.enemyKilled();
        }
        if (this.enemy2Health <= 0) {
            //this.enemyKilled();
        }
        if (this.enemy3Health <= 0) {
            //this.enemyKilled();
        }
        if (this.enemy4Health <= 0) {
            //this.enemyKilled();
        }
        if (this.enemy5Health <= 0) {
            //this.enemyKilled();
        }

        // Round intermission
        if (this.waveComplete) {
            // TODO Once all enemies moves off screen, start the next wave
            if (this.enemy1.model.position[2] < this.spaceship.model.position[2] - 120) {
                this.enemy1Killed = false; // Reset the flag
                this.initializeWave();
            }
        }

        // Remove cubes that are not visible (too far away)
        this.cleanupCubes(state);
        
        // Loop for objects in gamestate
        this.state.objects.forEach((object) => {
            
            if (object.name.startsWith('Enemy')) {
                object.rotate('z', Math.random() * 0.1); // Rotate the saucers
            } 

            // Update the position of the light source to follow the enemy
            this.enemy1light.position[0] = this.enemy1.model.position[0];
            this.enemy1light.position[1] = this.enemy1.model.position[1];
            this.enemy1light.position[2] = this.enemy1.model.position[2] + 47.5;
            
            // Player Projectiles
            if (object.name.startsWith('Cube-')) {
                object.rotate('z', Math.random() * 1.5);
                
                /*
                if (this.frame % 500 == 0){
                    console.log(object.model.position[0] + ' ' + object.model.position[1] + ' ' + object.model.position[2]);
                }
                */

                if ( this.is_between(this.enemy1.model.position[0], object.model.position[0], 3)
                    && this.is_between(this.enemy1.model.position[1], object.model.position[1], 2.5) 
                    && this.is_between(this.enemy1.model.position[2] + 37, object.model.position[2], 2) ){

                    if (!this.intermission) {
                        this.enemy1Health -= 10;
                        this.updateHealthBar()
                    }
                    console.log("UFO HIT!");
                    object.model.position = vec3.fromValues(0, 0, 1000);
                    
                }
                
                
            }

            // Enemy Projectiles
            if (object.name.startsWith('EnemyCube')) {
                if ( this.is_between(this.spaceship.model.position[0], object.model.position[0], 1) 
                    && this.is_between(this.spaceship.model.position[1], object.model.position[1], 1) 
                    && this.is_between(this.spaceship.model.position[2], object.model.position[2], 1) ) {

                    console.log("PLAYER HAS BEEN HIT!");
                    object.model.position = vec3.fromValues(0, 0, 1000);
                    this.playerHealth -= 5;
                    this.updateHealthBar();
                }
            }
            
            // Asteroids
            if (object.name.startsWith('Asteroid-')) {
                // Random rotation around each axis
                object.rotate('x', Math.random() * 0.01);
                object.rotate('y', Math.random() * 0.01);
                object.rotate('z', Math.random() * 0.01);
                
                this.state.objects.forEach((cube) => {

                    if (cube.type == "cube")  {
                        if ( this.is_between(object.model.position[0] + 17, cube.model.position[0], 1.5) 
                          && this.is_between(object.model.position[1], cube.model.position[1], 2) 
                          && this.is_between(object.model.position[2], cube.model.position[2], 0.5) ) {
                            
                            object.model.position = vec3.fromValues(0, 0, 0);
                            cube.model.position = vec3.fromValues(0, 0, 1000);
                            
                            console.log("LASER HIT ASTEROID!");
                            }
                    }


                });
                
                // Collision condition
                if ( this.is_between(this.spaceship.model.position[0], object.model.position[0] + 17, 1.5) 
                    && this.is_between(this.spaceship.model.position[1], object.model.position[1], 1.5) 
                    && this.is_between(this.spaceship.model.position[2] - 15, object.model.position[2], 0.3) ) {
                    
                    object.model.position = vec3.fromValues(0, 0, 0);
                    console.log("HIT BY ASTEROID!");
                    this.playerHealth -= 10;
                    this.updateHealthBar();
                }


            }
        });
        
        this.frame++;
        // Find the associated cube and update the light's position (WIP)
        state.pointLights.forEach(light => {
            const associatedCube = state.objects.find(obj => obj.lightSource === light);
            if (associatedCube) {
                light.position = vec3.clone(associatedCube.model.position);
            }
        });
    }
}
