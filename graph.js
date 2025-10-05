// graph.js - histogram view of top words (draggable along x-axis to reorder)
const input = document.getElementById('inputText');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const stage = document.getElementById('stage');
const excludeStop = document.getElementById('excludeStop');

// small set of English stopwords — reuse the same list as script.js
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
    if (w.length === 1) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  const arr = Array.from(freq.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return arr.slice(0, n).map(([word, count]) => ({ word, count }));
}

function renderHistogram(top) {
  stage.innerHTML = '';

  // add axis labels
  const xLabel = document.createElement('div');
  xLabel.className = 'axis-label-x';
  xLabel.textContent = 'word';
  const yLabel = document.createElement('div');
  yLabel.className = 'axis-label-y';
  yLabel.textContent = 'weight';
  stage.appendChild(xLabel);
  stage.appendChild(yLabel);

  const wrapper = document.createElement('div');
  wrapper.className = 'hist-wrapper';
  wrapper.style.height = '100%';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'flex-end';
  wrapper.style.gap = '12px';
  wrapper.style.padding = '12px';
  wrapper.style.paddingLeft = '130px';

  const maxCount = Math.max(...top.map((d) => d.count));

  // create bars data elements in order (most->least)
  const bars = top.map((d, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.dataset.index = i;
    bar.dataset.word = d.word;
    bar.dataset.count = d.count;
    bar.style.width = `${Math.max(28, Math.floor(100 / top.length))}px`;

    // set a reasonable bar height based on stage height so percentage heights work
    const stageH = Math.max(160, stage.clientHeight || 320);
    const labelH = 36;
    const barH = Math.max(120, Math.floor(stageH - 60));
    bar.style.height = barH + 'px';

    // show the numeric frequency above the bar fill
    const countLabel = document.createElement('div');
    countLabel.className = 'bar-count';
    countLabel.textContent = String(d.count);
    countLabel.style.fontSize = '12px';
    countLabel.style.lineHeight = '16px';
    countLabel.style.marginBottom = '6px';
    countLabel.style.textAlign = 'center';

    const fill = document.createElement('div');
    fill.className = 'fill';
    // compute pixel height for fill so it's always visible
    const fillH = Math.round((d.count / maxCount) * (barH - labelH));
    fill.style.height = fillH + 'px';

    const label = document.createElement('div');
    label.className = 'bar-label';
    // show only the word (no parentheses or count)
    label.textContent = d.word;
    label.style.height = '36px';
    label.style.boxSizing = 'border-box';
    label.style.paddingTop = '6px';

    // append count above fill, then fill, then the word label below
    bar.appendChild(countLabel);
    bar.appendChild(fill);
    bar.appendChild(label);

    wrapper.appendChild(bar);
    return bar;
  });

  // make bars draggable along x-axis to reorder
  let dragEl = null;
  let startX = 0;
  let startLeft = 0;
  let placeholder = null;

  function indexOfBar(el) {
    return Array.from(wrapper.children).indexOf(el);
  }

  function createPlaceholder(width) {
    const ph = document.createElement('div');
    ph.style.width = width + 'px';
    ph.style.height = '1px';
    ph.style.display = 'inline-block';
    return ph;
  }

  bars.forEach((bar) => {
    bar.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      dragEl = bar;
      startX = ev.clientX;
      startLeft = dragEl.getBoundingClientRect().left;
      dragEl.classList.add('dragging');
      dragEl.setPointerCapture(ev.pointerId);

      // insert placeholder at current position
      placeholder = createPlaceholder(dragEl.offsetWidth);
      wrapper.insertBefore(placeholder, dragEl.nextSibling);

      // make the element position absolute so we can move it visually
      const rect = dragEl.getBoundingClientRect();
      dragEl.style.position = 'absolute';
      dragEl.style.left = rect.left - wrapper.getBoundingClientRect().left + 'px';
      // keep its vertical placement so it visually stays in the histogram
      dragEl.style.top = rect.top - wrapper.getBoundingClientRect().top + 'px';
      dragEl.style.zIndex = 1000;
      wrapper.appendChild(dragEl);
    });

    window.addEventListener('pointermove', (ev) => {
      if (!dragEl) return;
      const dx = ev.clientX - startX;
      dragEl.style.left = (parseFloat(dragEl.style.left) + dx) + 'px';
      startX = ev.clientX;

      // detect new index by measuring center x against other placeholders/bars
      const centerX = dragEl.getBoundingClientRect().left + dragEl.offsetWidth / 2;
      let insertBefore = null;
      for (const child of Array.from(wrapper.children)) {
        if (child === dragEl) continue;
        if (child === placeholder) continue;
        const cRect = child.getBoundingClientRect();
        const cMid = cRect.left + cRect.width / 2;
        if (centerX < cMid) {
          insertBefore = child;
          break;
        }
      }
      if (insertBefore) wrapper.insertBefore(placeholder, insertBefore);
      else wrapper.appendChild(placeholder);
    });

    window.addEventListener('pointerup', (ev) => {
      if (!dragEl) return;
      dragEl.classList.remove('dragging');
      try { dragEl.releasePointerCapture(ev.pointerId); } catch (e) {}

      // place element back into the wrapper at placeholder position
      wrapper.insertBefore(dragEl, placeholder);
      dragEl.style.position = '';
      dragEl.style.left = '';
      dragEl.style.top = '';
      dragEl.style.zIndex = '';

      placeholder.remove();
      placeholder = null;
      dragEl = null;

      // update dataset/order labels if needed
    });
  });

  stage.appendChild(wrapper);
}

analyzeBtn.addEventListener('click', () => {
  const text = input.value.trim();
  const top = getTopWords(text, 10, excludeStop.checked);
  // order decreasing -> increasing if needed; we render as decreasing left->right
  renderHistogram(top);
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  stage.innerHTML = '';
});

// file drop support
input.addEventListener('dragover', (e) => e.preventDefault());
input.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f && f.type.startsWith('text')) {
    const r = new FileReader();
    r.onload = () => (input.value = r.result);
    r.readAsText(f);
  }
});
