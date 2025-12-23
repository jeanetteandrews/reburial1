const lines = [
  "Where asking the question of place appears as a tired kind of violence, a violence made tired in its repetition:",
  "Where are you from, so embarrassing to say it, to say it after it's been said so many times before:",
  "Where one claim could be that the repetition defangs it, makes the word lose its meaning:",
  "Where another claim might be that the repetition creates a new meaning, a resonance:",
  "Where I practiced answering this question until its answer was where I sounded most fluent:",
  "Where I found my answer and found it boring, found it boring a hole through my body:",
  "Where I found a hole in my body I found apart of me that was nothing:",
  "Where because of the nothing my body held it became a container:",
  "Where proceeds and precedes a kind of emptying, excavation:",
  "Where are the artifacts of myself? Of my disappearance?",
  "Where I look away from the subject I refer to:",
  "Where I look and I point, a distance- making so casual in my inquiry:",
  "Where I find my point of origin and find it unsatisfactory:",
  "Where creates the landscape around the origin, draws the picture and then punctures it:",
  "Where the puncturing happens incompletely, fails to completely tunnel through:",
  "Where the place fractures itself from both the question and the answer:",
  "Where I point away from my body and away from the hole I have made myself out and outside of:",
  "Where via repeated fractures and punctures I am defanging the language:",
  "Where I am echoing the landscape and in doing so, making new meaning:",
  "Where I am from:",
  "Where:"
];

let circleRadius = 130;
let originalCenterX = 1440 / 4;
let originalCenterY = 778 / 2;
let currentCenterX = originalCenterX;
let currentCenterY = originalCenterY;
let targetCenterX = originalCenterX;
let targetCenterY = originalCenterY;
let easing = 0.05;
let isDragging = false;

function setup() {
  createCanvas(1440, 778);
  textFont('Times New Roman');
  textSize(16);
  fill(0);
  noStroke();
}

function draw() {
  background(255);
  
  // Update circle position with easing
  let dx = targetCenterX - currentCenterX;
  let dy = targetCenterY - currentCenterY;
  currentCenterX += dx * easing;
  currentCenterY += dy * easing;
  
  // Update target if dragging
  if (isDragging) {
    targetCenterX = mouseX;
    targetCenterY = mouseY;
  }
  
  // Change cursor if hovering over circle
  let distToMouse = dist(mouseX, mouseY, currentCenterX, currentCenterY);
  if (distToMouse < circleRadius && !isDragging) {
    cursor('pointer');
  } else if (!isDragging) {
    cursor('default');
  }
  
  fill(0);
  let y = 60;
  let lineHeight = 34;
  
  for (let line of lines) {
    drawLineAroundCircle(line, y);
    y += lineHeight;
  }
}

function mousePressed() {
  let distToMouse = dist(mouseX, mouseY, currentCenterX, currentCenterY);
  
  if (distToMouse < circleRadius && !isDragging) {
    // Start dragging
    isDragging = true;
    cursor('grabbing');
  } else if (isDragging) {
    // Stop dragging and return to original position
    isDragging = false;
    targetCenterX = originalCenterX;
    targetCenterY = originalCenterY;
    cursor('default');
  }
}

function drawLineAroundCircle(line, y) {
  let startX = 50;
  let x = startX;
  let currentIndex = 0;
  let inWhereAreYouFrom = false;
  let inWhere = false;

  // Check if this is the full "Where I am from:" line
  if (line === "Where I am from:") {
    textStyle(ITALIC);
  }
  
  while (currentIndex < line.length && x < 1440 - 40) {
    let char = line.charAt(currentIndex);
    
    // Only check for special phrases if not the "Where I am from:" line
    if (line !== "Where I am from:") {
      // Check if we're at the start of "Where are you from"
      if (currentIndex === 0 && line.substring(0, 18) === 'Where are you from') {
        inWhereAreYouFrom = true;
        textStyle(ITALIC);
      }
      // Check if we just finished "Where are you from"
      else if (inWhereAreYouFrom && currentIndex === 18) {
        inWhereAreYouFrom = false;
        textStyle(NORMAL);
      }
      // Check for single "Where" only if not in "Where are you from"
      else if (!inWhereAreYouFrom) {
        if (line.substring(currentIndex, currentIndex + 5) === 'Where') {
          inWhere = true;
          textStyle(ITALIC);
        }
        else if (inWhere && currentIndex >= 5 && line.substring(currentIndex - 5, currentIndex)=== 'Where') {
          inWhere = false;
          textStyle(NORMAL);
        }
      }
    }

    let charWidth = textWidth(char);

    // Check if this position intersects with the circle (using current position)
    let distToCenter = dist(x + charWidth / 2, y, currentCenterX, currentCenterY);
    
    if (distToCenter < circleRadius) {
      // We're inside the circle, skip to the right side
      // Calculate where the circle ends on this horizontal line (y position)
      let dy = abs(y - currentCenterY);
      if (dy < circleRadius) {
        // Find the x coordinate on the right side of the circle
        let dx = sqrt(circleRadius * circleRadius - dy * dy);
        x = currentCenterX + dx;
      } else {
        // We're above or below the circle, just move forward
        x += charWidth;
      }
    } else {
      // Draw the character
      text(char, x, y);
      x += charWidth;
      currentIndex++;
    }
  }
  
  // Reset text style
  textStyle(NORMAL);
}