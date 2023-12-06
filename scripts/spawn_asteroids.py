import random
import json
import numpy as np

def generate_asteroid_json():
    favored_range = {"xMin": -7, "xMax": 12, "yMin": -6, "yMax": 7}
    total_range = {"xMin": -15, "xMax": 20, "yMin": -10, "yMax": 10}
    z_range = {"zMin": -400, "zMax": -800}

    num_asteroids = 100
    asteroid_data = []

    for i in range(num_asteroids):

        if random.random() < 0.35:  # probability to spawn in favored range
            x = np.random.uniform(favored_range['xMin'], favored_range['xMax'])
            y = np.random.uniform(favored_range['yMin'], favored_range['yMax'])
        else:  # spawn outside the favored range
            x = np.random.uniform(total_range['xMin'], total_range['xMax'])
            y = np.random.uniform(total_range['yMin'], total_range['yMax'])
        
        z = np.random.uniform(z_range['zMin'], z_range['zMax'])

        # Randomly choose an asteroid model
        asteroid_models = ["asteroid3.obj", "asteroid4.obj", "asteroid5.obj", 
                           "asteroid6.obj", "asteroid7.obj", "asteroid8.obj", "asteroid9.obj", "asteroid10.obj"]
        asteroid_model = random.choice(asteroid_models)

        # Random size variation
        size_factor = np.random.uniform(0.3, 1.2) if favored_range else np.random.uniform(0.3, 2.2)

        # Define the asteroid configuration
        asteroid_config = {
            "name": f"Asteroid-{i}",
            "model": asteroid_model,
            "type": "mesh",
            "material": {
                "diffuse": [0.1, 0.1, 0.1],
                "ambient": [0.05, 0.05, 0.05],
                "specular": [0.1, 0.1, 0.1],
                "n": 10,
                "alpha": 1,
                "shaderType": 3
            },
            "position": [x, y, z],
            "scale": [size_factor, size_factor, size_factor],
            "diffuseTexture": "DefaultMaterial_albedo.jpg",
            "normalTexture": "DefaultMaterial_normal.png"
        }

        asteroid_data.append(asteroid_config)
    
    return asteroid_data

# Generate asteroid data and convert it to JSON format
asteroid_json = generate_asteroid_json()
json_data = json.dumps(asteroid_json, indent=4)

# Display the generated JSON data
json_data

# Write to file
with open('asteroids.json', 'w') as file:
    file.write(json_data)

