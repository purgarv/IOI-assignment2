const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to fill the screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let currentColor = getRandomColor();
let drawing = false; // Initially set to false
let lastIsFist = false;
let redirectTriggered = false; // Flag to prevent multiple redirects
let promptClosed = false; // To track if the prompt is closed

function getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}`;
}

function createPrompt() {
    const overlay = document.createElement('div');
    overlay.id = 'instructionOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.color = 'white';
    overlay.style.fontSize = '24px';
    overlay.style.textAlign = 'center';
    overlay.innerHTML = `
        <h1>Risanje</h1>
        <p>S premikanjem roke lahko rišete. <br>Za spremembo barve naredite pest. 
        <p>Za vrnitev na glavni meni naredite 👎 z obema rokama.</p>
        <p>Za nadaljevanje držite roko nad OK in naredite pest.</p>
        <button id="okButton" style="margin-top: 20px; padding: 10px 20px; font-size: 18px; cursor: pointer;">OK</button>
    `;
    document.body.appendChild(overlay);

    // Position the "OK" button for interaction detection
    const okButton = document.getElementById('okButton');
    okButton.style.position = 'relative';
    okButton.style.zIndex = '10';

    return okButton;
}

function isHandNearButton(handCenter, buttonRect) {
    const handX = canvas.width - handCenter.x * canvas.width;
    const handY = handCenter.y * canvas.height;

    return (
        handX > buttonRect.left &&
        handX < buttonRect.right &&
        handY > buttonRect.top &&
        handY < buttonRect.bottom
    );
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

function calculatePalmSize(landmarks) {
    const wrist = landmarks[0];
    const middleBase = landmarks[9];

    // Distance between wrist and middle finger base
    const dx = wrist.x - middleBase.x;
    const dy = wrist.y - middleBase.y;
    return Math.sqrt(dx * dx + dy * dy); // Euclidean distance
}

function isDislikeSign(landmarks, handedness) {
    const thumbTip = landmarks[4]; // Thumb tip
    const thumbBase = landmarks[2]; // Base of thumb
    const wrist = landmarks[0]; // Wrist
  
    const thumbDown = thumbTip.y > wrist.y && thumbTip.y > thumbBase.y;
    const fingersFolded = handedness === "Right" ?
      landmarks[8].x > landmarks[5].x && // Index finger
      landmarks[12].x > landmarks[9].x && // Middle finger
      landmarks[16].x > landmarks[13].x && // Ring finger
      landmarks[20].x > landmarks[17].x // Pinky
      :
      landmarks[5].x > landmarks[8].x && // Index finger
      landmarks[9].x > landmarks[12].x && // Middle finger
      landmarks[13].x > landmarks[16].x && // Ring finger
      landmarks[17].x > landmarks[20].x; // Pinky
  
    return thumbDown && fingersFolded;
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
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
    });

    const okButton = createPrompt();
    const buttonRect = okButton.getBoundingClientRect();

    hands.onResults((results) => {
        if (redirectTriggered) return;

        if (!promptClosed) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (results.multiHandLandmarks.length === 1) {
                const landmarks = results.multiHandLandmarks[0];
                const palmCenter = calculatePalmCenter(landmarks);

                const mirroredLandmarks = landmarks.map((landmark) => ({
                    x: 1 - landmark.x,
                    y: landmark.y,
                    z: landmark.z,
                  }));

                const handConnections = [
                    [0, 1], [1, 2], [2, 3], [3, 4],
                    [2, 5], [5, 6], [6, 7], [7, 8],
                    [5, 9], [9, 10], [10, 11], [11, 12],
                    [9, 13], [13, 14], [14, 15], [15, 16],
                    [13, 17], [17, 18], [18, 19], [19, 20],
                    [0, 17], [5, 9], [9, 13], [13, 17]
                  ];
              
                  ctx.beginPath();
                  ctx.strokeStyle = 'green';
                  ctx.lineWidth = 2;
                  handConnections.forEach(([start, end]) => {
                    const startLandmark = mirroredLandmarks[start];
                    const endLandmark = mirroredLandmarks[end];
                    ctx.moveTo(startLandmark.x * canvas.width, startLandmark.y * canvas.height);
                    ctx.lineTo(endLandmark.x * canvas.width, endLandmark.y * canvas.height);
                  });
                  ctx.stroke();
              
                  mirroredLandmarks.forEach((landmark) => {
                    const x = landmark.x * canvas.width;
                    const y = landmark.y * canvas.height;
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, 2 * Math.PI);
                    ctx.fillStyle = 'red';
                    ctx.fill();
                  });

                if (isHandNearButton(palmCenter, buttonRect) && isFist(landmarks)) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    promptClosed = true;
                    drawing = true; // Enable drawing after prompt is closed
                    document.getElementById('instructionOverlay').remove();
                }
            }
        } else {
            if (!drawing) return;

            if (results.multiHandLandmarks.length === 1) {
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

                lastIsFist = isCurrentlyFist;
            } else if (results.multiHandLandmarks.length === 2) {
                if (isDislikeSign(results.multiHandLandmarks[0], results.multiHandedness[0].label) && isDislikeSign(results.multiHandLandmarks[1], results.multiHandedness[1].label)) {
                    redirectTriggered = true;
                    window.location.href = "index.html";
                }
            } else {
                lastIsFist = false; // Reset if no hands are detected
            }
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