"Sometimes, Aliens Are Not Your Friends" is an exciting and challenging WebGL game that combines elements of classic space invaders and asteroid games. In this game, players navigate through space, battling waves of UFO enemies and avoiding asteroids. The project presents numerous implementation challenges, notably in developing smooth controls, realistic physics, and engaging enemy AI. The integration of advanced graphics, such as dynamic lighting and texture mapping, also posed significant complexity. This project serves as a testament to the intricacies of modern web-based game development and the application of theoretical concepts in a practical, interactive environment.

[![DEMO VIDEO](https://media.discordapp.net/attachments/806285969090281492/1180833966798929990/image.png?ex=65ad00d4&is=659a8bd4&hm=5e97b7eb8e9ff1f4b49d87101feb2fa93f11d11b37daac70fa30e925dd560f21&=&format=webp&quality=lossless&width=942&height=739)](https://www.youtube.com/watch?v=P4Je46cPOcM)
DEMO VIDEO

Methods:
Summary of Functionality
The game's core functionalities are implemented using JavaScript and WebGL. The player controls a spaceship, dodging obstacles and firing at enemies. Key features include:

Dynamic Enemy Encounters: Enemies appear in waves, each with increasing difficulty.
Player and Enemy Mechanics: Includes health systems, shooting mechanics, and collision detection.
Environmental Challenges: Asteroids and other obstacles create a dynamic, interactive space environment.
Lighting and Effects: Utilizes point lights for dynamic lighting effects on the spaceship, weapons, and enemies.
Scene Management: The game dynamically loads a scene from a JSON file (scene.json), creating an immersive environment for the player.
Skybox Implementation: A skybox is used to create an expansive background, enhancing the game's immersive experience and space feel. (Not quite implemented)

Implementation of Shaders
The game employs two primary shaders written in GLSL: a vertex shader (vertShaderSample) and a fragment shader (fragShaderSample). These shaders are pivotal in rendering objects with realistic lighting and textures.

Vertex Shader
Functionality: Transforms vertex positions from model space to clip space, calculates transformed normal vectors for lighting, and passes texture coordinates to the fragment shader.
Key Components:
Inputs for vertex position, normal, and texture coordinates.
Uniforms for transformation matrices and camera position.
Outputs for texture coordinates, fragment position, normal vector, and camera position.

Fragment Shader
Functionality: Implements the Phong lighting model for ambient, diffuse, and specular lighting, and manages texture mapping and transparency.
Phong Lighting Model:
Ambient Lighting: Simple, uniform lighting across the surface.
Diffuse Lighting: Reflects the light based on the angle of the light source, using the dot product of the normal and light direction vectors.
Specular Lighting: Simulates the shiny spots of light, particularly where the light source reflects directly into the camera.
Attenuation: Reduces light intensity over distance, using linear and quadratic factors.
- Texture Mapping: Applies textures to surfaces when available, enhancing visual details.
- Transparency Control: Manages the transparency of objects using an alpha value.

Link to Theory:
The game's development is closely tied to the theoretical concepts taught in class:

Modeling and Viewing: Utilizes WebGL's 3D rendering capabilities for creating and manipulating game objects in a virtual space. The game employs various transformations, such as translations, rotations, and scaling, to simulate realistic movement.
Shading and Light Models: Implements Phong shading model for realistic rendering of objects with attenuation. The game uses point light sources to create dynamic shadows and highlights, enhancing the visual quality.
Texture Mapping: Applies textures to game objects for added realism. Special textures, like bump maps, are used for asteroids to give them a more realistic, rugged look.
Visibility and Transparency: Manages the rendering order and uses alpha values to handle object visibility and transparency, crucial for effects like spaceship-asteroid impacts and laser beam collisions.


Implementation Details
Scene Composition and Player Interaction
1. Dynamic Scene Elements
Player Spaceship and Light Source: The spaceship, accompanied by a soft light source above, creates a sense of depth and dimension. This light source adds to the visual appeal and aids in spatial orientation.
Camera Dynamics: The camera moves in unison with the player, maintaining a consistent viewpoint. This movement is critical for ensuring a seamless and immersive player experience.
2. Asteroid Field Implementation
Spawn Mechanics: Asteroids are spawned within a randomized range, introducing unpredictability and variety to the gameplay.
Repositioning Algorithm: A key optimization technique involves repositioning asteroids in front of the player, thereby reducing the computational overhead of generating new objects.

3. Infinite Scrolling Planes
Plane Movement Logic: Two planes are employed to simulate an endless space environment. One plane repositions in front of the other as the player advances, creating an illusion of continuous movement.
Enemy Dynamics and Combat
1. Enemy Behavior
Spawn and Approach Mechanics: The enemy UFO spawns at a distance and appears to approach the player. This simulated movement enhances the game's challenge and engagement.
Update Movement Algorithm: The updateEnemyMovement function is invoked when the enemy is within a specific range, simulating a DVD logo-like random movement within a defined box, adding to the gameplay's unpredictability.

2. Projectile System
Fire Rate and Speed: Both the player and the enemy have specified fire rates and projectile speeds. Balancing these parameters is crucial for fair gameplay.
Enemy Targeting System: The enemy's targeting algorithm includes a random variation, ensuring the player is not overwhelmed, thus balancing difficulty and fairness.

Advanced Player Mechanics
1. Aim Assist and Shooting Mechanics
Aim Assist Functionality: The game employs a glmatrix lerp function for aim assist, subtly guiding player shots for a more rewarding experience without undermining the skill component.
Mouse-based Trajectory Calculation: The player's shot trajectory is determined using the mouse position, with a Z-axis offset to bridge the 2D-3D space conversion. This implementation encourages players to focus on shot impact rather than mouse location.
2. Spaceship Movement and Control
Velocity and Boundary Interaction: The spaceship's movement incorporates a velocity component, giving it a fluid, slidey feel. When hitting the play area's boundaries, it elastically bounces back, a mechanic that enhances the game's realism and player immersion.
Roll Effect on Movement: Rolling the spaceship adds to the visual aesthetics and affects its movement dynamics, particularly in side-to-side maneuvers.
3. First-Person Perspective Complexity
View Toggle and Roll Interaction: Pressing the 'v' key toggles a first-person perspective, introducing complexities in movement and camera alignment, especially when the ship rolls.
Camera Alignment: The camera's dynamic offset ensures it feels locked onto the ship, even when the ship rolls or inverts.
Press the ‘~’ key for Freecam mode (debugging feature)

Collision Mechanics and Effects
1. Collision Detection and Response
Collision Effects: Collisions with enemies and asteroids trigger distinct visual effects, such as bouncing off and color changes to white, enhancing visual feedback.
Player-Asteroid Collision Mechanics: When the player's ship collides with an asteroid, it temporarily becomes transparent, and its weapons go offline, adding a strategic element to navigation and combat.
2. Collider Shape and Limitations
Collider Shape Optimization: The current rectangular collider could be optimized with a spherical collider for more accurate and realistic collision detection, especially given the game's 3D nature.
Performance and Configuration
1. Asteroid Field Optimization
Pre-Spawn Strategy: A Python script is used to pre-spawn asteroids before the game for better performance, demonstrating an innovative approach to resource management.
Scene Configuration Flexibility: Players can adjust the number of asteroids in the scene.json file, allowing the game to be tailored to different hardware capabilities.
User Interface and Additional Features
1. Comprehensive User Interface
Gameplay Metrics Display: The game features a sleek UI that tracks crucial metrics like score, speed, player health, ammo, enemy health, and wave number, providing players with essential information at a glance.
Pause and Restart Functions: The ability to pause and restart the game adds to the user-friendly experience, allowing players to take breaks or retry challenges.
2. Audio Integration
Sound Effects: The game integrates sound effects to represent various in-game actions and events, contributing to an immersive auditory experience.

Future Development Considerations
1. Planned Features and Limitations
Skybox/Spacebox: Can’t have a space game with no stars.
Sphere Collisions: The planned implementation of sphere collisions for more accurate interactions.
Projectile Lights: Adding lights to projectiles for enhanced visual feedback.
Expanded Enemy and Multiplayer Mechanics: Introducing multiple enemies and multiplayer capabilities could significantly expand the game's scope and appeal.



