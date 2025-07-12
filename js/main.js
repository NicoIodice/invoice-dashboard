import { loadConfig } from './config.js';
import { showLoading, hideLoading } from './utils.js';
import { loadNifsMap, loadClassValues } from './data.js';
import { infoDialogListeners } from './infoDialog.js';
import { setupYearSelector, loadAndUpdateDashboard } from './invoiceDashboard.js';
import { renderClassesTable, classesInfoListeners } from './classesInfo.js';
import { renderSalaryCalendar } from './salarySimulationCalendar.js';
import { renderEntitiesTable, entitiesListListeners } from './entitiesList.js';

const pageTitle = document.getElementById('pageTitle');

const yearToggle = document.getElementById('year-toggle');
const menuDashboard = document.getElementById('menuDashboard');
const menuClasses = document.getElementById('menuClasses');
const menuSalarySimulation = document.getElementById('menuSalarySimulation');
const salarySimulationPanel = document.getElementById('salarySimulationPanel');
const menuEntities = document.getElementById('menuEntities');
const entitiesPanel = document.getElementById('entitiesPanel');
const mainContent = document.querySelector('main');

const classesPanel = document.getElementById('classesPanel');
let nifsMap = {};
let classValues = [];

menuDashboard.addEventListener('click', async () => {
  showLoading();
  try {
    hideAllPanels();
    mainContent.style.display = '';
    if (yearToggle) yearToggle.style.display = '';
    menuDashboard.classList.add('active');
    menuEntities.classList.remove('active');
    menuClasses.classList.remove('active');
    menuSalarySimulation.classList.remove('active');
    if (pageTitle) pageTitle.innerHTML = '📊 Faturas-Recibo Emitidas';
    await loadAndUpdateDashboard(nifsMap);
  } finally {
    hideLoading();
  }
});

// Repeat for other menu handlers:
menuClasses.addEventListener('click', async () => {
  showLoading();
  try {
    hideAllPanels();
    classesPanel.style.display = '';
    if (yearToggle) yearToggle.style.display = 'none';
    menuClasses.classList.add('active');
    menuDashboard.classList.remove('active');
    menuEntities.classList.remove('active');
    menuSalarySimulation.classList.remove('active');
    if (pageTitle) pageTitle.innerHTML = '🏷️ Valores por Aula';
    renderClassesTable(nifsMap, classValues);
  } finally {
    hideLoading();
  }
});

menuSalarySimulation.addEventListener('click', async () => {
  showLoading();
  try {
    hideAllPanels();
    salarySimulationPanel.style.display = '';
    if (yearToggle) yearToggle.style.display = 'none';
    menuSalarySimulation.classList.add('active');
    menuDashboard.classList.remove('active');
    menuEntities.classList.remove('active');
    menuClasses.classList.remove('active');
    if (pageTitle) pageTitle.innerHTML = '🗓️ Simulação Vencimento';
    // Load class values if not loaded
    if (!classValues.length) classValues = await loadClassValues();
    renderSalaryCalendar(nifsMap, classValues);
  } finally {
    hideLoading();
  }
});

menuEntities.addEventListener('click', async () => {
  showLoading();
  try {
    hideAllPanels();
    entitiesPanel.style.display = '';
    if (yearToggle) yearToggle.style.display = 'none';
    menuEntities.classList.add('active');
    menuDashboard.classList.remove('active');
    menuClasses.classList.remove('active');
    menuSalarySimulation.classList.remove('active');
    if (pageTitle) pageTitle.innerHTML = '🏢 Lista de Entidades';
    renderEntitiesTable(nifsMap);
  } finally {
    hideLoading();
  }
});

const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
sidebarToggle.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed');
  // Change icon direction
  if (document.body.classList.contains('sidebar-collapsed')) {
    sidebarToggleIcon.textContent = '➡️';
  } else {
    sidebarToggleIcon.textContent = '⬅️';
  }
});

function hideAllPanels() {
  mainContent.style.display = 'none';
  entitiesPanel.style.display = 'none';
  classesPanel.style.display = 'none';
  salarySimulationPanel.style.display = 'none';
}

(async function init() {
  showLoading();

  // Load configuration
  await loadConfig();

  // Load common data for all pages and panels
  if (!Object.keys(nifsMap).length) {
    nifsMap = await loadNifsMap();
  }

  if (!classValues.length) {
    classValues = await loadClassValues();
  }

  // Load initial data
  await setupYearSelector();
  await loadAndUpdateDashboard(nifsMap);

  menuDashboard.classList.add('active');

  // Setup listeners
  infoDialogListeners();
  classesInfoListeners(nifsMap, classValues);
  entitiesListListeners(nifsMap);

  hideLoading();
})();