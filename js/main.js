import { loadConfig } from './config.js';
import { showLoading, hideLoading } from './utils.js';
import { loadNifsMap, loadClassValues } from './data.js';
import { infoDialogListeners } from './infoDialog.js';
import { setupYearSelector, loadAndUpdateDashboard } from './invoiceDashboard.js';
import { renderClassesInfoTable, classesInfoListeners } from './classesInfo.js';
import { renderSalaryCalendar } from './salarySimulationCalendar.js';
import { renderEntitiesTable, entitiesListListeners } from './entitiesList.js';
import { setupMobileTooltips } from './mobileActions.js';

const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
const sidebar = document.getElementById('sidebar');

const menuInvoiceDashboard = document.getElementById('menuInvoiceDashboard');
const menuClassesInfo = document.getElementById('menuClassesInfo');
const menuSalarySimulation = document.getElementById('menuSalarySimulation');
const menuEntities = document.getElementById('menuEntities');

const pageTitle = document.getElementById('pageTitle');
const yearToggleInvoiceDashboard = document.getElementById('year-toggle-id');

const invoiceDashboardPanel = document.querySelector('main');
const classesInfoPanel = document.getElementById('classesInfoPanel');
const salarySimulationPanel = document.getElementById('salarySimulationPanel');
const entitiesPanel = document.getElementById('entitiesPanel');

let nifsMap = {};
let classValues = [];

// Toggle sidebar manually
sidebarToggle.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed');
  updateSidebarIcon();
});

// Function to update the icon based on sidebar state
function updateSidebarIcon() {
  if (document.body.classList.contains('sidebar-collapsed')) {
    sidebarToggleIcon.textContent = '➡️';
  } else {
    sidebarToggleIcon.textContent = '⬅️';
  }
}

// Listen for clicks outside the sidebar when it's expanded
document.addEventListener('click', (e) => {
  // Only handle this when sidebar is NOT manually collapsed
  if (!document.body.classList.contains('sidebar-collapsed')) {
    // Check if click is outside the sidebar
    if (!sidebar.contains(e.target)) {
      // Sidebar will close due to CSS :hover, so update icon
      // Use a small delay to ensure CSS transition has started
      setTimeout(() => {
        sidebarToggleIcon.textContent = '➡️';
      }, 50);
    }
  }
});

// Listen for mouse enter/leave on sidebar to update icon
sidebar.addEventListener('mouseenter', () => {
  // Only update icon if sidebar is not manually collapsed
  if (!document.body.classList.contains('sidebar-collapsed')) {
    sidebarToggleIcon.textContent = '⬅️';
  }
});

sidebar.addEventListener('mouseleave', () => {
  // Only update icon if sidebar is not manually collapsed
  if (!document.body.classList.contains('sidebar-collapsed')) {
    sidebarToggleIcon.textContent = '➡️';
  }
});

// Initialize icon state
updateSidebarIcon();

menuInvoiceDashboard.addEventListener('click', async () => {
  showLoading();
  try {
    hideAllPanels();
    invoiceDashboardPanel.style.display = '';
    // Show the header year toggle for dashboard panel
    if (yearToggleInvoiceDashboard) yearToggleInvoiceDashboard.style.display = 'flex'; // Changed from '' to 'flex'
    menuInvoiceDashboard.classList.add('active');
    menuClassesInfo.classList.remove('active');
    menuSalarySimulation.classList.remove('active');
    menuEntities.classList.remove('active');
    if (pageTitle) pageTitle.innerHTML = '📊 Faturas-Recibo Emitidas';
    await loadAndUpdateDashboard(nifsMap);
  } finally {
    hideLoading();
  }
});

menuClassesInfo.addEventListener('click', async () => {
  showLoading();
  try {
    hideAllPanels();
    classesInfoPanel.style.display = 'block'; // Changed from '' to 'block'
    // Hide the header year toggle for classes panel
    if (yearToggleInvoiceDashboard) yearToggleInvoiceDashboard.style.display = 'none';
    menuInvoiceDashboard.classList.remove('active');
    menuClassesInfo.classList.add('active');
    menuSalarySimulation.classList.remove('active');
    menuEntities.classList.remove('active');
    if (pageTitle) pageTitle.innerHTML = '🏷️ Valores por Aula';
    renderClassesInfoTable(nifsMap, classValues);
  } finally {
    hideLoading();
  }
});

menuSalarySimulation.addEventListener('click', async () => {
  showLoading();
  try {
    hideAllPanels();
    salarySimulationPanel.style.display = 'block'; // Changed from '' to 'block'
    // Hide the header year toggle for salary simulation panel
    if (yearToggleInvoiceDashboard) yearToggleInvoiceDashboard.style.display = 'none';
    menuInvoiceDashboard.classList.remove('active');
    menuClassesInfo.classList.remove('active');
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
    entitiesPanel.style.display = 'block'; // Changed from '' to 'block'
    // Hide the header year toggle for entities panel
    if (yearToggleInvoiceDashboard) yearToggleInvoiceDashboard.style.display = 'none';
    menuInvoiceDashboard.classList.remove('active');
    menuClassesInfo.classList.remove('active');
    menuSalarySimulation.classList.remove('active');
    menuEntities.classList.add('active');
    if (pageTitle) pageTitle.innerHTML = '🏢 Lista de Entidades';
    renderEntitiesTable(nifsMap);
  } finally {
    hideLoading();
  }
});

function hideAllPanels() {
  invoiceDashboardPanel.style.display = 'none';
  classesInfoPanel.style.display = 'none';
  salarySimulationPanel.style.display = 'none';
  entitiesPanel.style.display = 'none';
}

(async function init() {
  showLoading();

  try {
    // Load config first
    await loadConfig();
    
    // Show basic UI immediately
    menuInvoiceDashboard.classList.add('active');
    infoDialogListeners();
    setupMobileTooltips();

    // Load data progressively
    const dataPromises = [
      loadNifsMap(),
      loadClassValues()
    ];

    // Update UI as data becomes available
    const [nifsMapResult, classValuesResult] = await Promise.all(dataPromises);
    nifsMap = nifsMapResult;
    classValues = classValuesResult;

    // Setup dashboard
    await setupYearSelector(nifsMap);
    await loadAndUpdateDashboard(nifsMap);

    // Setup remaining listeners
    classesInfoListeners(nifsMap, classValues);
    entitiesListListeners(nifsMap);

  } catch (error) {
    console.error('❌ Erro durante inicialização:', error);
  } finally {
    hideLoading();
  }
})();