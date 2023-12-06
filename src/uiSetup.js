function shaderValuesErrorCheck(programInfo) {
    let missing = [];
    //do attrib check
    Object.keys(programInfo.attribLocations).map((attrib) => {
        if (programInfo.attribLocations[attrib] === -1) {
            missing.push(attrib);
        }
    });
    //do uniform check
    Object.keys(programInfo.uniformLocations).map((attrib) => {
        if (!programInfo.uniformLocations[attrib]) {
            missing.push(attrib);
        }
    });

    if (missing.length > 0) {
        printError('Shader Location Error', 'One or more of the uniform and attribute variables in the shaders could not be located or is not being used : ' + missing);
    }
}

/**
 * A custom error function. The tag with id `webglError` must be present
 * @param  {string} tag Main description
 * @param  {string} errorStr Detailed description
 */
function printError(tag, errorStr) {
    // Create a HTML tag to display to the user
    var errorTag = document.createElement('div');
    errorTag.classList = 'alert alert-danger';
    errorTag.innerHTML = '<strong>' + tag + '</strong><p>' + errorStr + '</p>';

    // Insert the tag into the HMTL document
    document.getElementById('webglError').appendChild(errorTag);

    // Print to the console as well
    console.error(tag + ": " + errorStr);
}

function showUIElements() {
    const elementsToShow = [
        'scoreDisplay', 
        'speedCalculation', 
        'ammoBar', 
        'ammoBarContainer', 
        'healthBar', 
        'healthBarContainer'
    ];

    elementsToShow.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block'; // or 'flex', 'inline-block', etc.
        }
    });
}

function hideUIElements() {
    const elementsToHide = [
        'scoreDisplay', 
        'speedCalculation', 
        'ammoBar', 
        'ammoBarContainer', 
        'healthBar', 
        'healthBarContainer'
    ];

    elementsToHide.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    });
}

function showGameOverMessage() {
    const gameOverElement = document.getElementById('gameOverMessage');
    const playAgainButton = document.getElementById('playAgain');
    gameOverElement.style.display = 'block';
    playAgainButton.style.display = 'block';
}

function hideGameOverMessage() {
    const gameOverElement = document.getElementById('gameOverMessage');
    const playAgainButton = document.getElementById('playAgain');
    gameOverElement.style.display = 'none';
    playAgainButton.style.display = 'none';
}

function showTitleMessage() {
    console.log("Start");
    const gameTitleElement = document.getElementById('gameTitleMessage');
    gameTitleElement.style.display = 'block';
}

function hideTitleMessage() {
    const gameTitleElement = document.getElementById('gameTitleMessage');
    gameTitleElement.style.display = 'none';
}

function togglePauseMessage(isPaused) {
    const pausedMessageElement = document.getElementById('pausedMessage');
    if (pausedMessageElement) {
        pausedMessageElement.style.display = isPaused ? 'block' : 'none';
    }
}

// AUDIO

const lastPlayedTimes = {};

function playSound(soundId, cooldownInSeconds = 0) {
    const currentTime = Date.now();
    const lastPlayedTime = lastPlayedTimes[soundId] || 0;
    const elapsedTime = (currentTime - lastPlayedTime) / 1000;

    if (elapsedTime >= cooldownInSeconds) {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.pause();
            sound.currentTime = 0;
            sound.play().catch(e => console.error("Error playing sound:", e));
            lastPlayedTimes[soundId] = currentTime; // Update last played time
        }
    }
}

function stopSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.pause();
        sound.currentTime = 0;
    }
}

function setDefaultVolume() {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.volume = 0.25;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const volumeSlider = document.getElementById('volumeSlider');

    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.volume = volumeSlider.value;
    });

    volumeSlider.addEventListener('input', () => {
        const volume = volumeSlider.value;
        audioElements.forEach(audio => {
            audio.volume = volume;
        });
    });
});
