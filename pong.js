let redirectTriggered = false; // Flag to prevent multiple redirects

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

    console.log(handedness);
  
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

// Process hand landmarks
hands.onResults((results) => {
    isMediaPipeReady = true; // Mark MediaPipe as ready

    if (redirectTriggered) return;
    const landmarks = results.multiHandLandmarks;

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

// Draw the video background with transparency
function drawVideoBackground() {
    context.save();
    context.globalAlpha = 0.05;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();
    context.globalAlpha = 1.0;
}

// Draw the ball
function drawBall() {
    context.beginPath();
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.fillStyle = ball.color;
    context.fill();
    context.closePath();
}

// Draw paddles
function drawPaddle(paddle) {
    context.fillStyle = paddle.color;
    context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

// Draw the score
function drawScore() {
    context.fillStyle = "white";
    context.font = "48px Arial";
    context.textAlign = "center";
    context.fillText(`${leftScore} : ${rightScore}`, canvas.width / 2, 50);
}

// Move paddles smoothly
function movePaddles() {
    leftPaddle.targetY = Math.max(0, Math.min(leftHandY - paddleHeight / 2, canvas.height - paddleHeight));
    rightPaddle.targetY = Math.max(0, Math.min(rightHandY - paddleHeight / 2, canvas.height - paddleHeight));

    // Smoothly interpolate to the target positions
    leftPaddle.y += (leftPaddle.targetY - leftPaddle.y) * 0.2;
    rightPaddle.y += (rightPaddle.targetY - rightPaddle.y) * 0.2;
}

let lastTime = performance.now();
const baseBallSpeed = 300;

// Move the ball
function moveBall(dt) {
    if (ballIsResetting) return; // Don't move the ball if it's resetting

    const velocityX = (ball.speedX / Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2)) * baseBallSpeed * speedMultiplier;
    const velocityY = (ball.speedY / Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2)) * baseBallSpeed * speedMultiplier;

    ball.x += velocityX * dt;
    ball.y += velocityY * dt;

    // Ball collision with top and bottom boundaries
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius; // Prevent overlap
        ball.speedY *= -1;
    }
    if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius; // Prevent overlap
        ball.speedY *= -1;
    }

    // Ball collision with left paddle
    if (
        ball.x - ball.radius < leftPaddle.x + leftPaddle.width &&
        ball.y > leftPaddle.y &&
        ball.y < leftPaddle.y + leftPaddle.height &&
        ball.speedX < 0
    ) {
        ball.x = leftPaddle.x + leftPaddle.width + ball.radius; // Prevent ball sticking
        ball.speedX *= -1;
    }

    // Ball collision with right paddle
    if (
        ball.x + ball.radius > rightPaddle.x &&
        ball.y > rightPaddle.y &&
        ball.y < rightPaddle.y + rightPaddle.height &&
        ball.speedX > 0
    ) {
        ball.x = rightPaddle.x - ball.radius; // Prevent ball sticking
        ball.speedX *= -1;
    }

    // Ball out of bounds
    if (ball.x < 0) {
        rightScore++;
        resetBall();
    }
    if (ball.x > canvas.width) {
        leftScore++;
        resetBall();
    }

    // Gradually increase speed multiplier
    speedMultiplier += speedIncreaseRate * dt;
}

// Reset the ball and speed multiplier
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = 0; // Temporarily set speed to 0
    ball.speedY = 0;
    speedMultiplier = 1; // Reset speed multiplier

    ballIsResetting = true; // Prevent ball movement during reset

    // After a short delay, set a random direction for the ball
    setTimeout(() => {
        ball.speedX = Math.random() > 0.5 ? 1 : -1;
        ball.speedY = Math.random() > 0.5 ? 1 : -1;
        ballIsResetting = false; // Allow ball to move
    }, 2000); // 2-second delay
}

// Render game elements
function render() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    drawVideoBackground();
    drawPaddle(leftPaddle);
    drawPaddle(rightPaddle);
    drawBall();
    drawScore();
}

// Game loop
function gameLoop(timestamp) {
    if (!isMediaPipeReady) {
        requestAnimationFrame(gameLoop); // Wait until MediaPipe is ready
        return;
    }

    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    movePaddles();
    moveBall(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// Start the game
resetBall();
requestAnimationFrame(gameLoop);
