import { loadConfig, config } from './config.js';
import { loadNifsMap, loadCSV, getYearList } from './data.js';
import { showLoading, hideLoading, resetDashboard, updateUI } from './ui.js';

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

menuDashboard.addEventListener('click', () => {
  entitiesPanel.style.display = 'none';
  mainContent.style.display = '';
  if (yearToggle) yearToggle.style.display = '';
  menuDashboard.classList.add('active');
  menuEntities.classList.remove('active');
});

menuEntities.addEventListener('click', async () => {
  // Hide dashboard, show entities panel
  mainContent.style.display = 'none';
  entitiesPanel.style.display = '';
  if (yearToggle) yearToggle.style.display = 'none';
  menuEntities.classList.add('active');
  menuDashboard.classList.remove('active');

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
  } catch (e) {
    alert("❌ Não foi possível carregar a lista de anos.");
    resetDashboard(tableBody, quarterTotals, nifCounts, config);
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
    alert("❌ Erro ao carregar CSV para o ano selecionado.");
    resetDashboard(tableBody, quarterTotals, nifCounts, config);
    console.error(err);
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

(async function init() {
  await loadConfig();
  await setupYearSelector();
  await loadAndUpdate();
  menuDashboard.classList.add('active');
})();