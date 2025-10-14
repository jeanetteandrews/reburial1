const input = document.getElementById('inputText');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const stage = document.getElementById('stage');
const excludeStop = document.getElementById('excludeStop');
const topWordsCount = document.getElementById('topWordsCount');
const searchWord = document.getElementById('searchWord');
const searchMessage = document.getElementById('searchMessage');

// small set of English stopwords — tweakable
const STOPWORDS = new Set(
    (
        "a,about,above,after,again,against,all,am,an,and,any,are,aren't,as,at,be,because,been,before,being,below,between,both,but,by,could,couldn't,did,didn't,do,does,doesn't,doing,don't,down,during,each,few,for,from,further,had,hadn't,has,hasn't,have,haven't,having,he,he'd,he'll,he's,her,here,here's,hers,herself,him,himself,his,how,how's,i,i'm,i'd,i'll,i'm,i've,if,in,into,is,isn't,it,it's,its,itself,let's,me,more,most,mustn't,my,myself,no,nor,not,of,off,on,once,only,or,other,ought,our,ours,ourselves,out,over,own,same,shan't,she,she'd,she'll,she's,should,shouldn't,so,some,such,than,that,that's,the,their,theirs,them,themselves,then,there,there's,these,they,they'd,they'll,they're,they've,this,those,through,to,too,under,until,up,very,was,wasn't,we,we'd,we'll,we're,we've,were,weren't,what,what's,when,when's,where,where's,which,while,who,who's,whom,why,why's,with,won't,would,wouldn't,you,you'd,you'll,you're,you've,your,yours,yourself,yourselves"
    ).split(',')
);

function normalizeWord(w) {
    // keep original for contextual checks (we only want the special-case when the
    // token is exactly the U.S. abbreviation)
    const orig = String(w || '');
    let cleaned = orig
    .replace(/^[^\p{L}']+|[^\p{L}']+$/gu, '')
    .replace(/\d+/g, '')
    .toLowerCase();

    // Special-case: if the token is the U.S. abbreviation (u.s or u.s.),
    // preserve it as 'u.s.' so the second period is kept.
    // We only apply this when the cleaned token is exactly 'u.s' or 'u.s.'
    // to avoid transforming things like 'u.s.-based'.
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
        // ignore single-letter non-words like 'x' unless they are letters a-z? user choice
        if (w.length === 1) continue;
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

    for (let i = 0; i < count; i++) {
        const freqWord = document.createElement('div');
        freqWord.className = 'freq-word';
        freqWord.textContent = word;
        
        const x = Math.random() * (window.innerWidth - 100);
        const y = Math.random() * (window.innerHeight - 50);
        freqWord.style.left = x + 'px';
        freqWord.style.top = y + 'px';
        
        overlay.appendChild(freqWord);
    }

    // Remove overlay after animation completes
    setTimeout(() => {
        overlay.remove();
    }, 1000);
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
    // cnt.textContent = `(${String(count)})`;
    el.appendChild(label);
    // el.appendChild(cnt);

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

    // Single click to visualize frequency (with double-click guard)
    let clickTimeout;
    el.addEventListener('click', (ev) => {
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
            visualizeFrequency(word, count);
        }, 300);
    });

    // bind drag handlers (pointer events)
    let offsetX = 0;
    let offsetY = 0;
    let isDown = false;

    el.addEventListener('pointerdown', (ev) => {
        el.setPointerCapture(ev.pointerId);
        isDown = true;
        el.style.zIndex = 1000;
        offsetX = ev.clientX - el.getBoundingClientRect().left;
        offsetY = ev.clientY - el.getBoundingClientRect().top;
        el.classList.add('dragging');
    });

    window.addEventListener('pointermove', (ev) => {
        if (!isDown) return;
        const stageRect = stage.getBoundingClientRect();
        // compute local coords
        let nx = ev.clientX - stageRect.left - offsetX;
        let ny = ev.clientY - stageRect.top - offsetY;
        // clamp
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

    // double-click to delete
    el.addEventListener('dblclick', () => {
        el.classList.add('deleting');
        setTimeout(() => {
            el.remove();
        }, 300);
    });

    stage.appendChild(el);
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

    const query = searchWord.value.trim().toLowerCase();
    if (!query) {
        searchMessage.textContent = '';
        return;
    }

    const words = text.split(/\s+/).map(normalizeWord).filter(Boolean);
    const freq = new Map();

    for (const w of words) {
        if (w.length === 1) continue;
        freq.set(w, (freq.get(w) || 0) + 1);
    }

    if (freq.has(query)) {
        const count = freq.get(query);
        searchMessage.textContent = '';
        searchMessage.className = 'search-message success';
        
        // add to stage
        placeWordEl(query, count, 0, 1);
        searchWord.value = '';
    } else {
        searchMessage.textContent = `"${query}" does not exist in the text`;
        searchMessage.className = 'search-message error';
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