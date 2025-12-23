const lines = [
  "To point to a place, to say there is to make a circle.",
  "To make a circle there is to make a place a hole.",
  "To make there a hole is to make a way out.",
  "To make a way out of grief, there is a hole.",
  "To make a hole there is to make distance.",
  "To make distance, there must be bodies.",
  "There must be at least two bodies there.",
  "To encircle multiple bodies in the there.",
  "In the there, the hole filled with bodies.",
  "To point and say there is nothing.",
  "To point away from yourself.",
  "To say there, there."
];

let clickedStates = new Array(lines.length).fill(false);
let hoveredLine = -1;
let currentPositions = []; // Current x positions for animation
let targetPositions = []; // Target x positions
const animationSpeed = 0.1; // Smoothness factor (0-1, lower is smoother)

function setup() {
  createCanvas(windowWidth, windowHeight);
  textSize(18);
  textFont('Times New Roman');
  
  // Initialize positions
  for (let i = 0; i < lines.length; i++) {
    const pos = calculatePosition(i);
    currentPositions.push(pos.x);
    targetPositions.push(pos.x);
  }
}

function draw() {
  background(255);
  
  const lineHeight = 43;
  const totalHeight = (lines.length - 1) * lineHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const startY = centerY - totalHeight / 2;
  
  // Check for hover
  hoveredLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight;
    const textWidthApprox = textWidth(lines[i]);
    
    if (mouseY > y - lineHeight / 2 && mouseY < y + lineHeight / 2) {
      if (mouseX > currentPositions[i] && mouseX < currentPositions[i] + textWidthApprox) {
        hoveredLine = i;
        break;
      }
    }
  }
  
  // Update cursor
  if (hoveredLine !== -1) {
    cursor('pointer');
  } else {
    cursor('default');
  }
  
  // Update target positions based on clicked state
  for (let i = 0; i < lines.length; i++) {
    if (clickedStates[i]) {
      targetPositions[i] = centerX; // Move to center (12 o'clock)
    } else {
      const pos = calculatePosition(i);
      targetPositions[i] = pos.x; // Return to semicircle position
    }
  }
  
  // Animate current positions toward targets
  for (let i = 0; i < lines.length; i++) {
    currentPositions[i] += (targetPositions[i] - currentPositions[i]) * animationSpeed;
  }
  
  // Draw lines
    for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight;
    
    push();
    textAlign(LEFT, CENTER);
    
    // Split line into words and draw each one
    let words = lines[i].split(' ');
    let xOffset = 0;
    for (let w = 0; w < words.length; w++) {
      if (words[w].toLowerCase().includes('there')) {
        textStyle(ITALIC);
      } else {
        textStyle(NORMAL);
      }
      text(words[w] + ' ', currentPositions[i] + xOffset, y);
      xOffset += textWidth(words[w] + ' ');
    }
    
    pop();
  }
}

function calculatePosition(index) {
  const lineHeight = 43;
  const radius = 250;
  const totalHeight = (lines.length - 1) * lineHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const startY = centerY - totalHeight / 2;
  
  const y = startY + index * lineHeight;
  const dy = y - centerY;
  
  let x = centerX;
  if (Math.abs(dy) <= radius) {
    x = centerX + Math.sqrt(radius * radius - dy * dy);
  }
  
  return { x, y };
}

function mousePressed() {
  if (hoveredLine !== -1) {
    clickedStates[hoveredLine] = !clickedStates[hoveredLine];
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Recalculate positions on resize
  for (let i = 0; i < lines.length; i++) {
    if (!clickedStates[i]) {
      const pos = calculatePosition(i);
      currentPositions[i] = pos.x;
      targetPositions[i] = pos.x;
    } else {
      targetPositions[i] = width / 2;
    }
  }
}