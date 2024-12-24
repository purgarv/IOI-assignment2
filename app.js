const canvas = document.createElement('canvas');
const canvasCtx = canvas.getContext('2d');
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.zIndex = '-1'; // Move the canvas to the background
canvas.style.opacity = '0.7'; // Add transparency
document.body.appendChild(canvas);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let redirectTriggered = false; // Flag to prevent multiple redirects
let highlightedGame = null; // Currently highlighted game


let isFist = false; // Tracks the hand state
let handX = 0, handY = 0; // Tracks hand position


function checkIfFist(landmarks) {
    // Check if all fingers are down
    const tips = [8, 12, 16, 20]; // Fingertips
    const base = [6, 10, 14, 18]; // Finger bases
    return tips.every((tip, i) => landmarks[tip].y > landmarks[base[i]].y);
}

function highlightGame(game) {
    const gameName = game ? game.id : null; // Get the game ID

    if (highlightedGame === gameName) return; // Avoid redundant updates


    // Remove highlight from previous game
    if (highlightedGame) {
        document.getElementById(highlightedGame).style.boxShadow = 'none';
        document.getElementById(highlightedGame).style.scale = 1;
    }

    // Highlight the new game
    highlightedGame = gameName;
    if (highlightedGame) {
        document.getElementById(highlightedGame).style.boxShadow = '0 4px 10px rgba(0, 0, 255, 0.5)';
        document.getElementById(highlightedGame).style.scale = 1.1;
    }
}

function chooseGame() {
    if (redirectTriggered) return; // Prevent multiple redirects

    if (highlightedGame) {
        redirectTriggered = true;
        window.location.href = `./${highlightedGame}.html`;
    }
}






// Hand Tracking Setup
const videoElement = document.createElement('video');
videoElement.style.display = 'none'; // Hide the video element
document.body.appendChild(videoElement);

// Initialize MediaPipe Hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5,
});

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 1920,
    height: 1080,
});
camera.start();






hands.onResults((results) => {

    if (redirectTriggered) return; // Skip processing if already redirected

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    // Draw the webcam frame on the canvas
    // canvasCtx.save();
    // canvasCtx.scale(-1, 1); // Mirror the video horizontally
    // canvasCtx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height);
    // canvasCtx.restore();

    if (results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Mirror the hand position horizontally
        const mirroredLandmarks = landmarks.map((landmark) => ({
            x: 1 - landmark.x,
            y: landmark.y,
            z: landmark.z,
        }));

        // Draw landmarks on the canvas
        mirroredLandmarks.forEach((landmark) => {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
            canvasCtx.fillStyle = 'blue';
            canvasCtx.fill();
        });

        // Define connections between landmarks to represent a hand
        const handConnections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [2, 5], [5, 6], [6, 7], [7, 8], // Index finger
            [5, 9], [9, 10], [10, 11], [11, 12], // Middle finger
            [9, 13], [13, 14], [14, 15], [15, 16], // Ring finger
            [13, 17], [17, 18], [18, 19], [19, 20], // Pinky finger
            [0, 17], [5, 9], [9, 13], [13, 17] // Palm connections
        ];

        // Draw connections between landmarks
        canvasCtx.beginPath();
        canvasCtx.strokeStyle = 'green';
        canvasCtx.lineWidth = 2;
        handConnections.forEach(([start, end]) => {
            const startLandmark = mirroredLandmarks[start];
            const endLandmark = mirroredLandmarks[end];
            canvasCtx.moveTo(startLandmark.x * canvas.width, startLandmark.y * canvas.height);
            canvasCtx.lineTo(endLandmark.x * canvas.width, endLandmark.y * canvas.height);
        });
        canvasCtx.stroke();

        canvasCtx.beginPath();
        canvasCtx.arc(handX, handY, 5, 0, 2 * Math.PI);
        canvasCtx.fillStyle = 'red';
        canvasCtx.fill();

        isFist = checkIfFist(mirroredLandmarks);

        // Update hand position
        handX = mirroredLandmarks[9].x * canvas.width;
        handY = mirroredLandmarks[9].y * canvas.height;

        // Check if the hand is over a game
        const games = document.querySelectorAll('.game');
        let hoveredGame = null;

        games.forEach((game) => {
            const rect = game.getBoundingClientRect();
            if (
                handX >= rect.left &&
                handX <= rect.right &&
                handY >= rect.top &&
                handY <= rect.bottom
            ) {
                hoveredGame = game;
            }
        });

        highlightGame(hoveredGame);

        // If a fist is made and the hand is over a game, select the game
        if (isFist && hoveredGame) {
            chooseGame();
        }

    }
});


