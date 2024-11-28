
const canvas = document.getElementById('shapesCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Define game state
let currentShape = null;
const piles = [
    { x: canvas.width * 0.1 - 75, y: canvas.height - 150, width: 150, height: 150, type: 'circle', color: 'red' },
    { x: canvas.width * 0.5 - 75, y: canvas.height - 150, width: 150, height: 150, type: 'square', color: 'blue' },
    { x: canvas.width * 0.9 - 75, y: canvas.height - 150, width: 150, height: 150, type: 'triangle', color: 'green' }
];

let score = 0;
let isGrabbing = false;

// Generate a new shape in the center
function createShape() {
    const types = ['circle', 'square', 'triangle'];
    const type = types[Math.floor(Math.random() * types.length)];
    currentShape = { x: canvas.width / 2, y: canvas.height / 2, type, color: piles.find(p => p.type === type).color };
}

// Draw piles
function drawPiles() {
    piles.forEach(pile => {
        ctx.fillStyle = pile.color;
        ctx.fillRect(pile.x, pile.y, pile.width, pile.height);
        ctx.fillStyle = '#FFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(pile.type, pile.x + pile.width / 2, pile.y + pile.height / 2 + 5);
    });
}

// Draw the current shape
function drawShape(shape) {
    ctx.fillStyle = shape.color;
    if (shape.type === 'circle') {
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, 30, 0, Math.PI * 2);
        ctx.fill();
    } else if (shape.type === 'square') {
        ctx.fillRect(shape.x - 30, shape.y - 30, 60, 60);
    } else if (shape.type === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y - 30);
        ctx.lineTo(shape.x - 30, shape.y + 30);
        ctx.lineTo(shape.x + 30, shape.y + 30);
        ctx.closePath();
        ctx.fill();
    }
}

// Hand tracking
const hands = new Hands({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

const camera = new Camera(document.createElement('video'), {
    onFrame: async () => {
        await hands.send({ image: camera.video });
    },
    width: 640,
    height: 480
});

camera.start();

hands.onResults(results => {
    if (results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const indexFinger = landmarks[8];
        const thumb = landmarks[4];

        const x = indexFinger.x * canvas.width;
        const y = indexFinger.y * canvas.height;

        const dx = indexFinger.x - thumb.x;
        const dy = indexFinger.y - thumb.y;
        isGrabbing = Math.sqrt(dx * dx + dy * dy) < 0.1; // Close proximity indicates grabbing

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPiles();

        if (currentShape) {
            if (isGrabbing) {
                currentShape.x = x;
                currentShape.y = y;
            }
            drawShape(currentShape);

            piles.forEach(pile => {
                if (
                    currentShape.x > pile.x &&
                    currentShape.x < pile.x + pile.width &&
                    currentShape.y > pile.y &&
                    currentShape.y < pile.y + pile.height &&
                    currentShape.type === pile.type
                ) {
                    currentShape = null;
                    score += 1;
                    createShape();
                }
            });
        } else {
            createShape();
        }

        ctx.fillStyle = '#FFF';
        ctx.font = '30px Arial';
        ctx.fillText(`Score: ${score}`, 50, 50);
    }
});
