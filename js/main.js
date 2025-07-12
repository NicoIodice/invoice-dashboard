import { loadConfig } from './config.js';
import { showLoading, hideLoading } from './utils.js';
import { loadNifsMap, loadClassValues } from './data.js';
import { infoDialogListeners } from './infoDialog.js';
import { setupYearSelector, loadAndUpdateDashboard } from './invoiceDashboard.js';
import { renderClassesTable, classesInfoListeners } from './classesInfo.js';
import { renderSalaryCalendar } from './salarySimulationCalendar.js';
import { renderEntitiesTable, entitiesListListeners } from './entitiesList.js';
import { setupMobileTooltips } from './mobileActions.js';

const pageTitle = document.getElementById('pageTitle');

const menuDashboard = document.getElementById('menuDashboard');
const menuClasses = document.getElementById('menuClasses');
const menuSalarySimulation = document.getElementById('menuSalarySimulation');
const menuEntities = document.getElementById('menuEntities');

const invoiceDashboardPanel = document.querySelector('main');
const classesPanel = document.getElementById('classesPanel');
const salarySimulationPanel = document.getElementById('salarySimulationPanel');
const entitiesPanel = document.getElementById('entitiesPanel');

const yearToggle = document.getElementById('year-toggle');

let nifsMap = {};
let classValues = [];

menuDashboard.addEventListener('click', async () => {
  showLoading();
  try {
    hideAllPanels();
    invoiceDashboardPanel.style.display = '';
    if (yearToggle) yearToggle.style.display = '';
    menuDashboard.classList.add('active');
    menuClasses.classList.remove('active');
    menuSalarySimulation.classList.remove('active');
    menuEntities.classList.remove('active');
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
    menuDashboard.classList.remove('active');
    menuClasses.classList.add('active');
    menuSalarySimulation.classList.remove('active');
    menuEntities.classList.remove('active');
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
    menuDashboard.classList.remove('active');
    menuClasses.classList.remove('active');
    menuSalarySimulation.classList.add('active');
    menuEntities.classList.remove('active');
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
    menuDashboard.classList.remove('active');
    menuClasses.classList.remove('active');
    menuSalarySimulation.classList.remove('active');
    menuEntities.classList.add('active');
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
  invoiceDashboardPanel.style.display = 'none';
  classesPanel.style.display = 'none';
  salarySimulationPanel.style.display = 'none';
  entitiesPanel.style.display = 'none';
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
  await setupYearSelector(nifsMap);
  await loadAndUpdateDashboard(nifsMap);

  menuDashboard.classList.add('active');

  // Setup listeners
  infoDialogListeners();
  classesInfoListeners(nifsMap, classValues);
  entitiesListListeners(nifsMap);

  // Setup mobile tooltips
  setupMobileTooltips();

  hideLoading();
})();