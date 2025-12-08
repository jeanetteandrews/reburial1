const input = document.getElementById('inputText');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const stage = document.getElementById('stage');
const excludeStop = document.getElementById('excludeStop');
const topWordsCount = document.getElementById('topWordsCount');
const searchWord = document.getElementById('searchWord');
const searchMessage = document.getElementById('searchMessage');
const showFrequency = document.getElementById('showFrequency');
const infoButton = document.getElementById('infoButton');
const aboutButton = document.getElementById('aboutButton');
const infoBox = document.getElementById('infoBox');
const infoCloseBtn = document.getElementById('infoCloseBtn');
const saveBtn = document.getElementById('saveBtn');
const introWrapper = document.getElementById('intro-wrapper');
const mainContent = document.getElementById('main');
const settingsChevron = document.querySelector('.settings-chevron');

const STOPWORDS = new Set(
    "a,about,above,after,again,against,all,am,an,and,any,are,aren't,as,at,be,because,been,before,being,below,between,both,but,by,can't,could,couldn't,did,didn't,do,does,doesn't,doing,don't,down,during,each,few,for,from,further,had,hadn't,has,hasn't,have,haven't,having,he,he'd,he'll,he's,her,here,here's,hers,herself,him,himself,his,how,how's,i,i'm,i'd,i'll,i'm,i've,if,in,into,is,isn't,it,it's,its,itself,let's,me,more,most,mustn't,my,myself,no,nor,not,of,off,on,once,only,or,other,ought,our,ours,ourselves,out,over,own,same,shan't,she,she'd,she'll,she's,should,shouldn't,so,some,such,than,that,that's,the,their,theirs,them,themselves,then,there,there's,these,they,they'd,they'll,they're,they've,this,those,through,to,too,under,until,up,very,was,wasn't,we,we'd,we'll,we're,we've,were,weren't,what,what's,when,when's,where,where's,which,while,who,who's,whom,why,why's,with,won't,would,wouldn't,you,you'd,you'll,you're,you've,your,yours,yourself,yourselves,s,t,can,will,just,don,should,now".split(',')
);

// P5.js sketches - separate canvases for text and graph modes
let textCanvas;
let graphCanvas;
let words = [];
let draggedWord = null;
let offsetX = 0;
let offsetY = 0;
let freqWords = [];
let circleAnimations = [];
let bars = [];
let draggedBar = null;

// Text mode sketch
const textSketch = (p) => {
  p.setup = () => {
    const stage = document.getElementById('stage');
    const width = stage.offsetWidth || window.innerWidth * 0.75;
    const height = stage.offsetHeight || window.innerHeight;
    textCanvas = p.createCanvas(width, height);
    textCanvas.parent('stage');
    textCanvas.elt.style.display = 'block';
    textCanvas.elt.id = 'textCanvas';
    p.textAlign(p.CENTER, p.CENTER);
    p.textFont('Times New Roman');
  };
  
  p.draw = () => {
    if (currentView !== 'text') {
      return;
    }
    
    p.clear();
    
    // Draw all words
    words.forEach(word => {
      p.push();
      p.translate(word.x + word.width/2, word.y + word.height/2);
      
      if (word.isDeleting) {
        p.fill(0, 255 * (1 - word.deleteProgress));
        p.scale(1 - word.deleteProgress * 0.2);
      } else if (word.count === 0) {
        p.fill(153);
      } else {
        p.fill(0);
      }
      
      p.textSize(16);
      p.text(word.label, 0, -8);
      
      if (showFrequency.checked) {
        p.textSize(12);
        p.fill(word.count === 0 ? 153 : 51);
        p.text(`(${word.count})`, 0, 8);
      }
      
      p.pop();
    });
    
    // Draw frequency visualization words
    freqWords.forEach((fw, idx) => {
      const progress = (p.millis() - fw.startTime) / 1000;
      
      if (progress < 0.4) {
        const popProgress = progress / 0.4;
        const scale = p.map(popProgress, 0, 1, 0, 1);
        const opacity = p.map(popProgress, 0, 1, 0, 0.8);
        
        p.push();
        p.translate(fw.x, fw.y);
        p.scale(scale);
        p.fill(0, opacity * 255);
        p.textSize(16);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(fw.label, 0, 0);
        p.pop();
      } else if (progress < 1.0) {
        const fadeProgress = (progress - 0.6) / 0.4;
        const scale = p.map(fadeProgress, 0, 1, 1, 0.8);
        const opacity = p.map(fadeProgress, 0, 1, 0.8, 0);
        
        p.push();
        p.translate(fw.x, fw.y);
        p.scale(scale);
        p.fill(0, opacity * 255);
        p.textSize(16);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(fw.label, 0, 0);
        p.pop();
      } else {
        freqWords.splice(idx, 1);
      }
    });

    // Draw circle animations for new words
    circleAnimations.forEach((anim, idx) => {
      const progress = (Date.now() - anim.startTime) / 1500;
      
      if (progress < 1.0) {
        p.push();
        p.noFill();
        p.stroke(0);
        p.strokeWeight(1);
        
        if (progress < 0.33) {
          const growProgress = progress / 0.33;
          const scale = p.map(growProgress, 0, 1, 0.5, 1.2);
          const opacity = p.map(growProgress, 0, 1, 0, 255);
          p.stroke(0, opacity);
          p.ellipse(anim.x, anim.y, 80 * scale, 80 * scale);
        } else if (progress < 0.67) {
          const peakProgress = (progress - 0.33) / 0.34;
          const scale = p.map(peakProgress, 0, 1, 1.2, 1.2);
          const opacity = 255;
          p.stroke(0, opacity);
          p.ellipse(anim.x, anim.y, 80 * scale, 80 * scale);
        } else {
          const fadeProgress = (progress - 0.67) / 0.33;
          const scale = p.map(fadeProgress, 0, 1, 1.2, 0);
          const opacity = p.map(fadeProgress, 0, 1, 255, 0);
          p.stroke(0, opacity);
          p.ellipse(anim.x, anim.y, 80 * scale, 80 * scale);
        }
        
        p.pop();
      } else {
        circleAnimations.splice(idx, 1);
      }
    });
    
    // Update delete animations
    words.forEach((word, idx) => {
      if (word.isDeleting) {
        word.deleteProgress += 0.05;
        if (word.deleteProgress >= 1) {
          words.splice(idx, 1);
        }
      }
    });
    
    // Update cursor based on hover and drag state
    let hovering = false;
    for (let i = words.length - 1; i >= 0; i--) {
        const word = words[i];
        if (p.mouseX >= word.x && p.mouseX <= word.x + word.width && p.mouseY >= word.y && p.mouseY <= word.y + word.height) {
            hovering = true;
            break;
        }
    }
    if (draggedWord) {
        p.cursor('grabbing');
    } else if (hovering) {
        p.cursor('grab');
    } else {
        p.cursor('default');
    }
  };

  p.mousePressed = () => {
    if (currentView !== 'text') return;
    
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (p.mouseX >= word.x && p.mouseX <= word.x + word.width &&
          p.mouseY >= word.y && p.mouseY <= word.y + word.height) {
        draggedWord = word;
        offsetX = p.mouseX - word.x;
        offsetY = p.mouseY - word.y;
        word.startX = p.mouseX;
        word.startY = p.mouseY;
        word.hasDragged = false;
        word.clickTime = p.millis();
        break;
      }
    }
  };

  p.mouseDragged = () => {
    if (currentView !== 'text' || !draggedWord) return;
    
    const dx = Math.abs(p.mouseX - draggedWord.startX);
    const dy = Math.abs(p.mouseY - draggedWord.startY);
    if (dx > 5 || dy > 5) {
      draggedWord.hasDragged = true;
    }
    
    draggedWord.x = p.constrain(p.mouseX - offsetX, 0, p.width - draggedWord.width);
    draggedWord.y = p.constrain(p.mouseY - offsetY, 0, p.height - draggedWord.height);
  };

  p.mouseReleased = () => {
    if (currentView !== 'text' || !draggedWord) return;
    
    if (!draggedWord.hasDragged) {
      if (draggedWord.lastClick && (p.millis() - draggedWord.lastClick) < 250) {
        draggedWord.isDeleting = true;
        draggedWord.deleteProgress = 0;
        draggedWord.lastClick = 0;
        
        if (draggedWord.clickTimeout) {
          clearTimeout(draggedWord.clickTimeout);
          draggedWord.clickTimeout = null;
        }
      } else {
        const wordToVisualize = draggedWord.label;
        const countToVisualize = draggedWord.count;
        
        draggedWord.clickTimeout = setTimeout(() => {
          p.visualizeFrequency(wordToVisualize, countToVisualize);
          if (draggedWord) {
            draggedWord.clickTimeout = null;
          }
        }, 250);
        
        draggedWord.lastClick = p.millis();
      }
    } else {
      draggedWord.lastClick = 0;
    }
    
    draggedWord = null;
  };

  p.visualizeFrequency = (word, count) => {
    for (let i = 0; i < count; i++) {
      const x = p.random(50, p.width - 50);
      const y = p.random(30, p.height - 30);
      
      freqWords.push({
        label: word,
        x: x,
        y: y,
        startTime: p.millis()
      });
    }
  };
};

// Graph mode sketch
const graphSketch = (p) => {
  p.setup = () => {
    const stage = document.getElementById('stage');
    const width = stage.offsetWidth || window.innerWidth * 0.75;
    const height = stage.offsetHeight || window.innerHeight;
    graphCanvas = p.createCanvas(width, height);
    graphCanvas.parent('stage');
    graphCanvas.elt.style.display = 'none';
    graphCanvas.elt.id = 'graphCanvas';
    p.textAlign(p.CENTER, p.CENTER);
    p.textFont('Times New Roman');
  };
  
  p.draw = () => {
    if (currentView !== 'graph') {
      return;
    }
    
    p.clear();
    
    // Draw bars
    bars.forEach(bar => {
      p.push();
      p.noStroke();
      
      const opacity = bar.isDeleting ? 255 * (1 - bar.deleteProgress) : 255;
      
      if (bar.isDeleting) {
        p.fill(67, 67, 67, opacity);
      } else if (bar.count === 0) {
        p.fill(211, 211, 211);
      } else {
        p.fill(67, 67, 67);
      }
      
      p.rect(bar.x, bar.y + bar.height - bar.fillHeight, bar.width, bar.fillHeight);
      
      if (showFrequency.checked) {
        if (bar.isDeleting) {
          p.fill(bar.count === 0 ? 153 : 0, opacity);
        } else {
          p.fill(bar.count === 0 ? 153 : 0);
        }
        p.textSize(12);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.text(bar.count, bar.x + bar.width/2, bar.y + bar.height - bar.fillHeight - 6);
      }
      
      if (bar.isDeleting) {
        p.fill(bar.count === 0 ? 153 : 0, opacity);
      } else {
        p.fill(bar.count === 0 ? 153 : 0);
      }
      p.textSize(12);
      p.push();
      p.translate(bar.x + bar.width/2, bar.y + bar.height + 14);
      p.rotate(-0.49);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(bar.label, 0, 0);
      p.pop();
      
      p.pop();
    });
    
    // Update delete animations for bars
    bars.forEach((bar, idx) => {
      if (bar.isDeleting) {
        bar.deleteProgress += 0.05;
        if (bar.deleteProgress >= 1) {
          bars.splice(idx, 1);
          repositionBars();
          rescaleBars();
        }
      }
    });
    
    // Update cursor for bars
    let hoveringBar = false;
    for (let i = bars.length - 1; i >= 0; i--) {
        const bar = bars[i];
        const fillY = bar.y + bar.height - bar.fillHeight;
        const labelY = bar.y + bar.height;
        
        if ((p.mouseX >= bar.x && p.mouseX <= bar.x + bar.width &&
             p.mouseY >= fillY && p.mouseY <= bar.y + bar.height) ||
            (p.mouseX >= bar.x - 20 && p.mouseX <= bar.x + bar.width + 20 &&
             p.mouseY >= labelY && p.mouseY <= labelY + 40)) {
            hoveringBar = true;
            break;
        }
    }
    if (draggedBar) {
        p.cursor('grabbing');
    } else if (hoveringBar) {
        p.cursor('grab');
    } else {
        p.cursor('default');
    }
  };

  p.mousePressed = () => {
    if (currentView !== 'graph') return;
    
    for (let i = bars.length - 1; i >= 0; i--) {
      const bar = bars[i];
      const fillY = bar.y + bar.height - bar.fillHeight;
      const labelY = bar.y + bar.height;
      
      if ((p.mouseX >= bar.x && p.mouseX <= bar.x + bar.width &&
           p.mouseY >= fillY && p.mouseY <= bar.y + bar.height) ||
          (p.mouseX >= bar.x - 20 && p.mouseX <= bar.x + bar.width + 20 &&
           p.mouseY >= labelY && p.mouseY <= labelY + 40)) {
        draggedBar = bar;
        offsetX = p.mouseX - bar.x;
        offsetY = p.mouseY - bar.y;
        bar.startX = p.mouseX;
        bar.startY = p.mouseY;
        bar.hasDragged = false;
        bar.clickTime = p.millis();
        break;
      }
    }
  };

  p.mouseDragged = () => {
    if (currentView !== 'graph' || !draggedBar) return;
    
    const dx = Math.abs(p.mouseX - draggedBar.startX);
    const dy = Math.abs(p.mouseY - draggedBar.startY);
    if (dx > 5 || dy > 5) {
      draggedBar.hasDragged = true;
    }
    
    draggedBar.x = p.mouseX - offsetX;
    draggedBar.y = p.mouseY - offsetY;
  };
  
  p.mouseReleased = () => {
    if (currentView !== 'graph' || !draggedBar) return;
    
    if (!draggedBar.hasDragged) {
      if (draggedBar.lastClick && (p.millis() - draggedBar.lastClick) < 250) {
        draggedBar.isDeleting = true;
        draggedBar.deleteProgress = 0;
        draggedBar.lastClick = 0;
        
        if (draggedBar.clickTimeout) {
          clearTimeout(draggedBar.clickTimeout);
          draggedBar.clickTimeout = null;
        }
      } else {
        draggedBar.lastClick = p.millis();
      }
    } else {
      draggedBar.userMoved = true;
      draggedBar.lastClick = 0;
      
      repositionBars();
    }
    
    draggedBar = null;
  };
};

new p5(textSketch);
new p5(graphSketch);

function normalizeWord(w) {
  const orig = String(w || '');
  let cleaned = orig
    .replace(/^[^\p{L}\d']+|[^\p{L}\d']+$/gu, '')
    .replace(/['']/g, "'")
    .toLowerCase();

  if (cleaned === 'u.s' || cleaned === 'u.s.') {
    cleaned = 'u.s.';
  }

  return cleaned;
}

function getTopWords(text, n = 10, excludeCommon = true) {
    const words = text.split(/\s+/).map(normalizeWord).filter(Boolean);
    const freq = new Map();

    for (const w of words) {
        if (excludeCommon && STOPWORDS.has(w)) continue;
        if (w.length === 1 && excludeCommon) continue;
        freq.set(w, (freq.get(w) || 0) + 1);
    }

    const unique = freq.size;
    const arr = Array.from(freq.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { unique, top: arr.slice(0, n) };
}

function clearStage() {
    words = [];
    bars = [];
}

function placeWordEl(word, count, idx, total, showAnimation = true) {
    const charWidth = 9;
    const labelWidth = word.length * charWidth + 20;
    const wordHeight = showFrequency.checked ? 40 : 30;
    
    function rectsOverlap(a, b) {
        return !(
            a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y
        );
    }

    const existingRects = words.map(w => ({
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height
    }));

    const minX = 0;
    const minY = 0;
    const maxX = Math.max(minX, textCanvas.width - labelWidth);
    const maxY = Math.max(minY, textCanvas.height - wordHeight);

    let placed = false;
    let nx = minX;
    let ny = minY;

    const MAX_TRIES = 200;
    for (let t = 0; t < MAX_TRIES; t++) {
        nx = Math.random() * (maxX - minX) + minX;
        ny = Math.random() * (maxY - minY) + minY;

        const candidate = { x: nx, y: ny, width: labelWidth, height: wordHeight };
        let conflict = false;
        for (const er of existingRects) {
            if (rectsOverlap(candidate, er)) {
                conflict = true;
                break;
            }
        }
        if (!conflict) {
            placed = true;
            break;
        }
    }

    if (!placed) {
        nx = Math.min(Math.max(nx, minX), maxX);
        ny = Math.min(Math.max(ny, minY), maxY);
    }

    const wordObj = {
        label: word,
        count: count,
        x: nx,
        y: ny,
        width: labelWidth,
        height: wordHeight,
        isDeleting: false,
        deleteProgress: 0,
        hasDragged: false,
        clickTime: 0,
        lastClick: 0,
        startX: 0,
        startY: 0,
        clickTimeout: null
    };

    words.push(wordObj);

    if (showAnimation) {
      circleAnimations.push({
        x: nx + labelWidth / 2,
        y: ny + wordHeight / 2,
        startTime: Date.now()
      });
    }

    return wordObj;
}

function renderHistogram(top) {
  bars = [];
  
  const maxCount = Math.max(...top.map(d => d.count), 1);
  const barWidth = 20;
  const gap = 12;
  const maxBarHeight = graphCanvas.height * 0.45;
  const startX = 60;
  const baseY = graphCanvas.height * 0.35;
  
  top.forEach((d, i) => {
    const fillHeight = (d.count / maxCount) * maxBarHeight;
    const bar = {
      label: d.word,
      count: d.count,
      x: startX + i * (barWidth + gap),
      y: baseY,
      width: barWidth,
      height: maxBarHeight,
      fillHeight: Math.max(fillHeight, d.count > 0 ? 5 : 0),
      isDeleting: false,
      deleteProgress: 0,
      hasDragged: false,
      clickTime: 0,
      lastClick: 0,
      startX: 0,
      startY: 0,
      clickTimeout: null,
      userMoved: false
    };
    
    bars.push(bar);
  });
}

function rescaleBars() {
  if (bars.length === 0) return;
  
  const maxCount = Math.max(...bars.map(b => b.count), 1);
  const maxBarHeight = graphCanvas.height * 0.45;
  
  bars.forEach(bar => {
    bar.fillHeight = (bar.count / maxCount) * maxBarHeight;
    if (bar.count > 0 && bar.fillHeight < 5) bar.fillHeight = 5;
  });
}

function repositionBars() {
  const barWidth = 20;
  const gap = 12;
  const startX = 60;
  
  const nonMovedBars = bars.filter(b => !b.userMoved).sort((a, b) => b.count - a.count);
  const movedBars = bars.filter(b => b.userMoved);
  
  bars = [...nonMovedBars, ...movedBars];
  
  nonMovedBars.forEach((bar, i) => {
    bar.x = startX + i * (barWidth + gap);
  });
}

analyzeBtn.addEventListener('click', () => {
    const text = input.value.trim();
    const numTop = parseInt(topWordsCount.value, 10) || 10;
    const { unique, top } = getTopWords(text, numTop, excludeStop.checked);

    clearStage();
    
    if (currentView === 'graph') {
        renderHistogram(top.map(([word, count]) => ({ word, count })));
    } else {
        words = [];
        top.forEach(([w, c], idx) => placeWordEl(w, c, idx, top.length, false));
    }
});

clearBtn.addEventListener('click', () => {
    input.value = '';
    clearStage();
    searchWord.value = '';
    searchMessage.textContent = '';
});

searchWord.addEventListener('keypress', (ev) => {
    if (ev.key === 'Enter') {
        performSearch();
    }
});

function performSearch() {
    const text = input.value.trim();
    if (!text) {
        searchMessage.textContent = '';
        searchMessage.className = 'search-message error';
        return;
    }

    const query = normalizeWord(searchWord.value.trim());
    if (!query) {
        searchMessage.textContent = '';
        return;
    }

    const words = text.split(/\s+/).map(normalizeWord).filter(Boolean);
    const freq = new Map();

    for (const w of words) {
        freq.set(w, (freq.get(w) || 0) + 1);
    }

    const count = freq.get(query) || 0;
    
    if (count > 0) {
        searchMessage.textContent = `"${query}" shows up ${count} ${count === 1 ? 'time' : 'times'} in the text`;
        searchMessage.className = 'search-message success';
    } else {
        searchMessage.textContent = `"${query}" does not exist in the text`;
        searchMessage.className = 'search-message error';
    }
    
    if (currentView === 'graph') {
        const barWidth = 20;
        const gap = 12;
        const maxBarHeight = graphCanvas.height * 0.45;
        const baseY = graphCanvas.height * 0.35;
        
        const newBar = {
          label: query,
          count: count,
          x: 60,
          y: baseY,
          width: barWidth,
          height: maxBarHeight,
          fillHeight: 0,
          isDeleting: false,
          deleteProgress: 0,
          hasDragged: false,
          clickTime: 0,
          lastClick: 0,
          startX: 0,
          startY: 0,
          clickTimeout: null,
          userMoved: false
        };
        
        bars.push(newBar);
        
        repositionBars();
        rescaleBars();
        
        searchWord.value = '';
      } else {
        placeWordEl(query, count, 0, 1);
        searchWord.value = '';
      }
}

topWordsCount.addEventListener('change', () => {
    const isMobile = window.innerWidth <= 768;
    const maxAllowed = isMobile 
        ? (currentView === 'graph' ? 16 : 30)
        : (currentView === 'graph' ? 50 : 100);
    if (parseInt(topWordsCount.value, 10) > maxAllowed) {
        topWordsCount.value = maxAllowed;
    }
});

topWordsCount.addEventListener('input', () => {
    const isMobile = window.innerWidth <= 768;
    const maxAllowed = isMobile 
        ? (currentView === 'graph' ? 16 : 30)
        : (currentView === 'graph' ? 50 : 100);
    if (parseInt(topWordsCount.value, 10) > maxAllowed) {
        topWordsCount.value = maxAllowed;
    }
});

showFrequency.addEventListener('change', () => {
    // P5 will automatically update on next draw cycle based on showFrequency.checked
});

infoButton.addEventListener('click', () => {
  infoBox.style.display = infoBox.style.display === 'none' ? 'block' : 'none';
});

infoCloseBtn.addEventListener('click', () => {
  infoBox.style.display = 'none';
});

aboutButton.addEventListener('click', () => {
  showIntroScreen();
});

saveBtn.addEventListener('click', () => {
  const activeCanvas = currentView === 'text' ? textCanvas : graphCanvas;
  activeCanvas.elt.toBlob((blob) => {
    const link = document.createElement('a');
    link.download = 'reburial.png';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  });
});

settingsToggle.addEventListener('click', () => {
  const isOpen = settingsContent.classList.toggle('open');
  settingsChevron.classList.toggle('open', isOpen);
});

let currentView = 'text';

const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
viewToggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    viewToggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const view = btn.dataset.view;
    currentView = view;
    
    if (view === 'text') {
      textCanvas.elt.style.display = 'block';
      graphCanvas.elt.style.display = 'none';
    } else {
      textCanvas.elt.style.display = 'none';
      graphCanvas.elt.style.display = 'block';
    }
    
    const isMobile = window.innerWidth <= 768;
    const currentValue = parseInt(topWordsCount.value, 10);
    const graphMax = isMobile ? 16 : 50;
    if (view === 'graph' && currentValue > graphMax) {
        topWordsCount.value = graphMax;
    }
    
    const text = input.value.trim();
    if (text && (words.length > 0 || bars.length > 0)) {
      const numTop = parseInt(topWordsCount.value, 10) || 10;
      if (view === 'graph') {
        const { top } = getTopWords(text, numTop, excludeStop.checked);
        renderHistogram(top.map(([word, count]) => ({ word, count })));
      } else {
        const { top } = getTopWords(text, numTop, excludeStop.checked);
        clearStage();
        top.forEach(([w, c], idx) => placeWordEl(w, c, idx, top.length, false));
      }
    }
  });
});

function hideIntroScreen() {
    introWrapper.style.display = 'none';
    mainContent.style.display = 'flex';
}

function showIntroScreen() {
    mainContent.style.display = 'none';
    introWrapper.style.display = 'flex';
}

function updateClickTapText() {
  const isMobile = window.innerWidth <= 768;
  const clickTapElements = document.querySelectorAll('.click-tap-text');
  clickTapElements.forEach(el => {
    const currentText = el.textContent.toLowerCase();
    const isCapitalized = el.textContent[0] === el.textContent[0].toUpperCase();
    
    if (isMobile) {
      el.textContent = isCapitalized ? 'Tap' : 'tap';
    } else {
      el.textContent = isCapitalized ? 'Click' : 'click';
    }
  });
}

updateClickTapText();
window.addEventListener('resize', updateClickTapText);