const STORAGE_KEY = "monthlycount:current";
const TICKS_KEY = "monthlycount:ticks";
const LOC_ORDER = ["Chicken Cooler", "Cooler", "Freezer", "Breakfast Meats", "Stockroom", "Stockroom - Biscuits", "Stockroom - Chicken", "Stockroom - Paper", "Stockroom - Sides","Sauce/Condiments", "Drinks", "Cleaning", "Catering", "Virginia", "OLD"];

function fmtNum(n){
  if (Number.isInteger(n)) return String(n);
  return (Math.round(n*100)/100).toString();
}

function computeOnHand(item, counts){
  const c = counts[item.seq] || {};
  const caseC = c.caseCount;
  const looseC = c.looseCount;
  const hasCase = caseC !== undefined && caseC !== "" && !isNaN(caseC);
  const hasLoose = looseC !== undefined && looseC !== "" && !isNaN(looseC);
  if (!hasCase && !hasLoose) return {value:null, formula:null};
  const cv = hasCase ? parseFloat(caseC) : 0;
  const lv = hasLoose ? parseFloat(looseC) : 0;
  const pack = item.pack || 1;
  const onHand = cv + (lv/pack);
  const formula = `${hasCase?fmtNum(cv):'X'} + ${hasLoose?fmtNum(lv):'X'}/${item.pack ?? '—'} = ${fmtNum(onHand)}`;
  return {value:onHand, formula};
}

function isCounted(item, counts){
  const c = counts[item.seq];
  if(!c) return false;
  const hasCase = c.caseCount !== undefined && c.caseCount !== "" && !isNaN(c.caseCount);
  const hasLoose = c.looseCount !== undefined && c.looseCount !== "" && !isNaN(c.looseCount);
  return hasCase || hasLoose;
}

function loadCounts(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(err){
    return {};
  }
}

function saveCounts(counts){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
    return true;
  }catch(err){
    console.error('Save failed', err);
    return false;
  }
}

function loadTicks(){
  try{
    const raw = localStorage.getItem(TICKS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(err){
    return {};
  }
}

function saveTicks(ticks){
  try{
    localStorage.setItem(TICKS_KEY, JSON.stringify(ticks));
    return true;
  }catch(err){
    console.error('Save failed', err);
    return false;
  }
}

function itemsInPosSequence(){
  return [...ITEMS].sort((a,b) => a.seq - b.seq);
}

function buildCSV(counts){
  const rows = [['Seq','Item','On Hand']];
  itemsInPosSequence().forEach(item=>{
    const c = counts[item.seq] || {};
    const {value} = computeOnHand(item, counts);
    rows.push([
      item.seq, item.name, value!==null?fmtNum(value):''
    ]);
  });
  return rows.map(r => r.map(cell => {
    const s = String(cell);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(',')).join('\n');
}

function downloadCSV(counts){
  const csv = buildCSV(counts);
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `monthly-count-${d}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showToast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  t.style.opacity = '1';
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => { t.style.display = 'none'; }, 200);
  }, 1800);
}