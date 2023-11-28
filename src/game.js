class Game {
    constructor(state) {
        this.state = state;

        this.controlCamera = false;
        this.cameraSpeed = 5;

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

        this.spaceship = getObject(state, "SpaceShip");
        this.spaceshipSpeed = 0.1;

        this.playerHealth = 100;
        
        this.spawnedObjects = [];
        this.collidableObjects = [];
        this.lastSpawnZ = 0;
        this.layerCount = 0; 
        this.spawnQueue = []; // Queue of spawn tasks
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
            this.cameraSpeed // You should define this.cameraSpeed somewhere
        );

        // Update the view matrix since the camera's position has changed
        mat4.lookAt(
            this.state.camera.viewMatrix,
            this.state.camera.position,
            this.state.camera.target, // Assuming you have a target property for where the camera is looking
            this.state.camera.up // Assuming you have an up vector property for the camera
        );
    }

    updateSpaceshipPosition() {
        const deltaX = this.mousePosition.x - this.prevMousePosition.x;
        const deltaY = -(this.mousePosition.y - this.prevMousePosition.y);
    
        const directionVector = vec3.fromValues(-deltaX, deltaY, 0);
    
        // Scale the direction vector based on sensitivity
        vec3.scale(directionVector, directionVector, this.mouseSensitivity);
    
        // Update the spaceship's position
        vec3.add(this.spaceship.model.position, this.spaceship.model.position, directionVector);
    
        // Update the model matrix for the spaceship
        mat4.fromTranslation(this.spaceship.modelMatrix, this.spaceship.model.position);

        // Store the current mouse position as the previous position for the next frame
        this.prevMousePosition.x = this.mousePosition.x;
        this.prevMousePosition.y = this.mousePosition.y;
    }

    // Handle mouse move events to get the current mouse position
    handleMouseMove(e) {
        // Get the canvas element and its position on the screen
        const canvas = document.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
    
        // Calculate the mouse position so that the center of the canvas is (0, 0)
        this.mousePosition.x = (e.clientX - rect.left) - (rect.width / 2);
        this.mousePosition.y = -((e.clientY - rect.top) - (rect.height / 2)); // Inverting Y axis
    }

    // Handle mouse down and up events to track mouse button presses
    handleMouseDown() {
        this.isMousePressed = true;
    }

    handleMouseUp() {
        this.isMousePressed = false;
    }

    // Initialize mouse input handling
    initializeMouseInput() {
        document.addEventListener("mousemove", (e) => this.handleMouseMove(e));
        document.addEventListener("mousedown", () => this.handleMouseDown());
        document.addEventListener("mouseup", () => this.handleMouseUp());
    }

    handleKeyPress(e) {
        if (e.key === '`') {
            this.toggleControls();
        } else if (this.controlCamera) {
            // Camera control is active
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
        } else if (this.spaceship) {
            // Spaceship control is active
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
                // Implement additional controls if needed
            }
            if (directionVector) {
                this.moveSpaceship(directionVector);
            }
        }
    }

    initializeControls() {
        document.addEventListener("keypress", (e) => this.handleKeyPress(e));
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
                            diffuse: randomVec3(0, 1)
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

    cleanupObjectsBehindCamera() {
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

    // Runs once every frame non stop after the scene loads
    onUpdate(deltaTime) {
        // TODO - Here we can add game logic, like moving game objects, detecting collisions, you name it. Examples of functions can be found in sceneFunctions

        // Move the camera and ship forward by reducing the Z value
        const forwardDistance = this.cameraSpeed * deltaTime;
        this.state.camera.position[2] += forwardDistance;
        this.spaceship.model.position[2] += forwardDistance;

        // Update the model matrix for the spaceship
        mat4.fromTranslation(this.spaceship.modelMatrix, this.spaceship.model.position);
        // Update the view matrix since the camera's position has changed
        mat4.lookAt(
            this.state.camera.viewMatrix,
            this.state.camera.position,
            vec3.add(vec3.create(), this.state.camera.position, vec3.fromValues(0, 0, -1)), // Target is one unit in front of the camera
            this.state.camera.up // Assuming you have an up vector property for the camera
        );
        this.updateSpaceshipPosition();

        // console.log(`Camera Z Position: ${this.state.camera.position[2]}, Last Spawn Z: ${this.lastSpawnZ}`);

        // Check if it's time to spawn a new field based on the camera's position
        // if (this.state.camera.position[2] - this.lastSpawnZ >= this.spawnThreshold) {
        //     this.spawnField();
        //     // Update lastSpawnZ to the start position of the newly spawned field
        //     this.lastSpawnZ = this.state.camera.position[2] + this.spawnDistanceAhead;
        // }
        if (!this.isSpawning) {
            this.spawnField();
        }

        // Process the spawn queue
        this.processSpawnQueue().catch(error => console.error("Error processing spawn queue:", error));

        // example: Rotate all objects in the scene marked with a flag
        this.state.objects.forEach((object) => {
            if (object.constantRotate) {
                object.rotate('y', deltaTime * 0.5);
            }
        });

        // simulate a collision between the first spawned object and 'cube' 
        // if (this.spawnedObjects[0].collidable) {
        //     this.spawnedObjects[0].onCollide(this.cube);
        // }

        // example: Rotate all the 'spawned' objects in the scene
        this.spawnedObjects.forEach((object) => {
            object.rotate('y', deltaTime * 0.5);
        });


        // example - call our collision check method on our cube
        //this.checkCollision(this.cube);
        // Clean up objects that are behind the camera
        this.cleanupObjectsBehindCamera();
    }
}
