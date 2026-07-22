let counts = {};

function render() {
  const list = document.getElementById('totalsList');
  list.innerHTML = "";

  const items = itemsInPosSequence();

  const totalCounted = items.filter(i => computeOnHand(i, counts).value !== null).length;
  const progressLabel = document.getElementById('progressLabel');
  if (progressLabel) progressLabel.textContent = `${totalCounted} / ${items.length} counted`;
  
  const progressFill = document.getElementById('progressFill');
  if (progressFill) progressFill.style.width = `${(totalCounted / items.length * 100).toFixed(0)}%`;

  items.forEach(item => {
    list.appendChild(renderRow(item));
  });
}

function renderRow(item) {
  const { value } = computeOnHand(item, counts);
  const notCounted = value === null;

  const row = document.createElement('div');
  row.className = 'totals-row';
  row.innerHTML = `
    <span class="row-seq">${item.seq}</span>
    <span class="row-name">${item.name}</span>
    <span class="row-value ${notCounted ? 'is-empty' : ''}">${notCounted ? '—' : fmtNum(value)}</span>
  `;

  return row;
}

function buildTotalsText() {
  const lines = [`Totals by POS Sequence — ${new Date().toLocaleDateString()}`, ''];
  itemsInPosSequence().forEach(item => {
    const { value } = computeOnHand(item, counts);
    lines.push(`${item.seq}\t${item.name}\t${value !== null ? fmtNum(value) : ''}`);
  });
  return lines.join('\n');
}

const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(buildTotalsText());
      showToast('Totals copied to clipboard');
    } catch (err) {
      showToast('Could not copy — select and copy manually');
    }
  });
}

const csvBtn = document.getElementById('csvBtn');
if (csvBtn) {
  csvBtn.addEventListener('click', () => {
    downloadCSV(counts);
  });
}

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (!confirm('Clear all counts for a fresh count sheet? This cannot be undone.')) return;
    counts = {};
    saveCounts(counts);
    render();
    showToast('Count sheet reset');
  });
}

(function init() {
  counts = loadCounts();
  render();
})();

document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});

window.addEventListener('beforeprint', () => {
  const timestampEl = document.getElementById('printTimestamp');
  if (timestampEl) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    timestampEl.textContent = `Printed on ${formattedDate} at ${formattedTime}`;
  }
});

window.addEventListener('afterprint', () => {
  const timestampEl = document.getElementById('printTimestamp');
  if (timestampEl) {
    timestampEl.textContent = '';
  }
});