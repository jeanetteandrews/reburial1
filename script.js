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
    stage.innerHTML = '';
}

function visualizeFrequency(word, count) {
    const overlay = document.createElement('div');
    overlay.className = 'freq-overlay';
    document.body.appendChild(overlay);

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
        const freqWord = document.createElement('div');
        freqWord.className = 'freq-word';
        freqWord.textContent = word;
        
        const x = Math.random() * (window.innerWidth - 100);
        const y = Math.random() * (window.innerHeight - 50);
        freqWord.style.left = x + 'px';
        freqWord.style.top = y + 'px';
        
        fragment.appendChild(freqWord);
    }
    
    overlay.appendChild(fragment);

    setTimeout(() => {
        overlay.remove();
    }, 1000);
}

function placeWordEl(word, count, idx, total) {
    const el = document.createElement('div');
    el.className = 'word';
    el.setAttribute('data-word', word);
    el.setAttribute('data-count', count);
    const label = document.createElement('span');
    label.className = 'word-label';
    label.textContent = word;
    const cnt = document.createElement('span');
    cnt.className = 'word-count';
    cnt.textContent = `(${String(count)})`;
    cnt.style.display = showFrequency.checked ? 'block' : 'none';
    el.appendChild(label);
    el.appendChild(cnt);

    function rectsOverlap(a, b) {
        return !(
            a.left + a.width <= b.left ||
            b.left + b.width <= a.left ||
            a.top + a.height <= b.top ||
            b.top + b.height <= a.top
        );
    }

    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    stage.appendChild(el);
    const elW = el.offsetWidth;
    const elH = el.offsetHeight;
    stage.removeChild(el);

    const existingRects = Array.from(stage.querySelectorAll('.word')).map((other) => {
        return {
            left: parseFloat(other.style.left) || 0,
            top: parseFloat(other.style.top) || 0,
            width: other.offsetWidth,
            height: other.offsetHeight,
        };
    });

    const minX = 0;
    const minY = 0;
    const maxX = Math.max(minX, stage.offsetWidth - elW);
    const maxY = Math.max(minY, stage.offsetHeight - elH);

    let placed = false;
    let nx = minX;
    let ny = minY;

    const MAX_TRIES = 200;
    for (let t = 0; t < MAX_TRIES; t++) {
        nx = Math.random() * (maxX - minX) + minX;
        ny = Math.random() * (maxY - minY) + minY;

        const candidate = { left: nx, top: ny, width: elW, height: elH };
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

    el.style.left = nx + 'px';
    el.style.top = ny + 'px';
    el.style.visibility = '';
    el.style.position = 'absolute';

    let clickTimer;
    let preventSingleClick = false;
    let offsetX = 0;
    let offsetY = 0;
    let isDown = false;
    let startX = 0;
    let startY = 0;
    let hasDragged = false;
    const DBLCLICK_THRESHOLD = 250;

    el.addEventListener('pointerdown', (ev) => {
        el.setPointerCapture(ev.pointerId);
        isDown = true;
        hasDragged = false;
        startX = ev.clientX;
        startY = ev.clientY;
        el.style.zIndex = 1000;
        offsetX = ev.clientX - el.getBoundingClientRect().left;
        offsetY = ev.clientY - el.getBoundingClientRect().top;
        el.classList.add('dragging');
    });

    window.addEventListener('pointermove', (ev) => {
        if (!isDown) return;
        
        const dx = Math.abs(ev.clientX - startX);
        const dy = Math.abs(ev.clientY - startY);
        if (dx > 5 || dy > 5) {
            hasDragged = true;
        }
        
        const stageRect = stage.getBoundingClientRect();
        let nx = ev.clientX - stageRect.left - offsetX;
        let ny = ev.clientY - stageRect.top - offsetY;
        nx = Math.max(0, Math.min(stageRect.width - el.offsetWidth, nx));
        ny = Math.max(0, Math.min(stageRect.height - el.offsetHeight, ny));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
    });

    window.addEventListener('pointerup', (ev) => {
        if (!isDown) return;
        isDown = false;
        try {
            el.releasePointerCapture(ev.pointerId);
        } catch (e) {
            // ignore
        }
        el.style.zIndex = '';
        el.classList.remove('dragging');
    });

    el.addEventListener('click', () => {
        if (hasDragged) {
            hasDragged = false;
            return;
        }
        
        if (preventSingleClick) {
            preventSingleClick = false;
            return;
        }

        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
            visualizeFrequency(word, count);
        }, DBLCLICK_THRESHOLD);
    });

    el.addEventListener('dblclick', () => {
        clearTimeout(clickTimer);
        preventSingleClick = true;
        hasDragged = false;
        el.classList.add('deleting');
        setTimeout(() => {
            el.remove();
        }, 300);
    });

    stage.appendChild(el);
    return el;
}

function renderTop(top) {
    top.forEach(([word, count], i) => {
        const li = document.createElement('div');
        li.className = 'list-item';
        li.dataset.word = word;
        li.innerHTML = `<span>${i + 1}. ${word}</span><strong>${count}</strong>`;

        li.addEventListener('click', () => {
            const el = stage.querySelector(`[data-word='${CSS.escape(word)}']`);
            if (el) {
                el.animate(
                    [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
                    { duration: 300 }
                );
            }
        });
    });
}

// Histogram-related functions
function computeBarHeight() {
  const stageH = Math.max(320, stage.clientHeight || 320);
  // 45% of the stage height gives a bit of breathing room under half.
  return Math.max(120, Math.floor(stageH * 0.45));
}

/**
 * Render an interactive histogram for the provided `top` array. Each entry
 * should be an object { word, count }.
 */
function renderHistogram(top) {
  // clear the stage area and create a wrapper for bars
  stage.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'hist-wrapper';
  wrapper.style.height = '100%';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'flex-end';
  wrapper.style.gap = '12px';
  wrapper.style.padding = '12px';
  // place histogram in the top-left quadrant of the stage (50% width/height)
  wrapper.style.position = 'absolute'; // position relative to `stage`
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = '50%';
  wrapper.style.height = '50%';
  wrapper.style.boxSizing = 'border-box';

  // insert wrapper now so we can measure its computed width when deciding
  // on fixed pixel bar widths. Bars will use a constant pixel width so
  // they don't shrink/expand when the wrapper size changes.
  stage.appendChild(wrapper);

  // find maximum count for scaling (avoid divide-by-zero)
  const maxCount = Math.max(...top.map((d) => d.count), 1);

  // comfortable minimum sizes so UI remains readable even in small viewports
  const labelH = 36; // reserved space for the word label
  const barH = computeBarHeight();

  // Use a constant bar width regardless of number of bars
  const fixedBarWidth = 20;

  // Store the max count on the wrapper so performSearch can use it
  wrapper.dataset.maxCount = maxCount;

  // build bar elements in order (highest -> lowest)
  const bars = top.map((d, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.dataset.index = i;
    bar.dataset.word = d.word;
    bar.dataset.count = d.count;
    // fixed pixel width so bars remain constant
    bar.style.width = fixedBarWidth + 'px';
    bar.style.height = barH + 'px';

    // numeric count above the visual fill
    const countLabel = document.createElement('div');
    countLabel.className = 'bar-count';
    countLabel.textContent = String(d.count);
    countLabel.style.fontSize = '12px';
    countLabel.style.lineHeight = '16px';
    countLabel.style.marginBottom = '6px';
    countLabel.style.textAlign = 'center';
    countLabel.style.display = showFrequency.checked ? 'block' : 'none';

    // visual fill scaled by the maxCount
    const fill = document.createElement('div');
    fill.className = 'fill';
    const fillH = Math.round((d.count / maxCount) * (barH - labelH));
    fill.style.height = Math.max(fillH, d.count > 0 ? 5 : 0) + 'px'; // ensure minimum visible fill

    // label area below the fill
    const label = document.createElement('div');
    label.className = 'bar-label';
    label.textContent = d.word;
    label.style.height = '36px';
    label.style.boxSizing = 'border-box';
    label.style.paddingTop = '6px';

    if (d.count === 0) {
      bar.style.color = 'lightgrey';
      fill.style.backgroundColor = 'lightgrey';
    }

    // assemble the bar
    bar.appendChild(countLabel);
    bar.appendChild(fill);
    bar.appendChild(label);

    wrapper.appendChild(bar);
    return bar;
  });
  // Attach interactions to each bar
  bars.forEach((bar) => attachBarInteractions(bar, wrapper));
}

function attachBarInteractions(bar, wrapper) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let lastPointerUp = 0;

  // Begin drag
  bar.addEventListener('pointerdown', (ev) => {
    // Only allow dragging if clicking on the fill, label, or count
    const fill = bar.querySelector('.fill');
    const label = bar.querySelector('.bar-label');
    const countLabel = bar.querySelector('.bar-count');
    const clickedFill = fill && fill.contains(ev.target);
    const clickedLabel = label && label.contains(ev.target);
    const clickedCount = countLabel && countLabel.contains(ev.target);
    
    if (!clickedFill && !clickedLabel && !clickedCount) {
      return;
    }

    isDragging = true;
    try { bar.setPointerCapture(ev.pointerId); } catch (e) {}

    const rect = bar.getBoundingClientRect();
    offsetX = ev.clientX - rect.left;
    offsetY = ev.clientY - rect.top;

    if (!bar.dataset.uid) bar.dataset.uid = 'b' + Date.now() + Math.random().toString(36).slice(2, 8);

    bar.style.cursor = 'grabbing';
    bar.classList.add('dragging');
    bar.style.position = 'fixed';
    bar.style.width = rect.width + 'px';
    bar.style.height = rect.height + 'px';
    bar.style.left = (ev.clientX - offsetX) + 'px';
    bar.style.top = (ev.clientY - offsetY) + 'px';
    bar.style.zIndex = 1000;
    document.body.appendChild(bar);
  });

  // Track pointer while dragging
  window.addEventListener('pointermove', (ev) => {
    if (!isDragging) return;

    bar.style.left = (ev.clientX - offsetX) + 'px';
    bar.style.top = (ev.clientY - offsetY) + 'px';
  });

  // End drag
  window.addEventListener('pointerup', (ev) => {
    if (!isDragging) return;

    bar.style.cursor = 'grab';
    isDragging = false;
    bar.classList.remove('dragging');
    try { bar.releasePointerCapture(ev.pointerId); } catch (e) {}
    
    bar.dataset.userMoved = '1';
    bar.style.zIndex = 1;
  });

  // Double-click removes the bar
  bar.addEventListener('dblclick', (ev) => {
    try { if (ev.pointerId) bar.releasePointerCapture(ev.pointerId); } catch (e) {}
    isDragging = false;
    bar.classList.remove('dragging');
    bar.classList.add('deleting');

    setTimeout(() => {
      bar.remove();
      rescaleAllBars(wrapper);
    }, 300);
  });
}

/**
 * Recalculate the maximum count from all visible bars and rescale.
 */
function rescaleAllBars(wrapper) {
  const barNodes = Array.from(wrapper.querySelectorAll('.bar'));
  if (barNodes.length === 0) return;

  const newMax = Math.max(...barNodes.map((b) => parseInt(b.dataset.count, 10) || 0), 1);
  wrapper.dataset.maxCount = newMax;

  const labelH = 36;
  const barH = computeBarHeight();

  barNodes.forEach((bar) => {
    const fill = bar.querySelector('.fill');
    const count = parseInt(bar.dataset.count, 10) || 0;
    const fillRatio = count / newMax;
    const fillH = Math.round(fillRatio * (barH - labelH));
    if (fill) {
      fill.style.height = Math.max(fillH, count > 0 ? 5 : 0) + 'px';
    }
  });
}

// Event Listeners
analyzeBtn.addEventListener('click', () => {
    const text = input.value.trim();
    const numTop = parseInt(topWordsCount.value, 10) || 10;
    const { unique, top } = getTopWords(text, numTop, excludeStop.checked);

    clearStage();
    
    // Check current view mode and render accordingly
    if (currentView === 'graph') {
        // Convert top array format from [word, count] to {word, count}
        renderHistogram(top.map(([word, count]) => ({ word, count })));
    } else {
        // Text view - original behavior
        renderTop(top);
        top.forEach(([w, c], idx) => placeWordEl(w, c, idx, top.length));
    }
});

clearBtn.addEventListener('click', () => {
    input.value = '';
    clearStage();
    searchWord.value = '';
    searchMessage.textContent = '';
    document.querySelectorAll('.bar[data-user-moved="1"]').forEach(bar => bar.remove());
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

    // Check if we're in graph view
    const wrapper = stage.querySelector('.hist-wrapper');
    
    if (currentView === 'graph' && wrapper) {
        // Graph view - add bar to histogram
        const placeholders = Array.from(wrapper.querySelectorAll('.bar-placeholder'));
        placeholders.forEach((ph) => ph.remove());

        const barNodes = Array.from(wrapper.querySelectorAll('.bar'));
        let labelH = 36;
        let barH = computeBarHeight();
        const fixedBarWidth = 20;
        
        if (barNodes.length > 0 && barNodes[0].style.height) {
            barH = parseInt(barNodes[0].style.height, 10) || barH;
        }

        const existingMax = parseInt(wrapper.dataset.maxCount, 10) || 1;

        const newBar = document.createElement('div');
        newBar.className = 'bar';
        newBar.dataset.word = query;
        newBar.dataset.count = count;
        newBar.style.width = fixedBarWidth + 'px';
        newBar.style.height = barH + 'px';

        const countLabel = document.createElement('div');
        countLabel.className = 'bar-count';
        countLabel.textContent = String(count);
        countLabel.style.fontSize = '12px';
        countLabel.style.lineHeight = '16px';
        countLabel.style.marginBottom = '6px';
        countLabel.style.textAlign = 'center';
        countLabel.style.display = showFrequency.checked ? 'block' : 'none';

        const fill = document.createElement('div');
        fill.className = 'fill';
        
        let newMax = existingMax;
        if (count > existingMax) {
            newMax = count;
            wrapper.dataset.maxCount = newMax;
            
            barNodes.forEach((existingBar) => {
                if (existingBar.dataset.userMoved === '1') return;
                
                const existingFill = existingBar.querySelector('.fill');
                const existingCount = parseInt(existingBar.dataset.count, 10) || 0;
                const newFillRatio = existingCount / newMax;
                const newFillH = Math.round(newFillRatio * (barH - labelH));
                if (existingFill) {
                    existingFill.style.height = Math.max(newFillH, existingCount > 0 ? 5 : 0) + 'px';
                }
            });
        }
        
        const fillRatio = newMax > 0 ? count / newMax : 1;
        const fillH = Math.round(fillRatio * (barH - labelH));
        fill.style.height = Math.max(fillH, count > 0 ? 5 : 0) + 'px';

        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = query;
        label.style.height = '36px';
        label.style.boxSizing = 'border-box';
        label.style.paddingTop = '6px';

        if (count === 0) {
            newBar.style.color = 'lightgrey';
            fill.style.backgroundColor = 'lightgrey';
        }

        newBar.appendChild(countLabel);
        newBar.appendChild(fill);
        newBar.appendChild(label);

        attachBarInteractions(newBar, wrapper);

        const children = Array.from(wrapper.children);
        let inserted = false;
        for (const child of children) {
            const isDragged = child.dataset.userMoved === '1';
            if (isDragged) continue;
            const childCount = parseInt(child.dataset.count, 10) || 0;
            if (childCount < count) {
                wrapper.insertBefore(newBar, child);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            let lastNonDragged = null;
            for (let i = children.length - 1; i >= 0; i--) {
                if (children[i].dataset.userMoved !== '1') {
                    lastNonDragged = children[i];
                    break;
                }
            }
            if (lastNonDragged) wrapper.insertBefore(newBar, lastNonDragged.nextSibling);
            else wrapper.appendChild(newBar);
        }

        searchWord.value = '';
    } else if (currentView === 'graph' && !wrapper) {
        // No histogram yet - create one with this word
        renderHistogram([{ word: query, count: count }]);
        searchWord.value = '';
    } else {
        // Text view - original behavior
        const wordEl = placeWordEl(query, count, 0, 1);
        if (wordEl) {
            wordEl.classList.add('new-word');
            if (count === 0) {
                wordEl.classList.add('zero-frequency');
            }
        }
        searchWord.value = '';
    }
}

topWordsCount.addEventListener('change', () => {
    const isMobile = window.innerWidth <= 768;
    const maxAllowed = isMobile 
        ? (currentView === 'graph' ? 16 : 50)
        : (currentView === 'graph' ? 30 : 100);
    if (parseInt(topWordsCount.value, 10) > maxAllowed) {
        topWordsCount.value = maxAllowed;
    }
});

topWordsCount.addEventListener('input', () => {
    const isMobile = window.innerWidth <= 768;
    const maxAllowed = isMobile 
        ? (currentView === 'graph' ? 16 : 50)
        : (currentView === 'graph' ? 30 : 100);
    if (parseInt(topWordsCount.value, 10) > maxAllowed) {
        topWordsCount.value = maxAllowed;
    }
});

showFrequency.addEventListener('change', () => {
    const show = showFrequency.checked;
    
    if (currentView === 'text') {
        // Update text view word counts
        const wordCounts = document.querySelectorAll('.word-count');
        wordCounts.forEach(count => {
            count.style.display = show ? 'block' : 'none';
        });
    } else {
        // Update graph view bar counts
        const barCounts = document.querySelectorAll('.bar-count');
        barCounts.forEach(count => {
            count.style.display = show ? 'block' : 'none';
        });
    }
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
  const stage = document.getElementById('stage');
  
  // Temporarily move dragged bars back to stage for screenshot
  const draggedBars = document.querySelectorAll('.bar[data-user-moved="1"]');
  const originalParents = [];
  
  const stageRect = stage.getBoundingClientRect();
  
  draggedBars.forEach(bar => {
    const barRect = bar.getBoundingClientRect();
    
    originalParents.push({
      bar: bar,
      parent: bar.parentNode,
      position: bar.style.position,
      left: bar.style.left,
      top: bar.style.top
    });
    
    // Calculate position relative to stage
    const relativeLeft = barRect.left - stageRect.left;
    const relativeTop = barRect.top - stageRect.top;
    
    // Move to stage with corrected absolute positioning
    bar.style.position = 'absolute';
    bar.style.left = relativeLeft + 'px';
    bar.style.top = relativeTop + 'px';
    stage.appendChild(bar);
  });

  html2canvas(stage).then(canvas => {
    // Restore dragged bars to their original state
    originalParents.forEach(({bar, parent, position, left, top}) => {
      bar.style.position = position;
      bar.style.left = left;
      bar.style.top = top;
      parent.appendChild(bar);
    });
    
    const link = document.createElement('a');
    link.download = 'reburial.png';
    link.href = canvas.toDataURL();
    link.click();
  });
});

// Settings accordion toggle
settingsToggle.addEventListener('click', () => {
  const isOpen = settingsContent.classList.toggle('open');
  settingsChevron.classList.toggle('open', isOpen);
});

// View toggle (Text/Graph)
let currentView = 'text'; // track current view mode

const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
viewToggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    viewToggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const view = btn.dataset.view;
    currentView = view;
    console.log('Switched to:', view);
    
    // Enforce max word limit based on view
    const isMobile = window.innerWidth <= 768;
    const currentValue = parseInt(topWordsCount.value, 10);
    const graphMax = isMobile ? 16 : 30;
    if (view === 'graph' && currentValue > graphMax) {
        topWordsCount.value = graphMax;
    }
    
    // Remove any dragged bars that were moved outside the histogram
    const draggedBars = document.querySelectorAll('.bar[data-user-moved="1"]');
    draggedBars.forEach(bar => bar.remove());
    
    // If there's already analyzed text and user switches views, re-render in new mode
    const text = input.value.trim();
    if (text && stage.children.length > 0) {
      const numTop = parseInt(topWordsCount.value, 10) || 10;
      if (view === 'graph') {
        const { top } = getTopWords(text, numTop, excludeStop.checked);
        renderHistogram(top.map(([word, count]) => ({ word, count })));
      } else {
        const { top } = getTopWords(text, numTop, excludeStop.checked);
        clearStage();
        renderTop(top);
        top.forEach(([w, c], idx) => placeWordEl(w, c, idx, top.length));
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

// Update click/tap text based on screen size
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

// Run on load and resize
updateClickTapText();
window.addEventListener('resize', updateClickTapText);