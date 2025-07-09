import { loadConfig, config } from './config.js';
import { loadCSV, getYearList } from './data.js';
import { resetDashboard, updateUI } from './ui.js';

const tableBody = document.querySelector("#invoiceTable tbody");
const yearSelect = document.getElementById("yearSelect");
const refreshBtn = document.getElementById("refreshBtn");

let currentYear = new Date().getFullYear();
const quarterTotals = [0, 0, 0, 0];
const nifCounts = {};

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
  try {
    const rows = await loadCSV(currentYear);
    updateUI(rows, tableBody, quarterTotals, nifCounts, config);
  } catch (err) {
    alert("❌ Erro ao carregar CSV para o ano selecionado.");
    resetDashboard(tableBody, quarterTotals, nifCounts, config);
    console.error(err);
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
})();