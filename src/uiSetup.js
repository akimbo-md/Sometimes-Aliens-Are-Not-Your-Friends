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

function showGameOverMessage() {
    const gameOverElement = document.getElementById('gameOverMessage');
    gameOverElement.style.display = 'block'; // Show the element
}

function hideGameOverMessage() {
    const gameOverElement = document.getElementById('gameOverMessage');
    gameOverElement.style.display = 'none'; // Hide the element
}

function showTitleMessage() {
    const gameTitleElement = document.getElementById('gameTitleMessage');
    gameTitleElement.style.display = 'block'; // Show the element
}

function hideTitleMessage() {
    const gameTitleElement = document.getElementById('gameTitleMessage');
    gameTitleElement.style.display = 'none'; // Show the element
}