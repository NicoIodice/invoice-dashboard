import { loadConfig } from './config.js';
import { loadClassValues } from './data.js';
import { setupYearSelector, loadAndUpdateDashboard } from './invoiceDashboard.js';
import { renderClassesTable } from './classesInfo.js';
import { renderEntitiesTable } from './entitiesList.js';
import { showLoading, hideLoading } from './utils.js';

const PT_MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const PT_WEEKDAYS = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"
];

const pageTitle = document.getElementById('pageTitle');

const yearToggle = document.getElementById('year-toggle');
const menuDashboard = document.getElementById('menuDashboard');
const menuEntities = document.getElementById('menuEntities');
const entitiesPanel = document.getElementById('entitiesPanel');
const mainContent = document.querySelector('main');

const menuClasses = document.getElementById('menuClasses');
const classesPanel = document.getElementById('classesPanel');

let classValues = [];

let currentYearHolidays = [];
const menuSalarySimulation = document.getElementById('menuSalarySimulation');
const salarySimPanel = document.getElementById('salarySimPanel');

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
    await loadAndUpdateDashboard();
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
    classValues = await loadClassValues();
    renderClassesTable(classValues);
  } finally {
    hideLoading();
  }
});

menuSalarySimulation.addEventListener('click', async () => {
  showLoading();
  try {
    hideAllPanels();
    salarySimPanel.style.display = '';
    if (yearToggle) yearToggle.style.display = 'none';
    menuSalarySimulation.classList.add('active');
    menuDashboard.classList.remove('active');
    menuEntities.classList.remove('active');
    menuClasses.classList.remove('active');
    if (pageTitle) pageTitle.innerHTML = '🗓️ Simulação Vencimento';
    // Load class values if not loaded
    if (!classValues.length) classValues = await loadClassValues();
    const currentCalendarYear = new Date().getFullYear();
    currentYearHolidays = await loadYearHolidays(currentCalendarYear);
    renderSalaryCalendar();
    adjustCalendarTooltips();
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
    renderEntitiesTable();
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
  salarySimPanel.style.display = 'none';
}

function renderSalaryCalendar() {
  const container = document.getElementById('salaryCalendar');
  container.innerHTML = '';

  const year = new Date().getFullYear();
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Build table: columns = months, rows = days (1-31)
  const table = document.createElement('table');
  table.className = 'salary-calendar-table';

  // Header row: months
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.innerHTML = `<th>Dia</th>` + PT_MONTHS.map(m => `<th>${m}</th>`).join('');
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body: rows for each day (1-31)
  const tbody = document.createElement('tbody');
  // We'll collect monthly sums here
  const monthlySums = Array(12).fill(0);

  for (let day = 1; day <= 31; day++) {
    const row = document.createElement('tr');
    row.innerHTML = `<th>${day}</th>`;
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      const cell = document.createElement('td');
      if (day > daysInMonth) {
        cell.style.background = '#222'; // Invalid day for this month
      } else {
        const date = new Date(year, monthIdx, day);
        const yyyy_mm_dd = `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        // Highlight current day
        if (day === todayDay && monthIdx === todayMonth && year === todayYear) {
          cell.style.background = '#b3e6ff'; // Light blue highlight
        }
        // Weekend
        if (date.getDay() === 0 || date.getDay() === 6) {
          cell.style.background = cell.style.background || '#fffbe6';
        }
        // Holiday
        if (currentYearHolidays.includes(yyyy_mm_dd)) {
          cell.style.background = '#eee';
        }
        // Weekday label (transparent, optional)
        cell.innerHTML = `<span style="opacity:0.3;font-size:0.8em">${PT_WEEKDAYS[date.getDay()]}</span><br>`;
        // Only show value if not holiday
        if (!currentYearHolidays.includes(yyyy_mm_dd)) {
          const { total, details } = getExpectedValueAndDetailsForDay(classValues, date);
          if (total > 0) {
            // Sort details by time ascending
            const sortedDetails = details.slice().sort((a, b) => {
              // Extract start time as number for sorting (e.g. "14h00-15h00" => 1400)
              const getStart = t => t && t.split('-')[0] ? Number(t.split('-')[0].replace('h','')) : 0;
              return getStart(a.time) - getStart(b.time);
            });

            // Prepare calendar tooltip HTML
            const tooltipHtml = sortedDetails.map(d =>
              `<div>
                ${d.time ? `<span style="color:#2d6cdf;">${d.time}</span> - ` : ''}
                <span style="color:#888;">${nifsMap[d.nif] || d.nif || ''}</span>
                <span style="color:#2d6cdf; font-weight:500;"> ${d.classType || ''}</span>
                <span style="color:#222;"> [${d.value.toFixed(2)} €]</span>
              </div>`
            ).join('');

            cell.classList.add('calendar-tooltip');
            cell.innerHTML += `
              <span style="font-weight:bold">${total.toFixed(2)} €</span>
              <div class="calendar-tooltip-panel">${tooltipHtml}</div>
            `;
            // Add to monthly sum
            monthlySums[monthIdx] += total;
          }
        }
      }
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  // --- Add summary row ---
  const tfoot = document.createElement('tfoot');
  const sumRow = document.createElement('tr');
  sumRow.style.background = '#e3eaf7';
  sumRow.innerHTML = `<th style="font-weight:bold;">Total</th>`;
  let yearTotal = 0;
  for (let m = 0; m < 12; m++) {
    sumRow.innerHTML += `<th style="font-weight:bold;">${monthlySums[m].toFixed(2)} €</th>`;
    yearTotal += monthlySums[m];
  }
  // Add total for the year at the far right
  sumRow.innerHTML += `<th style="font-weight:bold;background:#2d6cdf;color:#fff;">${yearTotal.toFixed(2)} €</th>`;
  tfoot.appendChild(sumRow);
  table.appendChild(tfoot);

  // Add an extra empty header cell to align the year total
  table.querySelector('thead tr').innerHTML += `<th>Total Ano</th>`;

  container.appendChild(table);
}

// Helper to get expected value and details for a given date
function getExpectedValueAndDetailsForDay(classValues, date) {
  let total = 0;
  const weekday = PT_WEEKDAYS[date.getDay()];
  const details = [];
  classValues.forEach(entry => {
    entry.classes.forEach(cls => {
    const weekdayEn = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (cls.day && cls.day.toLowerCase() === weekdayEn) {
        // Check period
        let valid = true;
        if (cls.valuePeriod && cls.valuePeriod.startDate) {
          const [d,m,y] = cls.valuePeriod.startDate.split('-');
          const start = new Date(`${y}-${m}-${d}`);
          if (date < start) valid = false;
        }
        if (cls.valuePeriod && cls.valuePeriod.endDate) {
          const [d,m,y] = cls.valuePeriod.endDate.split('-');
          const end = new Date(`${y}-${m}-${d}`);
          if (date > end) valid = false;
        }
        if (valid) {
          total += Number(cls.value);
          details.push({
            classType: cls.classType,
            value: Number(cls.value),
            nif: entry.nif,
            time: cls.time
          });
        }
      }
    });
  });
  return { total, details };
}

// Add this function after your imports
async function loadYearHolidays(year) {
  try {
    const holidays = await loadHolidays();
    return holidays[year] || [];
  } catch (err) {
    console.error(`❌ Erro ao carregar feriados para ${year}:`, err);
    return [];
  }
}

function adjustCalendarTooltips() {
  // For each tooltip cell, adjust the tooltip position if near the edges
  document.querySelectorAll('.salary-calendar-table tr').forEach(row => {
    row.querySelectorAll('.calendar-tooltip').forEach((cell, colIdx) => {
      const tooltip = cell.querySelector('.calendar-tooltip-panel');
      if (!tooltip) return;
      // Remove all position classes first
      tooltip.classList.remove('top', 'left', 'right');
      // colIdx: 0 = <th>Dia</th>, 1 = Janeiro, ..., 12 = Dezembro
      if (colIdx === 1) {
        // First month column: align left and show above
        tooltip.classList.add('top', 'left');
      } else if (colIdx === 12) {
        // Last month column: align right and show above
        tooltip.classList.add('top', 'right');
      }
    });
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
  await loadAndUpdateDashboard();
  menuDashboard.classList.add('active');
})();