let redirectTriggered = false; // Flag to prevent multiple redirects
let promptClosed = false; // To track if the prompt is closed

const canvas = document.getElementById("pongCanvas");
const context = canvas.getContext("2d");

// Set canvas dimensions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Ball properties
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speedX: 5,
    speedY: 5,
    color: "white",
};

// Paddle properties
const paddleWidth = 10;
const paddleHeight = 100;
const paddleSpeed = 15; // Max speed of paddle movement

const leftPaddle = {
    x: 20,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: "white",
    targetY: canvas.height / 2 - paddleHeight / 2,
};

const rightPaddle = {
    x: canvas.width - 30,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: "white",
    targetY: canvas.height / 2 - paddleHeight / 2,
};

// Scores
let leftScore = 0;
let rightScore = 0;

// Speed multiplier to make the ball faster over time
let speedMultiplier = 1;
const speedIncreaseRate = 0.05; // Rate at which speed increases
let ballIsResetting = false; // Flag to prevent ball movement during reset

// Mediapipe Hands setup
const video = document.createElement("video");
let isMediaPipeReady = false; // Flag for MediaPipe readiness

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
});

const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
    },
    width: 640,
    height: 480,
});
camera.start();

// Variables to store hand positions
let leftHandY = canvas.height / 2;
let rightHandY = canvas.height / 2;

function isDislikeSign(landmarks, handedness) {
    const thumbTip = landmarks[4]; // Thumb tip
    const thumbBase = landmarks[2]; // Base of thumb
    const wrist = landmarks[0]; // Wrist

    const thumbDown = thumbTip.y > wrist.y && thumbTip.y > thumbBase.y;
    const fingersFolded = handedness === "Right"
        ? landmarks[8].x > landmarks[5].x && // Index finger
        landmarks[12].x > landmarks[9].x && // Middle finger
        landmarks[16].x > landmarks[13].x && // Ring finger
        landmarks[20].x > landmarks[17].x // Pinky
        : landmarks[5].x > landmarks[8].x && // Index finger
        landmarks[9].x > landmarks[12].x && // Middle finger
        landmarks[13].x > landmarks[16].x && // Ring finger
        landmarks[17].x > landmarks[20].x; // Pinky

    return thumbDown && fingersFolded;
}

function isFist(landmarks) {
    const tips = [8, 12, 16, 20];
    const base = [6, 10, 14, 18];
    return tips.every((tip, i) => landmarks[tip].y > landmarks[base[i]].y);
}

function calculatePalmCenter(landmarks) {
    const points = [0, 5, 9, 13, 17];
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
        <h1>Pong</h1>
        <p>S premikanjem rok nadzirate lopar.</p>
        <p>Za vrnitev na glavni meni naredite 👎 z obema rokama.</p>
        <p>Za nadaljevanje držite roko nad OK in naredite pest.</p>
        <button id="okButton" style="margin-top: 20px; padding: 10px 20px; font-size: 24px; cursor: pointer;">OK</button>
    `;
    document.body.appendChild(overlay);

    const okButton = document.getElementById('okButton');
    okButton.style.position = 'relative';
    okButton.style.zIndex = '10';

    return okButton;
}

hands.onResults((results) => {
    isMediaPipeReady = true; // Mark MediaPipe as ready

    if (redirectTriggered) return;
    const landmarks = results.multiHandLandmarks;

    if (!promptClosed) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        if (landmarks.length === 1) {
            const palmCenter = calculatePalmCenter(landmarks[0]);
            const palmX = canvas.width - palmCenter.x * canvas.width;
            const palmY = palmCenter.y * canvas.height;

            const okButton = document.getElementById('okButton');
            const buttonRect = okButton.getBoundingClientRect();

            const mirroredLandmarks = landmarks[0].map((landmark) => ({
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

            context.beginPath();
            context.strokeStyle = 'green';
            context.lineWidth = 2;
            handConnections.forEach(([start, end]) => {
                const startLandmark = mirroredLandmarks[start];
                const endLandmark = mirroredLandmarks[end];
                context.moveTo(startLandmark.x * canvas.width, startLandmark.y * canvas.height);
                context.lineTo(endLandmark.x * canvas.width, endLandmark.y * canvas.height);
            });
            context.stroke();

            mirroredLandmarks.forEach((landmark) => {
                const x = landmark.x * canvas.width;
                const y = landmark.y * canvas.height;
                context.beginPath();
                context.arc(x, y, 5, 0, 2 * Math.PI);
                context.fillStyle = 'red';
                context.fill();
            });

            if (
                palmX > buttonRect.left &&
                palmX < buttonRect.right &&
                palmY > buttonRect.top &&
                palmY < buttonRect.bottom &&
                isFist(landmarks[0])
            ) {
                context.clearRect(0, 0, canvas.width, canvas.height);
                promptClosed = true;
                document.getElementById('instructionOverlay').remove();
                resetBall();
                requestAnimationFrame(gameLoop);
            }
        }
        return;
    }

    if (landmarks.length > 0) {
        if (landmarks.length === 1) {
            const singleHand = landmarks[0];
            const handY = singleHand[8].y * canvas.height;

            rightHandY = handY;
            leftHandY = handY;

        } else if (landmarks.length === 2) {
            if (isDislikeSign(landmarks[0], results.multiHandedness[0].label) && isDislikeSign(landmarks[1], results.multiHandedness[1].label)) {
                redirectTriggered = true;
                window.location.href = "index.html";
            }

            const hand1 = landmarks[0];
            const hand2 = landmarks[1];

            const hand1X = hand1[8].x * canvas.width;
            const hand1Y = hand1[8].y * canvas.height;

            const hand2X = hand2[8].x * canvas.width;
            const hand2Y = hand2[8].y * canvas.height;

            if (hand1X < hand2X) {
                rightHandY = hand1Y;
                leftHandY = hand2Y;
            } else {
                rightHandY = hand2Y;
                leftHandY = hand1Y;
            }
        }
    }
});

function drawVideoBackground() {
    context.save();
    context.globalAlpha = 0.05;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();
    context.globalAlpha = 1.0;
}

function drawBall() {
    context.beginPath();
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.fillStyle = ball.color;
    context.fill();
    context.closePath();
}

function drawPaddle(paddle) {
    context.fillStyle = paddle.color;
    context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawScore() {
    context.fillStyle = "white";
    context.font = "48px Arial";
    context.textAlign = "center";
    context.fillText(`${leftScore} : ${rightScore}`, canvas.width / 2, 50);
}

function movePaddles() {
    leftPaddle.targetY = Math.max(0, Math.min(leftHandY - paddleHeight / 2, canvas.height - paddleHeight));
    rightPaddle.targetY = Math.max(0, Math.min(rightHandY - paddleHeight / 2, canvas.height - paddleHeight));

    leftPaddle.y += (leftPaddle.targetY - leftPaddle.y) * 0.2;
    rightPaddle.y += (rightPaddle.targetY - rightPaddle.y) * 0.2;
}

let lastTime = performance.now();
const baseBallSpeed = 300;

function moveBall(dt) {
    if (ballIsResetting || !promptClosed) return;

    const velocityX = (ball.speedX / Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2)) * baseBallSpeed * speedMultiplier;
    const velocityY = (ball.speedY / Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2)) * baseBallSpeed * speedMultiplier;

    ball.x += velocityX * dt;
    ball.y += velocityY * dt;

    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.speedY *= -1;
    }
    if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.speedY *= -1;
    }

    if (
        ball.x - ball.radius < leftPaddle.x + leftPaddle.width &&
        ball.y > leftPaddle.y &&
        ball.y < leftPaddle.y + leftPaddle.height &&
        ball.speedX < 0
    ) {
        ball.x = leftPaddle.x + leftPaddle.width + ball.radius;
        ball.speedX *= -1;
    }

    if (
        ball.x + ball.radius > rightPaddle.x &&
        ball.y > rightPaddle.y &&
        ball.y < rightPaddle.y + rightPaddle.height &&
        ball.speedX > 0
    ) {
        ball.x = rightPaddle.x - ball.radius;
        ball.speedX *= -1;
    }

    if (ball.x < 0) {
        rightScore++;
        resetBall();
    }
    if (ball.x > canvas.width) {
        leftScore++;
        resetBall();
    }

    speedMultiplier += speedIncreaseRate * dt;
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = 0;
    ball.speedY = 0;
    speedMultiplier = 1;

    ballIsResetting = true;

    setTimeout(() => {
        ball.speedX = Math.random() > 0.5 ? 1 : -1;
        ball.speedY = Math.random() > 0.5 ? 1 : -1;
        ballIsResetting = false;
    }, 2000);
}

function render() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawVideoBackground();
    drawPaddle(leftPaddle);
    drawPaddle(rightPaddle);
    drawBall();
    drawScore();
}

function gameLoop(timestamp) {
    if (!isMediaPipeReady || !promptClosed) {
        requestAnimationFrame(gameLoop);
        return;
    }

    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    movePaddles();
    moveBall(dt);
    render();

    requestAnimationFrame(gameLoop);
}

createPrompt();
