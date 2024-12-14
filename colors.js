const colors = [
  'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet',
  'pink', 'cyan', 'magenta', 'lime', 'teal', 'brown', 'black', 'white'
];

const scoreboard = document.getElementById('scoreboard');
const feedback = document.getElementById('feedback');
const feedbackSymbol = document.querySelector('#feedback .symbol');
const feedbackText = document.querySelector('#feedback .text');
const pilesContainer = document.querySelector('.piles-container');

let score = 0;
let colorExists = false; // Tracks if a color name is currently displayed
let correctPileColor = null;
let highlightedPile = null;
let isPaused = false;
let redirectTriggered = false; // Flag to prevent multiple redirects

// Sounds for feedback
const correctSound = new Audio('correct.mp3'); // Add correct sound file path
const incorrectSound = new Audio('incorrect.mp3'); // Add incorrect sound file path


let isFist = false; // Tracks the hand state
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

function displayRandomColorName() {
  if (colorExists) return; // Prevent a new color from being displayed if one already exists

  // Select a random color
  correctPileColor = colors[Math.floor(Math.random() * colors.length)];

  // Create and style the color name display
  const colorNameElement = document.createElement('div');
  colorNameElement.className = 'color-name';
  colorNameElement.textContent = correctPileColor.toUpperCase();
  colorNameElement.style.fontSize = '48px';
  colorNameElement.style.fontWeight = 'bold';
  colorNameElement.style.textAlign = 'center';
  colorNameElement.style.margin = '50px auto';

  document.body.appendChild(colorNameElement);
  colorExists = true;

  // Announce the color name using the Web Speech API
  const utterance = new SpeechSynthesisUtterance(correctPileColor);
  window.speechSynthesis.speak(utterance);
}

function checkPileSelection(selectedPile) {
  if (isPaused) return; // Prevent selecting piles during the pause

  const pileColor = selectedPile.dataset.color;

  if (pileColor === correctPileColor) {
    updateScore(10);
    feedback.className = 'correct';
    feedbackSymbol.textContent = '✔';
    feedbackText.textContent = 'Correct!';
    correctSound.play(); // Play correct sound
  } else {
    updateScore(-5);
    feedback.className = 'incorrect';
    feedbackSymbol.textContent = '✘';
    feedbackText.textContent = 'Incorrect!';
    incorrectSound.play(); // Play incorrect sound
  }

  feedback.style.display = 'block';

  setTimeout(() => {
    feedback.style.display = 'none';
  }, 1000);

  // Pause for 1 second before generating a new color
  isPaused = true;

  setTimeout(() => {
    // Remove the current color name and generate a new one
    document.querySelector('.color-name').remove();
    colorExists = false;

    displayRandomColorName();
    randomizePiles();

    isPaused = false; // Resume interaction
  }, 1000);
}

function randomizePiles() {
  pilesContainer.innerHTML = ''; // Clear existing piles

  // Ensure one pile is the correct color
  const pileColors = [correctPileColor];

  // Add two more random incorrect colors
  const incorrectColors = colors.filter(color => color !== correctPileColor);
  const randomIncorrectColors = incorrectColors.sort(() => 0.5 - Math.random()).slice(0, 2);
  pileColors.push(...randomIncorrectColors);

  // Shuffle the pile colors
  pileColors.sort(() => 0.5 - Math.random());

  pileColors.forEach((color) => {
    const pile = document.createElement('div');
    pile.className = `pile`;
    pile.style.backgroundColor = color; // Set pile background to the color
    pile.style.width = '150px';
    pile.style.height = '150px';
    pile.style.margin = '20px';
    pile.style.display = 'inline-block';
    pile.style.cursor = 'pointer';
    pile.dataset.color = color;

    // Add click event to check pile selection
    pile.addEventListener('click', () => checkPileSelection(pile));

    pilesContainer.appendChild(pile);
  });
}

function checkIfFist(landmarks) {
  // Check if all fingers are down
  const tips = [8, 12, 16, 20]; // Fingertips
  const base = [6, 10, 14, 18]; // Finger bases
  return tips.every((tip, i) => landmarks[tip].y > landmarks[base[i]].y);
}

function isDislikeSign(landmarks, handedness) {
  // Detect "thumbs down" gesture
  const thumbTip = landmarks[4]; // Thumb tip
  const thumbBase = landmarks[2]; // Base of thumb
  const wrist = landmarks[0]; // Wrist

  // Thumb is below the wrist
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

// Function to highlight the pile the user's hand is over
function highlightPile(hoveredPile) {
  // Remove highlight from the previously highlighted pile
  if (highlightedPile) {
    highlightedPile.style.border = 'none';
    highlightedPile.style.boxShadow = 'none';
  }

  // Highlight the new pile
  if (hoveredPile) {
    hoveredPile.style.border = '3px solid yellow';
    hoveredPile.style.boxShadow = '0 0 15px 5px rgba(255, 255, 0, 0.7)';
  }

  highlightedPile = hoveredPile;
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

hands.onResults((results) => {
  if (redirectTriggered) return;

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

    if (isDislikeSign(landmarks, results.multiHandedness[0].label)) {
      redirectTriggered = true;
      window.location.href = "index.html";
    }

    // Update hand position
    handX = mirroredLandmarks[9].x * canvas.width;
    handY = mirroredLandmarks[9].y * canvas.height;

    // Check if the hand is over a pile
    const piles = document.querySelectorAll('.pile');
    let hoveredPile = null;

    piles.forEach((pile) => {
      const rect = pile.getBoundingClientRect();
      if (
        handX >= rect.left &&
        handX <= rect.right &&
        handY >= rect.top &&
        handY <= rect.bottom
      ) {
        hoveredPile = pile;
      }
    });

    highlightPile(hoveredPile);

    // If a fist is made and the hand is over a pile, select the pile
    if (isFist && hoveredPile) {
      checkPileSelection(hoveredPile);
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

// Initialize the game
displayRandomColorName();
randomizePiles();
