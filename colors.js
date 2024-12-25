// Add language options
const colors = [
  'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet',
  'pink', 'cyan', 'magenta', 'lime', 'teal', 'brown', 'black', 'white'
];

const languages = [
  { name: 'angleščina', code: 'en', flag: 'img/england.png' },
  { name: 'nemščina', code: 'de', flag: 'img/germany.jpg' },
  { name: 'italijanščina', code: 'it', flag: 'img/italy.png' }
];

let selectedLanguage = 'en';
let score = 0;
let colorExists = false;
let correctPileColor = null;
let highlightedPile = null;
let isPaused = false;
let redirectTriggered = false;

const scoreboard = document.getElementById('scoreboard');
const feedback = document.getElementById('feedback');
const feedbackSymbol = document.querySelector('#feedback .symbol');
const feedbackText = document.querySelector('#feedback .text');
const pilesContainer = document.querySelector('.piles-container');

const correctSound = new Audio('correct.mp3');
const incorrectSound = new Audio('incorrect.mp3');

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.zIndex = '-1';
canvas.style.opacity = '0.7';
document.body.appendChild(canvas);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const videoElement = document.createElement('video');
videoElement.style.display = 'none';
document.body.appendChild(videoElement);

const menu = document.createElement('div');
menu.className = 'menu';
menu.style.position = 'absolute';
menu.style.top = '50%';
menu.style.left = '50%';
menu.style.transform = 'translate(-50%, -50%)';
menu.style.display = 'flex';
menu.style.flexDirection = 'column';
menu.style.alignItems = 'center';
menu.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
menu.style.padding = '50px';
menu.style.borderRadius = '20px';

const menuTitle = document.createElement('h1');
menuTitle.textContent = 'Izberite jezik';
menuTitle.style.color = 'white';
menuTitle.style.marginBottom = '40px';
menuTitle.style.fontSize = '36px';
menu.appendChild(menuTitle);

const optionsContainer = document.createElement('div');
optionsContainer.style.display = 'flex';
optionsContainer.style.gap = '50px';
menu.appendChild(optionsContainer);

languages.forEach((language) => {
  const option = document.createElement('div');
  option.className = 'menu-option';
  option.style.display = 'flex';
  option.style.flexDirection = 'column';
  option.style.alignItems = 'center';
  option.style.cursor = 'pointer';
  option.dataset.language = language.code;

  const flag = document.createElement('img');
  flag.src = language.flag;
  flag.style.width = '150px';
  flag.style.height = '90px';

  const label = document.createElement('span');
  label.textContent = language.name;
  label.style.color = 'white';
  label.style.marginTop = '20px';
  label.style.fontSize = '24px';

  option.appendChild(flag);
  option.appendChild(label);

  optionsContainer.appendChild(option);
});

document.body.appendChild(menu);

function updateScore(points) {
  score += points;
  scoreboard.textContent = `Score: ${score}`;
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

function highlightOption(option) {
  if (highlightedPile) {
    highlightedPile.style.border = 'none';
    highlightedPile.style.scale = 1;
  }
  if (option) {
    option.style.border = '3px solid yellow';
    option.style.scale = 1.2;
  }
  highlightedPile = option;
}

function confirmLanguageSelection() {
  if (highlightedPile) {
    selectedLanguage = highlightedPile.dataset.language;
    menu.style.display = 'none';
    displayRandomColorName();
    randomizePiles();
  }
}

function displayRandomColorName() {
  if (colorExists) return;

  correctPileColor = colors[Math.floor(Math.random() * colors.length)];

  const translations = {
    en: {
      red: 'red', orange: 'orange', yellow: 'yellow', green: 'green', blue: 'blue', indigo: 'indigo', violet: 'violet', pink: 'pink', cyan: 'cyan', magenta: 'magenta', lime: 'lime', teal: 'teal', brown: 'brown', black: 'black', white: 'white'
    },
    de: {
      red: 'rot', orange: 'orange', yellow: 'gelb', green: 'grün', blue: 'blau', indigo: 'indigo', violet: 'violett', pink: 'rosa', cyan: 'cyan', magenta: 'magenta', lime: 'limette', teal: 'blaugrün', brown: 'braun', black: 'schwarz', white: 'weiß'
    },
    it: {
      red: 'rosso', orange: 'arancione', yellow: 'giallo', green: 'verde', blue: 'blu', indigo: 'indaco', violet: 'viola', pink: 'rosa', cyan: 'ciano', magenta: 'magenta', lime: 'lime', teal: 'verde acqua', brown: 'marrone', black: 'nero', white: 'bianco'
    }
  };

  const translatedColor = translations[selectedLanguage][correctPileColor];

  const colorNameElement = document.createElement('div');
  colorNameElement.className = 'color-name';
  colorNameElement.textContent = translatedColor.toUpperCase();
  colorNameElement.style.fontSize = '48px';
  colorNameElement.style.fontWeight = 'bold';
  colorNameElement.style.textAlign = 'center';
  colorNameElement.style.margin = '50px auto';

  document.body.appendChild(colorNameElement);
  colorExists = true;

  responsiveVoice.speak(translatedColor, selectedLanguage === 'en' ? 'UK English Female' : selectedLanguage === 'de' ? 'Deutsch Female' : 'Italian Female');
}

function checkPileSelection(selectedPile) {
  if (isPaused) return;

  const pileColor = selectedPile.dataset.color;

  if (pileColor === correctPileColor) {
    updateScore(10);
    feedback.className = 'correct';
    feedbackSymbol.textContent = '✔';
    feedbackText.textContent = 'Correct!';
    correctSound.play();
  } else {
    updateScore(-5);
    feedback.className = 'incorrect';
    feedbackSymbol.textContent = '✘';
    feedbackText.textContent = 'Incorrect!';
    incorrectSound.play();
  }

  feedback.style.display = 'block';

  setTimeout(() => {
    feedback.style.display = 'none';
  }, 1000);

  isPaused = true;

  setTimeout(() => {
    document.querySelector('.color-name').remove();
    colorExists = false;

    displayRandomColorName();
    randomizePiles();

    isPaused = false;
  }, 1000);
}

function randomizePiles() {
  pilesContainer.innerHTML = '';

  const pileColors = [correctPileColor];
  const incorrectColors = colors.filter(color => color !== correctPileColor);
  const randomIncorrectColors = incorrectColors.sort(() => 0.5 - Math.random()).slice(0, 2);
  pileColors.push(...randomIncorrectColors);
  pileColors.sort(() => 0.5 - Math.random());

  pileColors.forEach((color) => {
    const pile = document.createElement('div');
    pile.className = 'pile';
    pile.style.backgroundColor = color;
    pile.style.width = '150px';
    pile.style.height = '150px';
    pile.style.margin = '20px';
    pile.style.display = 'inline-block';
    pile.style.cursor = 'pointer';
    pile.dataset.color = color;

    pile.addEventListener('click', () => checkPileSelection(pile));

    pilesContainer.appendChild(pile);
  });
}

function checkIfFist(landmarks) {
  const tips = [8, 12, 16, 20];
  const base = [6, 10, 14, 18];
  return tips.every((tip, i) => landmarks[tip].y > landmarks[base[i]].y);
}

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5,
});

// Function to highlight the pile the user's hand is over
function highlightPile(hoveredPile) {
  // Remove highlight from the previously highlighted pile
  if (highlightedPile) {
    highlightedPile.style.border = '3px solid black';
    highlightedPile.style.boxShadow = 'none';
    highlightedPile.style.scale = 1;
  }

  // Highlight the new pile
  if (hoveredPile) {
    hoveredPile.style.border = '3px solid black';
    hoveredPile.style.boxShadow = '0 0 15px 5px rgba(255, 255, 0, 0.7)';
    hoveredPile.style.scale = 1.4;
  }

  highlightedPile = hoveredPile;
}

hands.onResults((results) => {
  if (menu.style.display !== 'none') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      const mirroredLandmarks = landmarks.map((landmark) => ({
        x: 1 - landmark.x,
        y: landmark.y,
        z: landmark.z
      }));

      handX = mirroredLandmarks[9].x * canvas.width;
      handY = mirroredLandmarks[9].y * canvas.height;

      const options = document.querySelectorAll('.menu-option');
      let hoveredOption = null;

      options.forEach((option) => {
        const rect = option.getBoundingClientRect();
        if (
          handX >= rect.left &&
          handX <= rect.right &&
          handY >= rect.top &&
          handY <= rect.bottom
        ) {
          hoveredOption = option;
        }
      });

      if (isDislikeSign(mirroredLandmarks, results.multiHandedness[0].label)) {
        redirectTriggered = true;
        window.location.href = "index.html";
      }

      highlightOption(hoveredOption);

      if (checkIfFist(mirroredLandmarks) && hoveredOption) {
        confirmLanguageSelection();
      }

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
        ctx.fillStyle = 'blue';
        ctx.fill();
      });

      ctx.beginPath();
      ctx.arc(handX, handY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();

    }
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

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
      ctx.fillStyle = 'blue';
      ctx.fill();
    });

    ctx.beginPath();
    ctx.arc(handX, handY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();

    if (isDislikeSign(mirroredLandmarks, results.multiHandedness[0].label)) {
      redirectTriggered = true;
      window.location.href = "index.html";
    }

    isFist = checkIfFist(mirroredLandmarks);

    handX = mirroredLandmarks[9].x * canvas.width;
    handY = mirroredLandmarks[9].y * canvas.height;

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
