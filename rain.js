const input = document.getElementById('inputText');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const stage = document.getElementById('stage');
const excludeStop = document.getElementById('excludeStop');
const topWordsCount = document.getElementById('topWordsCount');
const searchWord = document.getElementById('searchWord');
const searchMessage = document.getElementById('searchMessage');

const STOPWORDS = new Set(
    (
        "a,about,above,after,again,against,all,am,an,and,any,are,aren't,as,at,be,because,been,before,being,below,between,both,but,by,can't,could,couldn't,did,didn't,do,does,doesn't,doing,don't,down,during,each,few,for,from,further,had,hadn't,has,hasn't,have,haven't,having,he,he'd,he'll,he's,her,here,here's,hers,herself,him,himself,his,how,how's,i,i'm,i'd,i'll,i'm,i've,if,in,into,is,isn't,it,it's,its,itself,let's,me,more,most,mustn't,my,myself,no,nor,not,of,off,on,once,only,or,other,ought,our,ours,ourselves,out,over,own,same,shan't,she,she'd,she'll,she's,should,shouldn't,so,some,such,than,that,that's,the,their,theirs,them,themselves,then,there,there's,these,they,they'd,they'll,they're,they've,this,those,through,to,too,under,until,up,very,was,wasn't,we,we'd,we'll,we're,we've,were,weren't,what,what's,when,when's,where,where's,which,while,who,who's,whom,why,why's,with,won't,would,wouldn't,you,you'd,you'll,you're,you've,your,yours,yourself,yourselves,s,t,can,will,just,don,should,now"
    ).split(',')
);

function normalizeWord(w) {
  const orig = String(w || '');
  let cleaned = orig
    .replace(/^[^\p{L}\d']+|[^\p{L}\d']+$/gu, '') // trim non-letters/digits from ends
    .replace(/['']/g, "'") // normalize apostrophe characters
    .toLowerCase();

  // Preserve common abbreviation U.S. as "u.s." when tokenized
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
        if (w.length === 1 && excludeCommon) continue;  // Only skip single letters when excluding common words
        freq.set(w, (freq.get(w) || 0) + 1);
    }

    const unique = freq.size;
    const arr = Array.from(freq.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { unique, top: arr.slice(0, n) };
}

function clearStage() {
    stage.innerHTML = '';
}

function visualizeFrequency(word, count, wordElement) {
    const wordRect = wordElement.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    
    // Calculate position relative to stage
    const startX = wordRect.left - stageRect.left + wordRect.width / 2;
    const startY = wordRect.top - stageRect.top + wordRect.height - 13;
    
    // Scale delay based on frequency - higher frequency = faster feed
    let delay;
    if (count <= 50) {
        delay = 20; // Normal speed for low counts
    } else if (count <= 150) {
        delay = 10; // Faster for medium counts
    } else {
        delay = 3; // Very fast for high counts
    }
    
    for (let i = 0; i < count; i++) {
        // Stagger the creation of each drop
        setTimeout(() => {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            
            // Spread drops horizontally around the word
            const spreadX = (Math.random() - 0.55) * 50;
            drop.style.left = (startX + spreadX) + 'px';
            drop.style.top = startY + 'px';
            
            // Randomize animation duration for varied fall speeds
            const duration = 0.6 + Math.random() * 1; // Between 0.6s and 1.6s
            drop.style.animationDuration = duration + 's';
            
            stage.appendChild(drop);
            
            // Remove drop after animation completes
            setTimeout(() => {
                drop.remove();
            }, duration * 1000 + 500);
        }, i * delay); // Use scaled delay
    }
}

function placeWordEl(word, count, idx, total) {
    const el = document.createElement('div');
    el.className = 'word';
    el.setAttribute('data-word', word);
    el.setAttribute('data-count', count);
    // separate label and count so the count can appear below the word in smaller font
    const label = document.createElement('span');
    label.className = 'word-label';
    label.textContent = word;
    const cnt = document.createElement('span');
    cnt.className = 'word-count';
    // show count in parentheses
    cnt.textContent = `(${String(count)})`;
    el.appendChild(label);
    el.appendChild(cnt);

    // place at a random-ish position inside the stage (avoid edges)
    // Try to avoid overlapping existing word elements on initial placement.
    const padding = 20;
    const stageRect = stage.getBoundingClientRect();

    // helper to test rect intersection (a and b in {left, top, width, height})
    function rectsOverlap(a, b) {
        return !(
            a.left + a.width <= b.left ||
            b.left + b.width <= a.left ||
            a.top + a.height <= b.top ||
            b.top + b.height <= a.top
        );
    }

    // Measure element size by temporarily adding it hidden to the stage
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    stage.appendChild(el);
    const elW = el.offsetWidth;
    const elH = el.offsetHeight;
    stage.removeChild(el);

    // Get existing word positions relative to stage content
    const existingRects = Array.from(stage.querySelectorAll('.word')).map((other) => {
        return {
            left: parseFloat(other.style.left) || 0,
            top: parseFloat(other.style.top) || 0,
            width: other.offsetWidth,
            height: other.offsetHeight,
        };
    });

    // Calculate bounds for placement (in stage's local coordinate space)
    const minX = padding;
    const minY = padding;
    const maxX = Math.max(minX, stage.offsetWidth - elW - padding);
    const maxY = Math.max(minY, stage.offsetHeight - elH - padding);

    let placed = false;
    let nx = minX;
    let ny = minY;

    // try several random positions to find a non-overlapping spot
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

    // fallback: if no non-overlapping spot found, clamp to bounds (may overlap)
    if (!placed) {
        nx = Math.min(Math.max(nx, minX), maxX);
        ny = Math.min(Math.max(ny, minY), maxY);
    }

    el.style.left = nx + 'px';
    el.style.top = ny + 'px';
    el.style.visibility = '';
    el.style.position = 'absolute';

    // Track interaction state
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
        
        // Check if mouse has moved significantly (more than 5 pixels)
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

    // Single click to visualize frequency
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
            visualizeFrequency(word, count, el);
        }, DBLCLICK_THRESHOLD);
    });

    // Double-click to delete
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

        // clicking an item highlights the word on stage (if present)
        li.addEventListener('click', () => {
            // find word element
            const el = stage.querySelector(`[data-word='${CSS.escape(word)}']`);
            if (el) {
                // flash
                el.animate(
                    [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
                    { duration: 300 }
                );
            }
        });
    });
}

analyzeBtn.addEventListener('click', () => {
    const text = input.value.trim();
    const numTop = parseInt(topWordsCount.value, 10) || 10;
    const { unique, top } = getTopWords(text, numTop, excludeStop.checked);

    // clear stage
    stage.innerHTML = '';
    // render list
    renderTop(top);
    // place words on stage
    top.forEach(([w, c], idx) => placeWordEl(w, c, idx, top.length));
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

    if (freq.has(query)) {
        const count = freq.get(query);
        searchMessage.textContent = `"${query}" shows up ${count} ${count === 1 ? 'time' : 'times'} in the text`;
        searchMessage.className = 'search-message success';
        
        // add to stage
        const wordEl = placeWordEl(query, count, 0, 1);
        if (wordEl) {
            wordEl.classList.add('new-word');
        }
        searchWord.value = '';
    } else {
        searchMessage.textContent = `"${query}" does not exist in the text`;
        searchMessage.className = 'search-message error';
        
        // add to stage as grey word with count of 0
        const wordEl = placeWordEl(query, 0, 0, 1);
        if (wordEl) {
            wordEl.classList.add('new-word');
            wordEl.style.color = 'lightgrey';
            const countEl = wordEl.querySelector('.word-count');
            if (countEl) {
                countEl.style.color = 'lightgrey';
            }
        }
        searchWord.value = '';
    }
}

topWordsCount.addEventListener('change', () => {
    if (parseInt(topWordsCount.value, 10) > 100) {
        topWordsCount.value = 100;
    }
});

topWordsCount.addEventListener('input', () => {
    if (parseInt(topWordsCount.value, 10) > 100) {
        topWordsCount.value = 100;
    }
});