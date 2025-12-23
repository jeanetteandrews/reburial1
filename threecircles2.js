const sentences = [
  "here is a closing a closing in here is relative to your body is a relative to your body here is close to",
  "here is a gesture a giving here is gestation a faith of one body held in another",
  "here inside your language is a smaller here is an inheritance",
  "here is your body fractured here are the pieces",
  "here after yourself you are"
];

let angles = [0, 0, 0, 0, 0];
const rotationSpeeds = [0.001, -0.002, 0.002, -0.001, 0.002];
let currentSpeeds = [0.001, -0.002, 0.002, -0.001, 0.002]; // Current actual speeds
const kernings = [8.35, 9, 9.35, 8.9, 9.8]; // Fixed spacing per character
const deceleration = 0.95; // Factor for slowing down
const acceleration = 0.05; // Factor for speeding up

let clickedStates = [false, false, false, false, false]; // Track which sentences are clicked to stop
let hoveredSentence = -1; // Which sentence is being hovered (-1 for none)

function setup() {
  createCanvas(windowWidth, windowHeight);
  textSize(20);
  textFont('Times New Roman');
  textAlign(CENTER, CENTER);
}

function draw() {
  background(255);
  translate(width / 2, height / 2);
  
  // Check which sentence is being hovered
  let mouseXTransformed = mouseX - width / 2;
  let mouseYTransformed = mouseY - height / 2;
  let mouseDist = dist(0, 0, mouseXTransformed, mouseYTransformed);
  hoveredSentence = -1;
  
  for (let i = 0; i < sentences.length; i++) {
    let radius = 140 - (i * 24);
    let innerBound = radius - 12;
    let outerBound = radius + 12;
    
    if (mouseDist >= innerBound && mouseDist <= outerBound) {
      hoveredSentence = i;
      break;
    }
  }
  
  // Update speeds based on hover and click states
  for (let i = 0; i < sentences.length; i++) {
    if (clickedStates[i]) {
      // Clicked: decelerate to stop
      currentSpeeds[i] *= deceleration;
      if (abs(currentSpeeds[i]) < 0.0001) {
        currentSpeeds[i] = 0;
      }
    } else if (hoveredSentence === i) {
      // Hovered: decelerate to stop
      currentSpeeds[i] *= deceleration;
      if (abs(currentSpeeds[i]) < 0.0001) {
        currentSpeeds[i] = 0;
      }
    } else {
      // Not hovered or clicked: accelerate back to normal speed
      let targetSpeed = rotationSpeeds[i];
      currentSpeeds[i] += (targetSpeed - currentSpeeds[i]) * acceleration;
    }
    
    angles[i] += currentSpeeds[i];
  }
  
  // Change cursor based on hover state
  if (hoveredSentence !== -1) {
    cursor('pointer');
  } else {
    cursor('default');
  }
  
  // Draw each sentence on its concentric circle
  for (let i = 0; i < sentences.length; i++) {
    let radius = 140 - (i * 24);
    drawRotatingText(sentences[i], radius, angles[i], kernings[i]);
  }
}

function drawRotatingText(sentenceText, radius, startAngle, kerning) {
  push();
  rotate(startAngle);
  
  // Calculate the arc length needed for the text
  let circumference = TWO_PI * radius;
  let textWidth = sentenceText.length * kerning;
  let angleStep = (textWidth / circumference) * TWO_PI / sentenceText.length;
  
  // Draw each character along the circle
  for (let i = 0; i < sentenceText.length; i++) {
    let angle = i * angleStep;
    let x = cos(angle) * radius;
    let y = sin(angle) * radius;
    
    push();
    translate(x, y);
    rotate(angle + HALF_PI);
    fill(0);
    
    // Check if this character is part of "here"
    let isPartOfHere = false;
    for (let j = Math.max(0, i - 3); j <= i; j++) {
      if (sentenceText.substring(j, j + 4) === "here" && i >= j && i < j + 4) {
        isPartOfHere = true;
        break;
      }
    }
    
    if (isPartOfHere) {
      textStyle(ITALIC);
    } else {
      textStyle(NORMAL);
    }
    
    text(sentenceText[i], 0, 0);
    pop();
  }
  
  pop();
}

function mousePressed() {
  // Toggle clicked state for the hovered sentence
  if (hoveredSentence !== -1) {
    clickedStates[hoveredSentence] = !clickedStates[hoveredSentence];
  }
}