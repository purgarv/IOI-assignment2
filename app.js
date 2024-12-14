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



// function countFingers(landmarks, handedness) {
//     const tips = [4, 8, 12, 16, 20];
//     const base = [2, 6, 10, 14, 18];
//     let count = 0;

//     const isLeftHand = !(handedness === "Left");

//     // Check thumb
//     const thumbTip = landmarks[4];
//     const thumbBase = landmarks[2];

//     if (isLeftHand) {
//         if (thumbTip.x < thumbBase.x) { 
//             count++;
//         }
//     } else {
//         if (thumbTip.x > thumbBase.x) { 
//             count++;
//         }
//     }

//     // Check other fingers
//     for (let i = 1; i < tips.length; i++) {
//         if (landmarks[tips[i]].y < landmarks[base[i]].y) {
//             count++;
//         }
//     }
//     return count;
// }

function checkIfFist(landmarks) {
    // Check if all fingers are down
    const tips = [8, 12, 16, 20]; // Fingertips
    const base = [6, 10, 14, 18]; // Finger bases
    return tips.every((tip, i) => landmarks[tip].y > landmarks[base[i]].y);
}

function drawLandmarks(landmarks) {
    landmarks.forEach((landmark, i) => {
        const x = (1 - landmark.x) * canvas.width; // Mirror x-coordinate
        const y = landmark.y * canvas.height;

        // Draw a circle for each landmark
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
        canvasCtx.fillStyle = 'red';
        canvasCtx.fill();

        // Draw connections between landmarks
        if (i > 0) {
            const prev = landmarks[i - 1];
            const prevX = (1 - prev.x) * canvas.width;
            const prevY = prev.y * canvas.height;

            canvasCtx.beginPath();
            canvasCtx.moveTo(prevX, prevY);
            canvasCtx.lineTo(x, y);
            canvasCtx.strokeStyle = 'blue';
            canvasCtx.lineWidth = 2;
            canvasCtx.stroke();
        }
    });
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


