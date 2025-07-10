import { loadConfig, config } from './config.js';
import { loadNifsMap, loadCSV, getYearList } from './data.js';
import { showLoading, hideLoading, resetDashboard, updateUI } from './ui.js';

const pageTitle = document.getElementById('pageTitle');

const yearToggle = document.getElementById('year-toggle');
const menuDashboard = document.getElementById('menuDashboard');
const menuEntities = document.getElementById('menuEntities');
const entitiesPanel = document.getElementById('entitiesPanel');
const mainContent = document.querySelector('main');

const tableBody = document.querySelector("#invoiceTable tbody");
const yearSelect = document.getElementById("yearSelect");
const refreshBtn = document.getElementById("refreshBtn");

let currentYear = new Date().getFullYear();
const quarterTotals = [0, 0, 0, 0];
const nifCounts = {};

let nifsMap = {};

let entitiesSortKey = 'ENTIDADE';
let entitiesSortAsc = true;

menuDashboard.addEventListener('click', () => {
  entitiesPanel.style.display = 'none';
  mainContent.style.display = '';
  if (yearToggle) yearToggle.style.display = '';
  menuDashboard.classList.add('active');
  menuEntities.classList.remove('active');
  // Update header title/icon
  if (pageTitle) pageTitle.innerHTML = '📊 Faturas-Recibo Emitidas';
});

menuEntities.addEventListener('click', async () => {
  mainContent.style.display = 'none';
  entitiesPanel.style.display = '';
  if (yearToggle) yearToggle.style.display = 'none';
  menuEntities.classList.add('active');
  menuDashboard.classList.remove('active');

  // Load and display entities
  nifsMap = await loadNifsMap();
  renderEntitiesTable();
});

menuEntities.addEventListener('click', async () => {
  // Hide dashboard, show entities panel
  mainContent.style.display = 'none';
  entitiesPanel.style.display = '';
  if (yearToggle) yearToggle.style.display = 'none';
  menuEntities.classList.add('active');
  menuDashboard.classList.remove('active');

  // Update header title/icon
  if (pageTitle) pageTitle.innerHTML = '🏢 Lista de Entidades';

  // Load and display entities
  const nifsMap = await loadNifsMap();
  const tbody = document.querySelector('#entitiesTable tbody');
  tbody.innerHTML = '';
  Object.entries(nifsMap).forEach(([id, entity]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${id}</td><td>${entity}</td>`;
    tbody.appendChild(tr);
  });
});

async function setupYearSelector() {
  let years;
  try {
    years = await getYearList();
  } catch (err) {
    //alert("❌ Não foi possível carregar a lista de anos.");
    resetDashboard(tableBody, quarterTotals, nifCounts, config);
    console.error("❌ Não foi possível carregar a lista de anos.", err);
    return;
  }
  yearSelect.innerHTML = "";
  years.forEach(year => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    if (year == currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  });
  yearSelect.addEventListener("change", () => {
    currentYear = yearSelect.value;
    loadAndUpdate();
  });
}

async function loadAndUpdate() {
  showLoading();
  try {
    if (!Object.keys(nifsMap).length) {
      nifsMap = await loadNifsMap();
    }
    const rows = await loadCSV(currentYear, nifsMap);
    updateUI(rows, tableBody, quarterTotals, nifCounts, config);
  } catch (err) {
    //alert("❌ Erro ao carregar CSV para o ano selecionado.");
    resetDashboard(tableBody, quarterTotals, nifCounts, config);
    console.error("❌ Erro ao carregar CSV para o ano selecionado:", err);
  } finally {
    hideLoading();
  }
}

refreshBtn.addEventListener("click", async () => {
  refreshBtn.classList.add("refreshing");
  try {
    await loadAndUpdate();
  } finally {
    setTimeout(() => refreshBtn.classList.remove("refreshing"), 700);
  }
});

// Add event listeners for list of entities sorting
document.getElementById('sortNif').addEventListener('click', () => {
  entitiesSortKey = 'NIF';
  entitiesSortAsc = !entitiesSortAsc;
  renderEntitiesTable();
});

document.getElementById('sortEntidade').addEventListener('click', () => {
  entitiesSortKey = 'ENTIDADE';
  entitiesSortAsc = !entitiesSortAsc;
  renderEntitiesTable();
});

function renderEntitiesTable() {
  const tbody = document.querySelector('#entitiesTable tbody');
  tbody.innerHTML = '';
  // Convert map to array for sorting
  const entitiesArr = Object.entries(nifsMap).map(([id, entity]) => ({ id, entity }));
  entitiesArr.sort((a, b) => {
    let cmp;
    if (entitiesSortKey === 'NIF') {
      cmp = a.id.localeCompare(b.id, 'pt');
    } else {
      cmp = a.entity.localeCompare(b.entity, 'pt');
    }
    return entitiesSortAsc ? cmp : -cmp;
  });
  entitiesArr.forEach(({ id, entity }) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${id}</td><td>${entity}</td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('infoIcon').addEventListener('click', () => {
  document.getElementById('infoDialog').style.display = 'flex';
});

document.getElementById('closeInfoDialog').addEventListener('click', () => {
  document.getElementById('infoDialog').style.display = 'none';
});

// Optional: close dialog when clicking outside the box
document.getElementById('infoDialog').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.style.display = 'none';
  }
});

(async function init() {
  await loadConfig();
  await setupYearSelector();
  await loadAndUpdate();
  menuDashboard.classList.add('active');
})();