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

// Mediapipe Hands setup
const video = document.createElement("video");
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
    },
    width: 1920,
    height: 1080
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
            // If only one hand is detected, decide its role based on its position
            const singleHand = landmarks[0];
            const handX = singleHand[8].x * canvas.width; // x-coordinate of the wrist
            const handY = singleHand[8].y * canvas.height;

            if (handX < canvas.width / 2) {
                rightHandY = handY - paddleHeight / 2;
            } else {
                leftHandY = handY - paddleHeight / 2;
            }
        } else if (landmarks.length === 2) {
            // If two hands are detected, assign them to paddles based on x-coordinate
            const hand1 = landmarks[0];
            const hand2 = landmarks[1];

            const hand1X = hand1[8].x * canvas.width;
            const hand1Y = hand1[8].y * canvas.height;

            const hand2X = hand2[8].x * canvas.width;
            const hand2Y = hand2[8].y * canvas.height;

            if (hand1X < hand2X) {
                // Hand 1 is on the left
                rightHandY = hand1Y - paddleHeight / 2;
                leftHandY = hand2Y - paddleHeight / 2;
            } else {
                // Hand 2 is on the left
                rightHandY = hand2Y - paddleHeight / 2;
                leftHandY = hand1Y - paddleHeight / 2;
            }
        }
    }
});

// Draw the video background with transparency
function drawVideoBackground() {
    context.save(); // Save the current state
    context.globalAlpha = 0.05; // Set transparency for the video

    // Mirror the video
    context.translate(canvas.width, 0);
    context.scale(-1, 1);

    // Draw the video
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    context.restore(); // Restore the state to normal
    context.globalAlpha = 1.0; // Reset transparency for other elements
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
    // Constrain paddles to the canvas
    leftPaddle.y = Math.max(0, Math.min(leftHandY, canvas.height - paddleHeight));
    rightPaddle.y = Math.max(0, Math.min(rightHandY, canvas.height - paddleHeight));
}

// Move the ball
function moveBall() {
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Ball collision with top and bottom walls
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.speedY *= -1;
    }

    // Ball collision with paddles
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

    // Reset ball position and update score if it goes out of bounds
    if (ball.x < 0) {
        rightScore++;
        resetBall();
    }
    if (ball.x > canvas.width) {
        leftScore++;
        resetBall();
    }
}

// Reset the ball to the center
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX *= -1; // Reverse direction
    ball.speedY = (Math.random() > 0.5 ? 1 : -1) * 5; // Randomize vertical direction
}

// Render game elements
function render() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video background
    drawVideoBackground();

    // Draw paddles, ball, and score
    drawPaddle(leftPaddle);
    drawPaddle(rightPaddle);
    drawBall();
    drawScore();
}

// Game loop
function gameLoop() {
    movePaddles();
    moveBall();
    render();

    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
