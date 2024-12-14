const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to fill the screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let currentColor = getRandomColor();
let drawing = true;
let lastIsFist = false;
let redirectTriggered = false; // Flag to prevent multiple redirects

function getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}`;
}

function drawSpray(x, y, color, scale) {
    const sprays = Math.floor(Math.random() * 10) + 10; // Random number of sprays
    for (let i = 0; i < sprays; i++) {
        const offsetX = Math.floor(Math.random() * 31 * scale) - 15 * scale; // Scaled offset
        const offsetY = Math.floor(Math.random() * 31 * scale) - 15 * scale;
        const randomAlpha = Math.random() * 0.5 + 0.5; // Semi-transparent (0.5 to 1)
        const radius = Math.floor(Math.random() * 4 * scale) + 3 * scale; // Scaled radius

        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = `${color}, ${randomAlpha})`; // Add random alpha to color
        ctx.fill();
    }
}

function isFist(landmarks) {
    // Check if all fingers are down
    const tips = [8, 12, 16, 20]; // Fingertips
    const base = [6, 10, 14, 18]; // Finger bases
    return tips.every((tip, i) => landmarks[tip].y > landmarks[base[i]].y);
}

function calculatePalmCenter(landmarks) {
    // Use the average position of key palm landmarks for the center
    const points = [0, 5, 9, 13, 17]; // Wrist, base of fingers
    const center = points.reduce(
        (acc, point) => {
            acc.x += landmarks[point].x;
            acc.y += landmarks[point].y;
            return acc;
        },
        { x: 0, y: 0 }
    );

    center.x /= points.length;
    center.y /= points.length;

    return center;
}

function calculatePalmSize(landmarks) {
    const wrist = landmarks[0];
    const middleBase = landmarks[9];

    // Distance between wrist and middle finger base
    const dx = wrist.x - middleBase.x;
    const dy = wrist.y - middleBase.y;
    return Math.sqrt(dx * dx + dy * dy); // Euclidean distance
}

function isDislikeSign(landmarks) {
    // Detect "thumbs down" gesture
    const thumbTip = landmarks[4]; // Thumb tip
    const thumbBase = landmarks[2]; // Base of thumb
    const indexTip = landmarks[8]; // Index finger tip
    const wrist = landmarks[0]; // Wrist

    // Thumb is below the wrist
    const thumbDown = thumbTip.y > wrist.y && thumbTip.y > thumbBase.y;
    const fingersFolded =
        landmarks[12].y > landmarks[9].y && // Middle finger
        landmarks[16].y > landmarks[13].y && // Ring finger
        landmarks[20].y > landmarks[17].y; // Pinky

    return thumbDown && fingersFolded;
}

async function setupCamera() {
    const videoElement = document.createElement('video');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    videoElement.play();
    return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => resolve(videoElement);
    });
}

async function main() {
    const video = await setupCamera();

    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
        if (redirectTriggered) return;
        if (!drawing) return;

        if (results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const palmCenter = calculatePalmCenter(landmarks);

            // Flip palm position horizontally
            const x = canvas.width - palmCenter.x * canvas.width;
            const y = palmCenter.y * canvas.height;

            // Calculate scale based on the palm size
            const palmSize = calculatePalmSize(landmarks);
            const scale = Math.min(Math.max(palmSize * 10, 0.5), 5);

            const isCurrentlyFist = isFist(landmarks);

            if (isCurrentlyFist && !lastIsFist) {
                currentColor = getRandomColor(); // Change color when a fist is detected
            }

            if (!isCurrentlyFist) {
                drawSpray(x, y, currentColor, scale); // Draw graffiti-like spray pattern
            }

            if (isDislikeSign(landmarks)) {
                redirectTriggered = true;
                window.location.href = "index.html";
            } 

            lastIsFist = isCurrentlyFist;
        } else {
            lastIsFist = false; // Reset if no hands are detected
        }
    });

    const camera = new Camera(video, {
        onFrame: async () => {
            await hands.send({ image: video });
        },
        width: 1920,
        height: 1080,
    });

    camera.start();
}

main();