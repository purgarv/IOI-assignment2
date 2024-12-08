const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('overlay');
const canvasCtx = canvasElement.getContext('2d');

let redirectTriggered = false; // Flag to prevent multiple redirects
let highlightedGame = null; // Currently highlighted game

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;

    // Wait for the video to load metadata to set canvas size
    return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            resolve(videoElement);
        };
    });
}

function countFingers(landmarks, handedness) {
    const tips = [4, 8, 12, 16, 20];
    const base = [2, 6, 10, 14, 18];
    let count = 0;

    const isLeftHand = !(handedness === "Left");

    // Check thumb
    const thumbTip = landmarks[4];
    const thumbBase = landmarks[2];

    if (isLeftHand) {
        if (thumbTip.x < thumbBase.x) { 
            count++;
        }
    } else {
        if (thumbTip.x > thumbBase.x) { 
            count++;
        }
    }

    // Check other fingers
    for (let i = 1; i < tips.length; i++) {
        if (landmarks[tips[i]].y < landmarks[base[i]].y) {
            count++;
        }
    }
    return count;
}

function drawLandmarks(landmarks) {
    landmarks.forEach((landmark, i) => {
        const x = (1 - landmark.x) * canvasElement.width; // Mirror x-coordinate
        const y = landmark.y * canvasElement.height;

        // Draw a circle for each landmark
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
        canvasCtx.fillStyle = 'red';
        canvasCtx.fill();

        // Draw connections between landmarks
        if (i > 0) {
            const prev = landmarks[i - 1];
            const prevX = (1 - prev.x) * canvasElement.width;
            const prevY = prev.y * canvasElement.height;

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
    if (highlightedGame === game) return; // Avoid redundant updates

    // Remove highlight from previous game
    if (highlightedGame) {
        document.getElementById(highlightedGame).style.border = '2px solid #333';
    }

    // Highlight the new game
    highlightedGame = game;
    if (highlightedGame) {
        document.getElementById(highlightedGame).style.border = '4px solid green';
    }
}

function chooseGame(handCounts) {
    if (redirectTriggered) return; // Prevent multiple redirects

    if (handCounts.some(count => count === 1)) {
        highlightGame('draw');
    } else if (handCounts.some(count => count === 2)) {
        highlightGame('colors');
    } else if (handCounts.some(count => count === 3)) {
        highlightGame('pong');
    } else if (handCounts.every(count => count === 0)) {
        if (highlightedGame) {
            redirectTriggered = true;
            window.location.href = `./${highlightedGame}.html`;
        }
    } else {
        highlightGame(null); // No valid game selected
    }
}

async function main() {
    await setupCamera();

    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
        maxNumHands: 2, // Detect up to 2 hands
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
        if (redirectTriggered) return; // Skip processing if already redirected

        canvasCtx.save(); // Save the canvas state
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Flip the canvas horizontally
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);

        if (results.multiHandLandmarks.length > 0) {
            const handCounts = [];

            results.multiHandLandmarks.forEach((landmarks, index) => {
                const handedness = results.multiHandedness[index]?.label || "Unknown";

                drawLandmarks(landmarks);

                const fingerCount = countFingers(landmarks, handedness);
                handCounts.push(fingerCount);
            });

            //console.log(handCounts);

            chooseGame(handCounts);
        }

        canvasCtx.restore(); // Restore the canvas state
    });

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 640,
        height: 480,
    });

    camera.start();
}

main();
