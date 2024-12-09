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
    color: "white"
};

// Paddle properties
const paddleWidth = 10;
const paddleHeight = 100;

const leftPaddle = {
    x: 20,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: "white"
};

const rightPaddle = {
    x: canvas.width - 30,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: "white"
};

// Scores
let leftScore = 0;
let rightScore = 0;

// Speed multiplier to make the ball faster over time
let speedMultiplier = 1;
const speedIncreaseRate = 0.05; // Rate at which speed increases

// Mediapipe Hands setup
const video = document.createElement("video");
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
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

// Process hand landmarks
hands.onResults((results) => {
    const landmarks = results.multiHandLandmarks;

    if (landmarks.length > 0) {
        if (landmarks.length === 1) {
            const singleHand = landmarks[0];
            const handX = singleHand[8].x * canvas.width;
            const handY = singleHand[8].y * canvas.height;

            if (handX < canvas.width / 2) {
                rightHandY = handY - paddleHeight / 2;
            } else {
                leftHandY = handY - paddleHeight / 2;
            }
        } else if (landmarks.length === 2) {
            const hand1 = landmarks[0];
            const hand2 = landmarks[1];

            const hand1X = hand1[8].x * canvas.width;
            const hand1Y = hand1[8].y * canvas.height;

            const hand2X = hand2[8].x * canvas.width;
            const hand2Y = hand2[8].y * canvas.height;

            if (hand1X < hand2X) {
                rightHandY = hand1Y - paddleHeight / 2;
                leftHandY = hand2Y - paddleHeight / 2;
            } else {
                rightHandY = hand2Y - paddleHeight / 2;
                leftHandY = hand1Y - paddleHeight / 2;
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

// Move paddles based on hand positions
function movePaddles() {
    leftPaddle.y = Math.max(0, Math.min(leftHandY, canvas.height - paddleHeight));
    rightPaddle.y = Math.max(0, Math.min(rightHandY, canvas.height - paddleHeight));
}

let lastTime = performance.now();
const baseBallSpeed = 300;

// Move the ball
function moveBall(dt) {
    const velocityX = (ball.speedX / Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2)) * baseBallSpeed * speedMultiplier;
    const velocityY = (ball.speedY / Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2)) * baseBallSpeed * speedMultiplier;

    ball.x += velocityX * dt;
    ball.y += velocityY * dt;

    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.speedY *= -1;
    }

    if (
        ball.x - ball.radius < leftPaddle.x + leftPaddle.width &&
        ball.y > leftPaddle.y &&
        ball.y < leftPaddle.y + leftPaddle.height
    ) {
        ball.speedX *= -1;
    }
    if (
        ball.x + ball.radius > rightPaddle.x &&
        ball.y > rightPaddle.y &&
        ball.y < rightPaddle.y + rightPaddle.height
    ) {
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

    speedMultiplier += speedIncreaseRate * dt; // Gradually increase speed
}

// Reset the ball and speed multiplier
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = Math.random() > 0.5 ? 1 : -1;
    ball.speedY = Math.random() > 0.5 ? 1 : -1;
    speedMultiplier = 1; // Reset speed multiplier
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
