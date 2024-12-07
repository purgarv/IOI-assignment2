const colors = ['red', 'blue', 'green'];
const shapes = ['circle', 'square'];

const scoreboard = document.getElementById('scoreboard');
const feedback = document.getElementById('feedback');
const feedbackSymbol = document.querySelector('#feedback .symbol');
const feedbackText = document.querySelector('#feedback .text');

let score = 0;
let draggedElement = null;
let shapeExists = false; // Tracks if a shape is currently on the screen

let isFist = false; // Tracks the hand state
let isOverShape = false; // Tracks if the hand is over a shape
let handX = 0, handY = 0; // Tracks hand position

// Create a canvas for overlaying video and landmarks
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
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

// Update the score display
function updateScore(points) {
  score += points;
  scoreboard.textContent = `Score: ${score}`;
}


function createRandomShape() {
  if (shapeExists) return; // Prevent new shapes from spawning if one already exists

  const shape = document.createElement('div');
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomShape = shapes[Math.floor(Math.random() * shapes.length)];

  shape.className = `shape ${randomShape}`;
  shape.style.backgroundColor = randomColor;

  // Shape spawn position
  shape.style.left = `${window.innerWidth / 2 - 25}px`;
  shape.style.top = `100px`;

  shape.dataset.color = randomColor;

  document.body.appendChild(shape);
  shapeExists = true;

  const updateShapePosition = () => {
    // check if the hand is over the shape
    const shapeRect = shape.getBoundingClientRect();
    isOverShape = Math.abs(handX - shapeRect.x) < 75 && Math.abs(handY - shapeRect.y) < 75;

    // console.log(isOverShape);


    if (isFist && !draggedElement && isOverShape) {
      draggedElement = shape;
    }
    else if (!isFist && draggedElement === shape) {
      checkPileDrop();
      draggedElement = null;
    }

    if (draggedElement) {
      draggedElement.style.left = `${handX - 25}px`;
      draggedElement.style.top = `${handY - 25}px`;
    }
    requestAnimationFrame(updateShapePosition);
  };

  updateShapePosition();
}

function checkPileDrop() {
  if (!draggedElement) return;

  const draggedRect = draggedElement.getBoundingClientRect();
  const piles = document.querySelectorAll('.pile');

  piles.forEach((pile) => {
    const pileRect = pile.getBoundingClientRect();
    const isOverlapping =
      draggedRect.left < pileRect.right &&
      draggedRect.right > pileRect.left &&
      draggedRect.top < pileRect.bottom &&
      draggedRect.bottom > pileRect.top;

    if (isOverlapping) {
      const draggedColor = draggedElement.dataset.color;
      const pileColor = pile.dataset.color;

      draggedElement.remove();
      shapeExists = false;

      if (draggedColor === pileColor) {
        updateScore(10);
        feedback.className = 'correct';
        feedbackSymbol.textContent = '✔';
        feedbackText.textContent = 'Correct!';
      } else {
        updateScore(-5);
        feedback.className = 'incorrect';
        feedbackSymbol.textContent = '✘';
        feedbackText.textContent = 'Incorrect!';
      }

      feedback.style.display = 'block';

      setTimeout(() => {
        feedback.style.display = 'none';
      }, 1000);

      createRandomShape();
    }
  });
}


function checkIfFist(landmarks) {
  // Check if all fingers are down
  const tips = [8, 12, 16, 20]; // Fingertips
  const base = [6, 10, 14, 18]; // Finger bases
  return tips.every((tip, i) => landmarks[tip].y > landmarks[base[i]].y);
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
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

hands.onResults((results) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

  // Draw the webcam frame on the canvas
  // ctx.save();
  // ctx.scale(-1, 1); // Mirror the video horizontally
  // ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height);
  // ctx.restore();

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
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'blue';
      ctx.fill();
    });

    ctx.beginPath();
    ctx.arc(handX, handY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();

    isFist = checkIfFist(mirroredLandmarks);

    // Update hand position for dragging
    handX = mirroredLandmarks[9].x * canvas.width;
    handY = mirroredLandmarks[9].y * canvas.height;

    // Move dragged shape
    if (isFist && draggedElement) {
      draggedElement.style.left = `${handX - 25}px`;
      draggedElement.style.top = `${handY - 25}px`;
    }
  }
});

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1920,
  height: 1080,
});
camera.start();

createRandomShape();
