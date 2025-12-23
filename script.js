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
const settingsToggle = document.getElementById('settingsToggle');
const settingsContent = document.getElementById('settingsContent');
const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');

const STOPWORDS = new Set(
    "a,about,above,after,again,against,all,am,an,and,any,are,aren't,as,at,be,because,been,before,being,below,between,both,but,by,can't,could,couldn't,did,didn't,do,does,doesn't,doing,don't,down,during,each,few,for,from,further,had,hadn't,has,hasn't,have,haven't,having,he,he'd,he'll,he's,her,here,here's,hers,herself,him,himself,his,how,how's,i,i'm,i'd,i'll,i'm,i've,if,in,into,is,isn't,it,it's,its,itself,let's,me,more,most,mustn't,my,myself,no,nor,not,of,off,on,once,only,or,other,ought,our,ours,ourselves,out,over,own,same,shan't,she,she'd,she'll,she's,should,shouldn't,so,some,such,than,that,that's,the,their,theirs,them,themselves,then,there,there's,these,they,they'd,they'll,they're,they've,this,those,through,to,too,under,until,up,very,was,wasn't,we,we'd,we'll,we're,we've,were,weren't,what,what's,when,when's,where,where's,which,while,who,who's,whom,why,why's,with,won't,would,wouldn't,you,you'd,you'll,you're,you've,your,yours,yourself,yourselves,s,t,can,will,just,don,should,now".split(',')
);

let textCanvas;
let graphCanvas;
let words = [];
let freqWords = [];
let circleAnimations = [];
let bars = [];
let draggedBar = null;
let offsetX = 0;
let offsetY = 0;
let p5Instance;
let displayWidth = 0;
let displayHeight = 0;
let currentView = 'graph';

// Graph p5 instance
const graphSketch = (p) => {
    p.setup = () => {};
    
    p.draw = () => {
        if (!graphCanvas) {
            const stage = document.getElementById('stage');
            const rect = stage.getBoundingClientRect();
            
            if (rect.width === 0 || rect.height === 0) {
                return;
            }
            
            graphCanvas = p.createCanvas(rect.width, rect.height);
            graphCanvas.parent('stage');
            graphCanvas.elt.style.display = 'block';
            graphCanvas.elt.id = 'graphCanvas';
            p.textAlign(p.CENTER, p.CENTER);
            p.textFont('Times New Roman');
            return;
        }
        
        if (currentView !== 'graph') {
            return;
        }
        
        p.clear();
        
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
                p.fill(bar.count === 0 ? 153 : 0, opacity);
                p.textSize(12);
                p.textAlign(p.CENTER, p.BOTTOM);
                p.text(bar.count, bar.x + bar.width/2, bar.y + bar.height - bar.fillHeight - 6);
            }
            
            p.fill(bar.count === 0 ? 153 : 0, opacity);
            p.textSize(12);
            p.push();
            p.translate(bar.x + bar.width/2, bar.y + bar.height + 20);
            p.rotate(-0.49);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(bar.label, 0, 0);
            p.pop();
            
            p.pop();
        });
        
        bars.forEach((bar, idx) => {
            if (bar.isDeleting) {
                bar.deleteProgress += 0.1;
                if (bar.deleteProgress >= 1) {
                    bars.splice(idx, 1);
                    repositionBars();
                    rescaleBars();
                }
            }
        });
        
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

        if (hoveringBar) {
            p.cursor('move');
        } else {
            p.cursor('default');
        }
    };

    // Desktop gestures
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

    // Touchscreen gestures
    p.touchStarted = () => {
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
                return false;
            }
        }
    };

    p.touchMoved = () => {
        if (currentView !== 'graph' || !draggedBar) return;
        
        const dx = Math.abs(p.mouseX - draggedBar.startX);
        const dy = Math.abs(p.mouseY - draggedBar.startY);
        if (dx > 5 || dy > 5) {
            draggedBar.hasDragged = true;
        }
        
        draggedBar.x = p.mouseX - offsetX;
        draggedBar.y = p.mouseY - offsetY;
        return false;
    };

    p.touchEnded = () => {
        if (currentView !== 'graph' || !draggedBar) return;
        
        if (!draggedBar.hasDragged) {
            draggedBar.isDeleting = true;
            draggedBar.deleteProgress = 0;
        } else {
            draggedBar.userMoved = true;
            draggedBar.lastClick = 0;
            repositionBars();
        }
        
        draggedBar = null;
        return false;
    };
};

// Text p5 instance
const textSketch = (p) => {
    p5Instance = p;
    
    p.setup = () => {};
    
    p.draw = () => {
        if (!textCanvas) {
            const stage = document.getElementById('stage');
            const rect = stage.getBoundingClientRect();
            
            if (rect.width === 0 || rect.height === 0) {
                return;
            }
            
            displayWidth = rect.width;
            displayHeight = rect.height;
            
            textCanvas = p.createCanvas(displayWidth, displayHeight);
            textCanvas.parent('stage');
            textCanvas.elt.style.display = 'none';
            textCanvas.elt.id = 'textCanvas';
            
            p.textAlign(p.CENTER, p.CENTER);
            p.textFont('Times New Roman');
            return;
        }
        
        p.background(255);
        
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
                    const scale = 1.2;
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
    };

    p.visualizeFrequency = (word, count) => {
        for (let i = 0; i < count; i++) {
            const x = p.random(50, displayWidth - 50);
            const y = p.random(30, displayHeight - 30);
            
            freqWords.push({
                label: word,
                x: x,
                y: y,
                startTime: p.millis()
            });
        }
    };
};

new p5(graphSketch);
new p5(textSketch);

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
    words.forEach(word => {
        if (word.element) {
            word.element.remove();
        }
    });
    words = [];
    bars = [];
}

function overlapsButtons(x, y, width, height, canvasWidth, canvasHeight) {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        const bottomButtonsZone = {
            x: 0,
            y: canvasHeight - 20,
            width: canvasWidth,
            height: 20
        };
        
        return (
            x < bottomButtonsZone.x + bottomButtonsZone.width &&
            x + width > bottomButtonsZone.x &&
            y < bottomButtonsZone.y + bottomButtonsZone.height &&
            y + height > bottomButtonsZone.y
        );
    } else {
        const topButtonsZone = {
            x: canvasWidth - 250,
            y: 0,
            width: 250,
            height: 80
        };
        
        const saveButtonZone = {
            x: canvasWidth - 150,
            y: canvasHeight - 80,
            width: 150,
            height: 80
        };
        
        return (
            (x < topButtonsZone.x + topButtonsZone.width &&
             x + width > topButtonsZone.x &&
             y < topButtonsZone.y + topButtonsZone.height &&
             y + height > topButtonsZone.y) ||
            (x < saveButtonZone.x + saveButtonZone.width &&
             x + width > saveButtonZone.x &&
             y < saveButtonZone.y + saveButtonZone.height &&
             y + height > saveButtonZone.y)
        );
    }
}

function placeWordEl(word, count, idx, total, showAnimation = true) {
    if (!p5Instance || !textCanvas) {
        console.error('p5Instance or textCanvas not ready!');
        return;
    }

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

    const charWidth = 9;
    const labelWidth = word.length * charWidth + 20;
    const wordHeight = showFrequency.checked ? 40 : 30;

    const minX = 0;
    const minY = 0;
    const maxX = Math.max(minX, displayWidth - labelWidth);
    const maxY = Math.max(minY, displayHeight - wordHeight);

    let placed = false;
    let nx = minX;
    let ny = minY;

    const MAX_TRIES = 300;
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
        
        if (!conflict && !overlapsButtons(nx, ny, labelWidth, wordHeight, displayWidth, displayHeight)) {
            placed = true;
            break;
        }
    }

    if (!placed) {
        let attempts = 0;
        do {
            nx = Math.random() * (maxX - minX) + minX;
            ny = Math.random() * (maxY - minY) + minY;
            attempts++;
        } while (overlapsButtons(nx, ny, labelWidth, wordHeight, textCanvas.width, textCanvas.height) && attempts < 50);
        
        nx = Math.max(0, Math.min(nx, textCanvas.width - labelWidth));
        ny = Math.max(0, Math.min(ny, textCanvas.height - wordHeight - 20));
    }

    const container = p5Instance.createDiv('');
    container.parent('stage');

    container.position(nx, ny);
    container.style('font-family', 'Times New Roman');
    container.style('user-select', 'none');
    container.style('display', 'inline-block');
    container.style('text-align', 'center');
    container.style('padding', '5px');
    container.style('z-index', '100');
    container.style('position', 'absolute');
    container.draggable();
    
    const wordDiv = p5Instance.createDiv(word);
    wordDiv.parent(container);
    wordDiv.style('font-size', '16px');
    wordDiv.style('color', count === 0 ? '#999' : '#000');
    wordDiv.style('margin', '0');
    wordDiv.style('padding', '0');
    wordDiv.style('line-height', '1');
    wordDiv.style('pointer-events', 'none');
    
    let freqDiv = null;
    if (showFrequency.checked) {
        freqDiv = p5Instance.createDiv(`(${count})`);
        freqDiv.parent(container);
        freqDiv.style('font-size', '12px');
        freqDiv.style('color', count === 0 ? '#999' : '#333');
        freqDiv.style('margin', '0');
        freqDiv.style('padding', '0');
        freqDiv.style('line-height', '1');
        freqDiv.style('margin-top', '2px');
        freqDiv.style('pointer-events', 'none');
    }
    
    let lastClickTime = 0;
    let clickTimeout = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let hasMoved = false;

    container.elt.addEventListener('mousedown', (e) => {
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        hasMoved = false;
    });

    container.elt.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;
        hasMoved = false;
    });

    container.elt.addEventListener('mousemove', (e) => {
        const dx = Math.abs(e.clientX - dragStartX);
        const dy = Math.abs(e.clientY - dragStartY);
        if (dx > 5 || dy > 5) {
            hasMoved = true;
        }
    });

    container.elt.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - dragStartX);
        const dy = Math.abs(touch.clientY - dragStartY);
        if (dx > 5 || dy > 5) {
            hasMoved = true;
        }
    });

    container.elt.addEventListener('mouseup', () => {
        if (hasMoved) {
            return;
        }
        
        const now = Date.now();
        if (now - lastClickTime < 300) {
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
            }
            
            container.style('transition', 'opacity 0.3s, transform 0.3s');
            container.style('opacity', '0');
            container.style('transform', 'scale(0.8)');
            setTimeout(() => {
                container.remove();
                const idx = words.findIndex(w => w.element === container);
                if (idx !== -1) {
                    words.splice(idx, 1);
                }
            }, 300);
        } else {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) {
                clickTimeout = setTimeout(() => {
                    p5Instance.visualizeFrequency(word, count);
                    clickTimeout = null;
                }, 300);
            }
        }
        lastClickTime = now;
    });

    container.elt.addEventListener('touchend', () => {
        if (hasMoved) {
            return;
        }
        
        container.style('transition', 'opacity 0.3s, transform 0.3s');
        container.style('opacity', '0');
        container.style('transform', 'scale(0.8)');
        setTimeout(() => {
            container.remove();
            const idx = words.findIndex(w => w.element === container);
            if (idx !== -1) {
                words.splice(idx, 1);
            }
        }, 300);
    });

    let constrainInterval;

    function startConstrain() {
        constrainInterval = setInterval(() => {
            const stageRect = stage.getBoundingClientRect();
            const containerRect = container.elt.getBoundingClientRect();
            
            let x = parseInt(container.elt.style.left) || 0;
            let y = parseInt(container.elt.style.top) || 0;
            
            x = Math.max(0, Math.min(x, stageRect.width - containerRect.width));
            y = Math.max(0, Math.min(y, stageRect.height - containerRect.height));
            
            container.position(x, y);
            wordObj.x = x;
            wordObj.y = y;
        }, 16);
    }

    function stopConstrain() {
        if (constrainInterval) {
            clearInterval(constrainInterval);
            constrainInterval = null;
        }
    }

    container.elt.addEventListener('mousedown', startConstrain);
    container.elt.addEventListener('touchstart', startConstrain);
    container.elt.addEventListener('mouseup', stopConstrain);
    container.elt.addEventListener('touchend', stopConstrain);
    container.elt.addEventListener('mouseleave', stopConstrain);

    const wordObj = {
        label: word,
        count: count,
        x: nx,
        y: ny,
        width: labelWidth,
        height: wordHeight,
        element: container,
        wordDiv: wordDiv,
        freqDiv: freqDiv
    };

    words.push(wordObj);

    if (showAnimation) {
        setTimeout(() => {
            const containerWidth = container.elt.offsetWidth;
            const containerHeight = container.elt.offsetHeight;
            
            circleAnimations.push({
                x: nx + containerWidth / 2,
                y: ny + containerHeight / 2,
                startTime: Date.now()
            });
        }, 0);
    }

    return wordObj;
}

function renderHistogram(top) {
    bars = [];
    
    const maxCount = Math.max(...top.map(d => d.count), 1);
    const barWidth = 20;
    const gap = 10;
    const maxBarHeight = graphCanvas.height * 0.45;
    const startX = 20;
    
    const isMobile = window.innerWidth <= 768;
    const baseY = isMobile ? graphCanvas.height * 0.35 : graphCanvas.height * 0.15;
    
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
    const gap = 10;
    const startX = 20;
    
    const nonMovedBars = bars.filter(b => !b.userMoved).sort((a, b) => b.count - a.count);
    const movedBars = bars.filter(b => b.userMoved);
    
    bars = [...nonMovedBars, ...movedBars];
    
    nonMovedBars.forEach((bar, i) => {
        bar.x = startX + i * (barWidth + gap);
    });
}

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
        const maxBarHeight = graphCanvas.height * 0.45;
        const isMobile = window.innerWidth <= 768;
        const baseY = isMobile ? graphCanvas.height * 0.35 : graphCanvas.height * 0.15;
        
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
        const isCapitalized = el.textContent[0] === el.textContent[0].toUpperCase();
        
        if (isMobile) {
            el.textContent = isCapitalized ? 'Tap' : 'tap';
        } else {
            el.textContent = isCapitalized ? 'Click' : 'click';
        }
    });
}

function updateInstructions() {
    const isMobile = window.innerWidth <= 768;
    const instructionsContainer = document.getElementById('dynamic-instructions');
    
    if (!instructionsContainer) return;
    
    if (isMobile) {
        instructionsContainer.innerHTML = `
            <ol>
                <li>Paste text to see ${currentView === 'graph' ? 'a histogram of ' : ''}the most frequently occurring words.</li>
                <li>Drag words${currentView === 'graph' ? '/bars' : ''} anywhere on screen to craft ${currentView === 'graph' ? 'poetic graphs' : 'poetry'}.</li>
                <li>Search for a word to view its frequency within the text.</li>
                <li>Tap a word${currentView === 'graph' ? '/bar' : ''} to delete it.</li>
            </ol>
        `;
    } else if (currentView === 'text') {
        instructionsContainer.innerHTML = `
            <ol>
                <li>Paste text to see the most frequently occurring words.</li>
                <li>Drag words to rearrange into poetry.</li>
                <li>Search for a word to view its frequency within the text.</li>
                <li>Click a word once to visualize its frequency.</li>
                <li>Double-click a word to delete it.</li>
            </ol>
        `;
    } else {
        instructionsContainer.innerHTML = `
            <ol>
                <li>Paste text to see a histogram of the most frequently occurring words.</li>
                <li>Drag bars anywhere on screen to craft poetic graphs.</li>
                <li>Search for a word to view its frequency within the text.</li>
                <li>Double-click a bar to delete it.</li>
            </ol>
        `;
    }
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
    input.classList.remove('has-content');  
    customPlaceholder.style.display = 'block'; 
    clearStage();
    searchWord.value = '';
    searchMessage.textContent = '';
});

searchWord.addEventListener('keypress', (ev) => {
    if (ev.key === 'Enter') {
        performSearch();
    }
});

topWordsCount.addEventListener('change', () => {
    const isMobile = window.innerWidth <= 768;
    const maxAllowed = isMobile 
        ? (currentView === 'graph' ? 13 : 25)
        : (currentView === 'graph' ? 35 : 100); 
    if (parseInt(topWordsCount.value, 10) > maxAllowed) {
        topWordsCount.value = maxAllowed;
    }
});

topWordsCount.addEventListener('input', () => {
    const isMobile = window.innerWidth <= 768;
    const maxAllowed = isMobile 
        ? (currentView === 'graph' ? 13 : 25)
        : (currentView === 'graph' ? 35 : 100);  
    if (parseInt(topWordsCount.value, 10) > maxAllowed) {
        topWordsCount.value = maxAllowed;
    }
});

showFrequency.addEventListener('change', () => {
    words.forEach(word => {
        if (showFrequency.checked) {
            if (!word.freqDiv) {
                word.freqDiv = p5Instance.createDiv(`(${word.count})`);
                word.freqDiv.parent(word.element);
                word.freqDiv.style('font-size', '12px');
                word.freqDiv.style('color', word.count === 0 ? '#999' : '#333');
                word.freqDiv.style('margin', '0');
                word.freqDiv.style('padding', '0');
                word.freqDiv.style('line-height', '1');
                word.freqDiv.style('margin-top', '2px');
                word.freqDiv.style('pointer-events', 'none');
            } else {
                word.freqDiv.style('display', 'block');
            }
        } else {
            if (word.freqDiv) {
                word.freqDiv.style('display', 'none');
            }
        }
    });
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

saveBtn.addEventListener('click', async () => {
    if (currentView === 'text') {
        try {
            const scale = 3;
            
            const stageElement = document.getElementById('stage');
            const stageWidth = stageElement.offsetWidth;
            const stageHeight = stageElement.offsetHeight;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = stageWidth * scale;
            tempCanvas.height = stageHeight * scale;
            const ctx = tempCanvas.getContext('2d', { alpha: false });
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            ctx.drawImage(textCanvas.elt, 0, 0, tempCanvas.width, tempCanvas.height);
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            words.forEach(word => {
                const x = (word.x + word.width / 2) * scale;
                const y = (word.y + 15) * scale;
                
                ctx.font = `${16 * scale}px Times New Roman`;
                ctx.fillStyle = word.count === 0 ? '#999999' : '#000000';
                ctx.fillText(word.label, x, y);
                
                if (showFrequency.checked && word.freqDiv) {
                    ctx.font = `${12 * scale}px Times New Roman`;
                    ctx.fillStyle = word.count === 0 ? '#999999' : '#333333';
                    ctx.fillText(`(${word.count})`, x, y + (15 * scale));
                }
            });
            
            tempCanvas.toBlob((blob) => {
                const link = document.createElement('a');
                link.download = 'reburial.png';
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);
            }, 'image/png', 1.0);
            
        } catch (error) {
            console.error('Error saving canvas:', error);
        }
    } else {
        const activeCanvas = graphCanvas;
        const scale = 3;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = activeCanvas.width * scale;
        tempCanvas.height = activeCanvas.height * scale;
        const ctx = tempCanvas.getContext('2d', { alpha: false });
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(activeCanvas.elt, 0, 0, tempCanvas.width, tempCanvas.height);
        
        tempCanvas.toBlob((blob) => {
            const link = document.createElement('a');
            link.download = 'reburial.png';
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        }, 'image/png', 1.0);
    }
});

if (settingsToggle && settingsContent) {
    settingsToggle.addEventListener('click', () => {
        const isOpen = settingsContent.classList.toggle('open');
        settingsChevron.classList.toggle('open', isOpen);
    });
}

viewToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        viewToggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const view = btn.dataset.view;
        currentView = view;
        
        updateInstructions();
        
        clearStage();
        
        if (view === 'text') {
            textCanvas.elt.style.display = 'block';
            graphCanvas.elt.style.display = 'none';
        } else {
            textCanvas.elt.style.display = 'none';
            graphCanvas.elt.style.display = 'block';
        }
        
        const isMobile = window.innerWidth <= 768;
        const currentValue = parseInt(topWordsCount.value, 10);
        const graphMax = isMobile ? 13 : 35;
        if (view === 'graph' && currentValue > graphMax) {
            topWordsCount.value = graphMax;
        }
        
        const text = input.value.trim();
        if (text) {
            const numTop = parseInt(topWordsCount.value, 10) || 10;
            if (view === 'graph') {
                const { top } = getTopWords(text, numTop, excludeStop.checked);
                renderHistogram(top.map(([word, count]) => ({ word, count })));
            } else {
                const { top } = getTopWords(text, numTop, excludeStop.checked);
                top.forEach(([w, c], idx) => placeWordEl(w, c, idx, top.length, false));
            }
        }
    });
});

// Custom placeholder functionality
const customPlaceholder = document.querySelector('.custom-placeholder');
const exampleLink = document.querySelector('.example-link');

// Handle input focus/blur to show/hide placeholder
input.addEventListener('focus', () => {
    customPlaceholder.style.display = 'none';
});

input.addEventListener('blur', () => {
    if (input.value.trim() === '') {
        customPlaceholder.style.display = 'block';
    }
});

input.addEventListener('input', () => {
    if (input.value.trim() !== '') {
        input.classList.add('has-content');
        customPlaceholder.style.display = 'none';
    } else {
        input.classList.remove('has-content');
        if (document.activeElement !== input) {
            customPlaceholder.style.display = 'block';
        }
    }
});

exampleLink.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
        const textFiles = [
            'No_Gun_Ri_Review_Report.txt',
            'NYT_reporting_on_palestine.txt',
            'NYT_reporting_on_trans_kids.txt'
        ];
        
        const randomFile = textFiles[Math.floor(Math.random() * textFiles.length)];
        
        const response = await fetch(`sample_text/${randomFile}`);
        const text = await response.text();
        input.value = text;
        input.classList.add('has-content');
        customPlaceholder.style.display = 'none';
        input.focus();
        setTimeout(() => {
            input.scrollTop = 0;
        }, 0);
    } catch (error) {
        console.error('Error loading example text:', error);
        alert('Could not load example text. Please check that the file exists in the sample_text folder.');
    }
});

if (input.value.trim() === '') {
    customPlaceholder.style.display = 'block';
} else {
    customPlaceholder.style.display = 'none';
    input.classList.add('has-content');
}

updateClickTapText();
updateInstructions();
window.addEventListener('resize', () => {
    updateClickTapText();
    updateInstructions();
});