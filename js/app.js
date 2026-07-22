let counts = {};
let query = "";
let collapsedLocs = new Set();

function injectModals() {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="modal fade" id="helpModal" tabindex="-1" aria-labelledby="helpModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold" id="helpModalLabel">Count Sheet Instructions</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body small">
            <ul class="mb-0 ps-3">
              <li class="mb-2"><strong>Entering Counts:</strong> Enter full case quantities under <em>Case</em> and individual items under <em>Loose</em>. The <em>On Hand</em> total calculates automatically based on the item pack size.</li>
              <li class="mb-2"><strong>Search:</strong> Use the search bar to filter by item name or sequence number.</li>
              <li class="mb-2"><strong>POS Key-In:</strong> Click <strong>Totals →</strong> to view all counts ordered in POS sequence for fast entry or printing.</li>
              <li class="mb-2"><strong>Exporting:</strong> Click <strong>Download CSV</strong> to save a local spreadsheet file of your completed inventory count.</li>
              <li><strong>Resetting:</strong> Click <strong>Reset</strong> to clear all counts for a new sheet.</li>
            </ul>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-sm btn-dark" data-bs-dismiss="modal">Got it</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="csvModal" tabindex="-1" aria-labelledby="csvModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold" id="csvModalLabel">Export Inventory CSV</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            Download the current inventory count as a CSV file?
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-success" id="confirmCsvBtn">Download</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="resetModal" tabindex="-1" aria-labelledby="resetModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold" id="resetModalLabel">Reset Count Sheet</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            Clear all counts for a fresh count sheet? This action cannot be undone.
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" id="confirmResetBtn">Reset Counts</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('confirmCsvBtn').addEventListener('click', () => {
    downloadCSV(counts);
    const csvModalEl = document.getElementById('csvModal');
    const modalInstance = bootstrap.Modal.getInstance(csvModalEl) || new bootstrap.Modal(csvModalEl);
    modalInstance.hide();
  });

  document.getElementById('confirmResetBtn').addEventListener('click', () => {
    counts = {};
    saveCounts(counts);
    render();

    const resetModalEl = document.getElementById('resetModal');
    const modalInstance = bootstrap.Modal.getInstance(resetModalEl) || new bootstrap.Modal(resetModalEl);
    modalInstance.hide();

    showToast('Count sheet reset');
  });
}

function matchesQuery(item){
  if(!query) return true;
  const q = query.toLowerCase();
  return item.name.toLowerCase().includes(q) || String(item.seq).includes(q);
}

function render(){
  const list = document.getElementById('list');
  const emptyNote = document.getElementById('emptyNote');
  list.innerHTML = "";

  const visible = ITEMS.filter(matchesQuery);
  emptyNote.style.display = visible.length === 0 ? 'block' : 'none';

  const totalCounted = ITEMS.filter(i=>isCounted(i, counts)).length;
  document.getElementById('progressLabel').textContent = `${totalCounted} / ${ITEMS.length} counted`;
  document.getElementById('progressFill').style.width = `${(totalCounted/ITEMS.length*100).toFixed(0)}%`;

  LOC_ORDER.forEach(loc => {
    const items = visible.filter(i => i.location === loc);
    if(items.length === 0) return;

    const section = document.createElement('div');
    section.className = 'loc-section';

    const locCounted = ITEMS.filter(i=>i.location===loc && isCounted(i, counts)).length;
    const locTotal = ITEMS.filter(i=>i.location===loc).length;

    const isCollapsed = query ? false : collapsedLocs.has(loc);

    const header = document.createElement('div');
    header.className = 'loc-header d-flex justify-content-between align-items-center role-button';
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';

    header.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <svg class="loc-chevron" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="transform: ${isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}; transition: transform 0.2s ease;">
          <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
        </svg>
        <span class="loc-title fw-bold">${loc}</span>
      </div>
      <span class="loc-count badge">${locCounted}/${locTotal}</span>
    `;

    header.addEventListener('click', () => {
      if (collapsedLocs.has(loc)) {
        collapsedLocs.delete(loc);
      } else {
        collapsedLocs.add(loc);
      }
      render();
    });

    section.appendChild(header);

    const content = document.createElement('div');
    content.className = 'loc-content';
    if (isCollapsed) {
      content.style.display = 'none';
    }

    items.sort((a,b)=>a.seq-b.seq).forEach(item => {
      content.appendChild(renderItem(item));
    });

    section.appendChild(content);
    list.appendChild(section);
  });
}

function renderItem(item){
  const row = document.createElement('div');
  row.className = 'item-card';
  const c = counts[item.seq] || {};
  const {value, formula} = computeOnHand(item, counts);

  const isDone = value !== null;
  const badgeClass = isDone ? 'is-counted' : 'is-pending';

  row.innerHTML = `
    <div class="item-body">
      <div class="item-header">
        <span class="item-title">${item.name}</span>
        <span class="item-seq">Seq ${item.seq}</span>
      </div>
      <div class="item-pack">${item.packSize || 'No pack size on file'}</div>
      <div class="item-inputs">
        <div class="field-group">
          <label class="field-label">Case</label>
          <input type="number" inputmode="decimal" min="0" step="any" placeholder="0" class="input-count" value="${c.caseCount ?? ''}" data-seq="${item.seq}" data-field="caseCount">
        </div>
        <span class="field-separator">+</span>
        <div class="field-group">
          <label class="field-label">Loose</label>
          <input type="number" inputmode="decimal" min="0" step="any" placeholder="0" class="input-count" value="${c.looseCount ?? ''}" data-seq="${item.seq}" data-field="looseCount">
        </div>
        <div class="field-group on-hand-group">
          <label class="field-label">On hand</label>
          <div class="badge-onhand ${badgeClass}">${value!==null ? fmtNum(value) : '—'}</div>
        </div>
      </div>
      ${formula ? `<div class="item-formula">${formula}</div>` : ''}
    </div>
  `;

  row.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', onInputChange);
  });

  return row;
}

function onInputChange(e){
  const seq = e.target.getAttribute('data-seq');
  const field = e.target.getAttribute('data-field');
  const val = e.target.value;
  if(!counts[seq]) counts[seq] = {};
  counts[seq][field] = val;
  saveCounts(counts);

  const item = ITEMS.find(i => String(i.seq) === String(seq));
  const rowEl = e.target.closest('.item-card');
  const {value, formula} = computeOnHand(item, counts);
  
  const onhandEl = rowEl.querySelector('.badge-onhand');
  
  if (onhandEl) {
    onhandEl.textContent = value !== null ? fmtNum(value) : '—';
    onhandEl.className = `badge-onhand ${value !== null ? 'is-counted' : 'is-pending'}`;
  }

  let formulaEl = rowEl.querySelector('.item-formula');
  if(formula){
    if(!formulaEl){
      formulaEl = document.createElement('div');
      formulaEl.className = 'item-formula';
      rowEl.querySelector('.item-body').appendChild(formulaEl);
    }
    formulaEl.textContent = formula;
  } else if(formulaEl){
    formulaEl.remove();
  }

  const totalCounted = ITEMS.filter(i=>isCounted(i, counts)).length;
  document.getElementById('progressLabel').textContent = `${totalCounted} / ${ITEMS.length} counted`;
  document.getElementById('progressFill').style.width = `${(totalCounted/ITEMS.length*100).toFixed(0)}%`;

  const loc = item.location;
  const locCounted = ITEMS.filter(i=>i.location===loc && isCounted(i, counts)).length;
  const locTotal = ITEMS.filter(i=>i.location===loc).length;
  const headerCountEl = rowEl.closest('.loc-section').querySelector('.loc-count');
  if(headerCountEl) headerCountEl.textContent = `${locCounted}/${locTotal}`;
}

document.getElementById('searchInput').addEventListener('input', (e)=>{
  query = e.target.value;
  render();
});

(function init(){
  injectModals();
  counts = loadCounts();
  collapsedLocs = new Set(LOC_ORDER);
  render();
})();