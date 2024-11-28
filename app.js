const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('overlay');
const canvasCtx = canvasElement.getContext('2d');

let redirectTriggered = false; // Flag to prevent multiple redirects

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

function countFingers(landmarks) {
    const tips = [4, 8, 12, 16, 20];
    const base = [2, 6, 10, 14, 18];
    let count = 0;

    // Check thumb
    const thumbTip = landmarks[4];
    const thumbBase = landmarks[2];
    const wrist = landmarks[0]; // Wrist landmark as reference
    if (thumbTip.x > wrist.x && thumbTip.y < thumbBase.y) { 
        count++;
    }

    // Check other fingers
    for (let i = 1; i < tips.length; i++) {
        if (landmarks[tips[i]].y < landmarks[base[i]].y) {
            count++;
        }
    }

    return count;
}


function drawLandmarks(landmarks, handIndex) {
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

function chooseGame(handCounts) {
    if (redirectTriggered) return; // Prevent multiple redirects

    if (handCounts.some(count => count === 1)) {
        redirectTriggered = true;
        window.location.href = './draw.html';
    } else if (handCounts.some(count => count === 2)) {
        redirectTriggered = true;
        window.location.href = './math.html';
    } else if (handCounts.some(count => count === 3)) {
        redirectTriggered = true;
        window.location.href = './pong.html';
    } else if (handCounts.some(count => count === 4)) {
        redirectTriggered = true;
        window.location.href = './shapes.html';
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
                drawLandmarks(landmarks, index);

                const fingerCount = countFingers(landmarks);
                handCounts.push(fingerCount);
            });

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
