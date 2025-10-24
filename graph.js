const input = document.getElementById('inputText');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const stage = document.getElementById('stage');
const excludeStop = document.getElementById('excludeStop');
const topWordsCount = document.getElementById('topWordsCount');
const searchWord = document.getElementById('searchWord');
const searchMessage = document.getElementById('searchMessage');

const STOPWORDS = new Set((
  "a,about,above,after,again,against,all,am,an,and,any,are,aren't,as,at,be,because,been,before,being,below,between,both,but,by,can't,could,couldn't,did,didn't,do,does,doesn't,doing,don't,down,during,each,few,for,from,further,had,hadn't,has,hasn't,have,haven't,having,he,he'd,he'll,he's,her,here,here's,hers,herself,him,himself,his,how,how's,i,i'm,i'd,i'll,i'm,i've,if,in,into,is,isn't,it,it's,its,itself,let's,me,more,most,mustn't,my,myself,no,nor,not,of,off,on,once,only,or,other,ought,our,ours,ourselves,out,over,own,same,shan't,she,she'd,she'll,she's,should,shouldn't,so,some,such,than,that,that's,the,their,theirs,them,themselves,then,there,there's,these,they,they'd,they'll,they're,they've,this,those,through,to,too,under,until,up,very,was,wasn't,we,we'd,we'll,we're,we've,were,weren't,what,what's,when,when's,where,where's,which,while,who,who's,whom,why,why's,with,won't,would,wouldn't,you,you'd,you'll,you're,you've,your,yours,yourself,yourselves,s,t,can,will,just,don,should,now"
).split(','));

// ----------------------
// Utility functions
// ----------------------
/**
 * Normalize a token: strip punctuation (except inner apostrophes), remove
 * digits, normalize apostrophes, and lowercase. Special-case preserves
 * "u.s." when encountered so periods in the abbreviation are kept.
 *
 * @param {string} w - raw token
 * @returns {string} cleaned token (or empty string)
 */
function normalizeWord(w) {
  const orig = String(w || '');
  let cleaned = orig
    .replace(/^[^\p{L}']+|[^\p{L}']+$/gu, '') // trim non-letters from ends
    .replace(/\d+/g, '') // remove digits
    .replace(/['']/g, "'") // normalize apostrophe characters
    .toLowerCase();

  // Preserve common abbreviation U.S. as "u.s." when tokenized
  if (cleaned === 'u.s' || cleaned === 'u.s.') {
    cleaned = 'u.s.';
  }

  return cleaned;
}

/**
 * Compute the top-N words and their frequencies from a block of text.
 * Stopword filtering and single-letter filtering are optional (controlled
 * by excludeCommon).
 *
 * @param {string} text - input text
 * @param {number} [n=10] - how many top words to return
 * @param {boolean} [excludeCommon=true] - whether to filter stopwords
 * @returns {Array<{word:string,count:number}>} sorted descending by count
 */
function getTopWords(text, n = 10, excludeCommon = true) {
  const words = text.split(/\s+/).map(normalizeWord).filter(Boolean);
  const freq = new Map();

  for (const w of words) {
    if (excludeCommon && STOPWORDS.has(w)) continue;
    if (w.length === 1 && excludeCommon) continue; // skip single letters
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  const arr = Array.from(freq.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return arr.slice(0, n).map(([word, count]) => ({ word, count }));
}

/**
 * Clamp the `topWordsCount` input to a safe maximum (50). Keeps UI consistent
 */
function clampTopWords() {
  const val = parseInt(topWordsCount.value, 10);
  if (val > 30) topWordsCount.value = 30;
}

// ----------------------
// Core UI behavior
// ----------------------

/**
 * Compute the pixel height to use for bars. The user asked that the
 * tallest bar be slightly smaller than half the page height so the
 * histogram comfortably fits in the top-left quadrant. We base this on
 * `stage.clientHeight` and apply a safety minimum.
 *
 * @returns {number} pixel height to use for bar containers
 */
function computeBarHeight() {
  const stageH = Math.max(320, stage.clientHeight || 320);
  // 45% of the stage height gives a bit of breathing room under half.
  return Math.max(120, Math.floor(stageH * 0.45));
}

/**
 * Render an interactive histogram for the provided `top` array. Each entry
 * should be an object { word, count }.
 *
 * Bars are created as DOM elements with three vertical sections:
 *  - numeric count (above the fill)
 *  - a colored fill representing relative frequency
 *  - the word label (below)
 *
 * Bars can be dragged (pointer events) — the implementation currently
 * repositions the dragged bar absolutely inside the histogram wrapper.
 * Double-clicking a bar removes it (visual-only).
 *
 * Note: this function manipulates inline styles for simplicity and keeps
 * behavior self-contained to avoid external CSS dependencies beyond basic
 * classes.
 *
 * @param {Array<{word:string,count:number}>} top
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
  // Attach interactions to each bar (kept in a reusable helper so we can
  // attach the same handlers to bars created later by performSearch).
  bars.forEach((bar) => attachBarInteractions(bar, wrapper));

  // wrapper already appended above
}

/**
 * Attach pointer / dblclick handlers to a bar element. This is factored out
 * so dynamically-created bars (e.g. from performSearch) can get the same
 * interaction behavior without re-rendering the whole histogram.
 */
function attachBarInteractions(bar, wrapper) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let startDragX = 0;
  let startDragY = 0;
  let dragMode = null; // 'reorder' or 'free'
  let placeholder = null;
  let lastPointerUp = 0;

  // Create placeholder for reordering
  function createPlaceholder() {
    const ph = document.createElement('div');
    ph.className = 'bar-placeholder';
    ph.dataset.for = bar.dataset.uid || '';
    const rect = bar.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    ph.style.width = w + 'px';
    ph.style.minWidth = w + 'px';
    ph.style.height = h + 'px';
    ph.style.flex = `0 0 ${w}px`;
    ph.style.visibility = 'hidden';
    ph.style.pointerEvents = 'none';
    return ph;
  }

  // Begin drag
  bar.addEventListener('pointerdown', (ev) => {
    console.log('bar:pointerdown', { word: bar.dataset.word });
    isDragging = true;
    dragMode = null; // determine mode after movement
    startDragX = ev.clientX;
    startDragY = ev.clientY;
    try { bar.setPointerCapture(ev.pointerId); } catch (e) {}

    const rect = bar.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    offsetX = ev.clientX - rect.left;
    offsetY = ev.clientY - rect.top;

    if (!bar.dataset.uid) bar.dataset.uid = 'b' + Date.now() + Math.random().toString(36).slice(2, 8);

    bar.style.cursor = 'grabbing'; 
  });

  // Track pointer while dragging
  window.addEventListener('pointermove', (ev) => {
    if (!isDragging) return;

    bar.style.cursor = 'grabbing';

    const dx = Math.abs(ev.clientX - startDragX);
    const dy = Math.abs(ev.clientY - startDragY);

    // Determine drag mode based on initial movement direction
    if (!dragMode && (dx > 5 || dy > 5)) {
      if (dy > dx * 1.5) {
        // Vertical movement - enter free drag mode
        dragMode = 'free';
        placeholder = createPlaceholder();
        if (bar.parentNode) bar.parentNode.insertBefore(placeholder, bar);

        const rect = bar.getBoundingClientRect();
        bar.classList.add('dragging');
        bar.style.width = rect.width + 'px';
        bar.style.height = rect.height + 'px';
        bar.style.position = 'fixed';
        bar.style.left = (ev.clientX - offsetX) + 'px';
        bar.style.top = (ev.clientY - offsetY) + 'px';
        bar.style.zIndex = 1000;
        document.body.appendChild(bar);
      } else {
        // Horizontal movement - enter reorder mode
        dragMode = 'reorder';
        placeholder = createPlaceholder();
        if (bar.parentNode) bar.parentNode.insertBefore(placeholder, bar);

        const rect = bar.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        bar.classList.add('dragging');
        bar.style.position = 'absolute';
        bar.style.left = (rect.left - wrapperRect.left) + 'px';
        bar.style.top = (rect.top - wrapperRect.top) + 'px';
        bar.style.zIndex = 1000;
      }
    }

    if (dragMode === 'free') {
      // Free dragging - move anywhere on page
      bar.style.left = (ev.clientX - offsetX) + 'px';
      bar.style.top = (ev.clientY - offsetY) + 'px';
    } else if (dragMode === 'reorder') {
      // Reordering - move horizontally and update placeholder position
      const wrapperRect = wrapper.getBoundingClientRect();
      const newLeft = ev.clientX - wrapperRect.left - offsetX;
      bar.style.left = newLeft + 'px';

      // Find insertion point based on center X position
      const centerX = ev.clientX;
      let insertBefore = null;
      for (const child of Array.from(wrapper.children)) {
        if (child === bar || child === placeholder) continue;
        if (child.dataset.userMoved === '1') continue; // skip previously dragged bars
        const cRect = child.getBoundingClientRect();
        const cMid = cRect.left + cRect.width / 2;
        if (centerX < cMid) {
          insertBefore = child;
          break;
        }
      }
      if (insertBefore) {
        wrapper.insertBefore(placeholder, insertBefore);
      } else {
        // Append after last non-dragged bar
        const children = Array.from(wrapper.children);
        let lastNonDragged = null;
        for (let i = children.length - 1; i >= 0; i--) {
          if (children[i].dataset.userMoved !== '1' && children[i] !== bar && children[i] !== placeholder) {
            lastNonDragged = children[i];
            break;
          }
        }
        if (lastNonDragged) {
          wrapper.insertBefore(placeholder, lastNonDragged.nextSibling);
        } else {
          wrapper.appendChild(placeholder);
        }
      }
    }
  });

  // End drag
  window.addEventListener('pointerup', (ev) => {
    if (!isDragging) return;

    bar.style.cursor = 'grab';

    isDragging = false;
    bar.classList.remove('dragging');
    try { bar.releasePointerCapture(ev.pointerId); } catch (e) {}

    if (dragMode === 'free') {
      // Keep bar in fixed position where dropped
      bar.dataset.userMoved = '1';
      bar.style.zIndex = 1;
      if (placeholder) placeholder.remove();
      placeholder = null;
      console.log('bar:mark-userMoved', { word: bar.dataset.word });
    } else if (dragMode === 'reorder') {
      // Place bar back in wrapper at placeholder position
      if (placeholder && placeholder.parentNode) {
        wrapper.insertBefore(bar, placeholder);
      }
      bar.style.position = '';
      bar.style.left = '';
      bar.style.top = '';
      bar.style.zIndex = '';
      if (placeholder) placeholder.remove();
      placeholder = null;
    } else {
      // No significant movement - check for double-click
      const now = Date.now();
      if (lastPointerUp && (now - lastPointerUp) < 420) {
        console.log('bar:custom-dblclick-detected', { word: bar.dataset.word });
        bar.classList.add('deleting');
        setTimeout(() => {
          console.log('bar:removed(custom)', { word: bar.dataset.word });
          const ph = wrapper.querySelector('.bar-placeholder[data-for="' + (bar.dataset.uid || '') + '"]');
          if (ph) ph.remove();
          bar.remove();
        }, 200);
        lastPointerUp = 0;
      } else {
        lastPointerUp = now;
      }
    }

    dragMode = null;
  });

  // Double-click removes the bar
  bar.addEventListener('dblclick', (ev) => {
    console.log('bar:dblclick', { word: bar.dataset.word });
    try { if (ev.pointerId) bar.releasePointerCapture(ev.pointerId); } catch (e) {}
    isDragging = false;
    bar.classList.remove('dragging');
    bar.classList.add('deleting');

    setTimeout(() => {
      console.log('bar:removed', { word: bar.dataset.word });
      const ph = wrapper.querySelector('.bar-placeholder[data-for="' + (bar.dataset.uid || '') + '"]');
      if (ph) ph.remove();
      bar.remove();
    }, 300);
  });
}

// ----------------------
// Search and UI wiring
// ----------------------
/**
 * Perform a search for the current `searchWord` inside the `input` text.
 * Displays a message with the count and also inserts the searched word
 * into the histogram (re-sorted) if a histogram already exists.
 */
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

  // compute frequency map for the input text
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

  // If there's no histogram yet, render a single-bar histogram for the query
  const wrapper = stage.querySelector('.hist-wrapper');
  if (!wrapper) {
    renderHistogram([{ word: query, count: count }]);
    searchWord.value = '';
    return;
  }

  // When performSearch is invoked, shift non-dragged bars back into the
  // normal flow by removing any placeholders that were added during drags.
  // Dragged bars themselves remain absolute and keep their visual positions.
  const placeholders = Array.from(wrapper.querySelectorAll('.bar-placeholder'));
  placeholders.forEach((ph) => ph.remove());

  // Append a new bar node for the searched word without re-rendering or
  // resizing existing bars. We insert it into the correct sorted position
  // among non-dragged bars (descending by count) so visual order is
  // maintained. Dragged bars (userMoved) are left in place.
  const barNodes = Array.from(wrapper.querySelectorAll('.bar'));

  // Use constant bar width
  let labelH = 36;
  let barH = computeBarHeight();
  const fixedBarWidth = 20;
  if (barNodes.length > 0 && barNodes[0].style.height) {
    barH = parseInt(barNodes[0].style.height, 10) || barH;
  }

  // Use the original max count from when histogram was first rendered
  const existingMax = parseInt(wrapper.dataset.maxCount, 10) || 1;

  const newBar = document.createElement('div');
  newBar.className = 'bar';
  newBar.dataset.word = query;
  newBar.dataset.count = count;
  // Always use the fixed bar width from when histogram was first rendered
  newBar.style.width = fixedBarWidth + 'px';
  newBar.style.height = barH + 'px';

  const countLabel = document.createElement('div');
  countLabel.className = 'bar-count';
  countLabel.textContent = String(count);
  countLabel.style.fontSize = '12px';
  countLabel.style.lineHeight = '16px';
  countLabel.style.marginBottom = '6px';
  countLabel.style.textAlign = 'center';

  const fill = document.createElement('div');
  fill.className = 'fill';
  // If count > existingMax, cap the visual fill to the full height so
  // existing bars are not rescaled.
  const fillRatio = existingMax > 0 ? Math.min(count, existingMax) / existingMax : 1;
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

  // Find insertion point among non-dragged bars (descending by count).
  const children = Array.from(wrapper.children);
  let inserted = false;
  for (const child of children) {
    const isDragged = child.dataset.userMoved === '1';
    if (isDragged) continue; // skip pinned bars
    const childCount = parseInt(child.dataset.count, 10) || 0;
    if (childCount < count) {
      wrapper.insertBefore(newBar, child);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    // No earlier non-dragged child with smaller count — append after the
    // last non-dragged child, or at end if none.
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
}

// ----------------------
// Event listeners
// ----------------------
analyzeBtn.addEventListener('click', () => {
  const text = input.value.trim();
  const numTop = parseInt(topWordsCount.value, 10) || 10;
  const top = getTopWords(text, numTop, excludeStop.checked);
  
  // Remove any dragged bars that were moved to document.body
  const draggedBars = document.querySelectorAll('.bar[data-user-moved="1"]');
  draggedBars.forEach(bar => bar.remove());
  
  renderHistogram(top);
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  stage.innerHTML = '';
  searchWord.value = '';
  searchMessage.textContent = '';
  
  // Remove any dragged bars that were moved to document.body
  const draggedBars = document.querySelectorAll('.bar[data-user-moved="1"]');
  draggedBars.forEach(bar => bar.remove());
});
searchWord.addEventListener('keypress', (ev) => {
  if (ev.key === 'Enter') performSearch();
});

topWordsCount.addEventListener('change', clampTopWords);
topWordsCount.addEventListener('input', clampTopWords);
