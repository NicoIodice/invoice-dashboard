import { loadConfig, config } from './config.js';
import { loadNifsMap, loadCSV, getYearList, loadClassValues } from './data.js';
import { showLoading, hideLoading, resetDashboard, updateUI } from './ui.js';

const PT_MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];
const PT_WEEKDAYS = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"
];
const EN_TO_PT_WEEKDAYS = {
  "sunday": "Domingo",
  "monday": "Segunda",
  "tuesday": "Terça",
  "wednesday": "Quarta",
  "thursday": "Quinta",
  "friday": "Sexta",
  "saturday": "Sábado"
};
const PT_HOLIDAYS_2025 = [
  "2025-01-01", "2025-04-18", "2025-04-25", "2025-05-01", "2025-06-10",
  "2025-06-19", "2025-06-24", "2025-08-15", "2025-10-05", "2025-11-01", 
  "2025-12-01", "2025-12-08", "2025-12-25"
  // Add more if needed
];

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

const menuClasses = document.getElementById('menuClasses');
const classesPanel = document.getElementById('classesPanel');

let classValues = [];
let classSortKey = 'entidade';
let classSortAsc = true;

const menuSalarySim = document.getElementById('menuSalarySim');
const salarySimPanel = document.getElementById('salarySimPanel');

let entitiesSortKey = 'ENTIDADE';
let entitiesSortAsc = true;

menuDashboard.addEventListener('click', async () => {
  showLoading();
  try {
    entitiesPanel.style.display = 'none';
    mainContent.style.display = '';
    if (yearToggle) yearToggle.style.display = '';
    menuDashboard.classList.add('active');
    menuEntities.classList.remove('active');
    // Update header title/icon
    if (pageTitle) pageTitle.innerHTML = '📊 Faturas-Recibo Emitidas';
    await loadAndUpdate();
  } finally {
    hideLoading();
  }
});

menuClasses.addEventListener('click', async () => {
  showLoading();
  try {
    mainContent.style.display = 'none';
    entitiesPanel.style.display = 'none';
    classesPanel.style.display = '';
    if (yearToggle) yearToggle.style.display = 'none';
    menuClasses.classList.add('active');
    menuDashboard.classList.remove('active');
    menuEntities.classList.remove('active');
    if (pageTitle) pageTitle.innerHTML = '🏷️ Valores por Aula';
    classValues = await loadClassValues();
    renderClassesTable();
  } finally {
    hideLoading();
  }
});

menuSalarySim.addEventListener('click', async () => {
  showLoading();
  try {
    mainContent.style.display = 'none';
    entitiesPanel.style.display = 'none';
    classesPanel.style.display = 'none';
    salarySimPanel.style.display = '';
    if (yearToggle) yearToggle.style.display = 'none';
    menuSalarySim.classList.add('active');
    menuDashboard.classList.remove('active');
    menuEntities.classList.remove('active');
    menuClasses.classList.remove('active');
    if (pageTitle) pageTitle.innerHTML = '🗓️ Simulação Vencimento';

    // Load class values if not loaded
    if (!classValues.length) classValues = await loadClassValues();
    renderSalaryCalendar();
    adjustCalendarTooltips();
  } finally {
    hideLoading();
  }
});

menuEntities.addEventListener('click', async () => {
  showLoading();
  try {
    mainContent.style.display = 'none';
    entitiesPanel.style.display = '';
    if (yearToggle) yearToggle.style.display = 'none';
    menuEntities.classList.add('active');
    menuDashboard.classList.remove('active');
    // Update header title/icon
    if (pageTitle) pageTitle.innerHTML = '🏢 Lista de Entidades';
    nifsMap = await loadNifsMap();
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

function renderClassesTable() {
  const tbody = document.querySelector('#classesTable tbody');
  tbody.innerHTML = '';
  const arr = [...classValues];

  // Prepare a flat array for sorting and rendering
  const rows = arr.map(entry => {
    const { nif, classes } = entry;
    const entidade = nifsMap[nif] || '-';
    const numClasses = classes.length;
    // Get all unique values per class
    const uniqueValues = [...new Set(classes.map(c => c.value))];
    // Get all endDates (if any)
    const endDates = classes.map(c => c.valuePeriod?.endDate).filter(Boolean);
    // Find the latest endDate (if any)
    let latestEndDate = null;
    if (endDates.length) {
      latestEndDate = endDates
        .map(dateStr => new Date(dateStr.split('-').reverse().join('-')))
        .sort((a, b) => b - a)[0];
    }
    // Check if all classes have an endDate and if current date is after the latest
    const allHaveEndDate = classes.every(c => c.valuePeriod && c.valuePeriod.endDate);
    const now = new Date();
    const expired = allHaveEndDate && latestEndDate && now > latestEndDate;
    return {
      nif,
      entidade,
      numClasses,
      uniqueValues,
      expired
    };
  });

  // Sorting
  rows.sort((a, b) => {
    let cmp;
    if (classSortKey === 'nif') {
      cmp = a.nif.localeCompare(b.nif, 'pt');
    } else if (classSortKey === 'entidade') {
      cmp = a.entidade.localeCompare(b.entidade, 'pt');
    } else if (classSortKey === 'numClasses') {
      cmp = a.numClasses - b.numClasses;
    } else {
      // Sort by first value per class
      cmp = (a.uniqueValues[0] || 0) - (b.uniqueValues[0] || 0);
    }
    return classSortAsc ? cmp : -cmp;
  });

  // Render rows
  rows.forEach(({ nif, entidade, numClasses, uniqueValues, expired }) => {
    const valueCell = uniqueValues.map(v => `${parseFloat(v).toFixed(2)} €`).join(', ');
    const tr = document.createElement('tr');
    if (expired) tr.style.background = '#eee';
    tr.innerHTML = `
      <td>${nif}</td>
      <td>${entidade}</td>
      <td>${numClasses}</td>
      <td>${valueCell}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Sorting event listeners
document.getElementById('sortClassNif').addEventListener('click', () => {
  classSortKey = 'nif';
  classSortAsc = !classSortAsc;
  renderClassesTable();
});

document.getElementById('sortClassEntidade').addEventListener('click', () => {
  classSortKey = 'entidade';
  classSortAsc = !classSortAsc;
  renderClassesTable();
});

document.getElementById('sortClassCount').addEventListener('click', () => {
  classSortKey = 'numClasses';
  classSortAsc = !classSortAsc;
  renderClassesTable();
});

document.getElementById('sortClassValue').addEventListener('click', () => {
  classSortKey = 'value';
  classSortAsc = !classSortAsc;
  renderClassesTable();
});

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
        if (PT_HOLIDAYS_2025.includes(yyyy_mm_dd)) {
          cell.style.background = '#eee';
        }
        // Weekday label (transparent, optional)
        cell.innerHTML = `<span style="opacity:0.3;font-size:0.8em">${PT_WEEKDAYS[date.getDay()]}</span><br>`;
        // Only show value if not holiday
        if (!PT_HOLIDAYS_2025.includes(yyyy_mm_dd)) {
          const { total, details } = getExpectedValueAndDetailsForDay(classValues, date);
          if (total > 0) {
            // Tooltip HTML
            const tooltipHtml = details.map(d =>
              `<div>
                <span style="color:#2d6cdf;font-weight:500;">${d.classType || ''}</span>
                <span style="margin-left:0.5em;">${d.value.toFixed(2)} €</span>
                <span style="margin-left:0.5em;color:#888;">${nifsMap[d.nif] || d.nif || ''}</span>
                <span style="margin-left:0.5em;color:#555;">${d.time ? '(' + d.time + ')' : ''}</span>
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
  await loadAndUpdate();
  menuDashboard.classList.add('active');
})();