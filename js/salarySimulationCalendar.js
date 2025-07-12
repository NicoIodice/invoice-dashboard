import { loadHolidays } from './data.js';

const PT_MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const PT_WEEKDAYS = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"
];

// Cache for performance
let currentYearHolidays = [];
let cachedYear = null;

export async function renderSalaryCalendar(nifsMap, classValues) {
  const year = new Date().getFullYear();
  
  // Check if we need to reload holidays
  if (cachedYear !== year) {
    currentYearHolidays = await loadYearHolidays(year);
    cachedYear = year;
  }

  const container = document.getElementById('salaryCalendar');
  container.innerHTML = '';

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Pre-calculate class data by day of week (optimization)
  const classByWeekday = preCalculateClassesByWeekday(classValues);
  
  // Pre-calculate holidays set for O(1) lookup
  const holidaySet = new Set(currentYearHolidays);
  
  // Pre-calculate days in each month
  const daysInMonths = Array.from({ length: 12 }, (_, i) => 
    new Date(year, i + 1, 0).getDate()
  );

  // Build table structure
  const table = document.createElement('table');
  table.className = 'salary-calendar-table';

  // Header row
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.innerHTML = `<th>Dia</th>${PT_MONTHS.map(m => `<th>${m}</th>`).join('')}<th>Total Ano</th>`;
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body and summary calculation
  const tbody = document.createElement('tbody');
  const monthlySums = Array(12).fill(0);
  
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  for (let day = 1; day <= 31; day++) {
    const row = document.createElement('tr');
    const dayCell = document.createElement('th');
    dayCell.textContent = day;
    row.appendChild(dayCell);

    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const cell = document.createElement('td');
      
      if (day > daysInMonths[monthIdx]) {
        cell.style.background = '#222';
      } else {
        const date = new Date(year, monthIdx, day);
        const weekday = date.getDay();
        const yyyy_mm_dd = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Style cell
        styleDateCell(cell, day, monthIdx, year, todayDay, todayMonth, todayYear, weekday, holidaySet.has(yyyy_mm_dd));
        
        // Add weekday label
        cell.innerHTML = `<span style="opacity:0.3;font-size:0.8em">${PT_WEEKDAYS[weekday]}</span><br>`;
        
        // Calculate values only if not holiday
        if (!holidaySet.has(yyyy_mm_dd)) {
          const { total, details } = getExpectedValueForWeekday(classByWeekday, weekday, date, classValues);

          if (total > 0) {
            addTooltipToCell(cell, total, details);
            monthlySums[monthIdx] += total;
          }
        }
      }
      row.appendChild(cell);
    }
    fragment.appendChild(row);
  }
  
  tbody.appendChild(fragment);
  table.appendChild(tbody);

  // Add summary row
  addSummaryRow(table, monthlySums);

  container.appendChild(table);
  
  // Use requestAnimationFrame for tooltip adjustment to avoid blocking
  requestAnimationFrame(() => adjustCalendarTooltips());
}

// Pre-calculate classes by weekday for O(1) lookup
function preCalculateClassesByWeekday(classValues) {
  const classByWeekday = {};
  
  // Initialize arrays for each weekday
  for (let i = 0; i < 7; i++) {
    classByWeekday[i] = [];
  }
  
  const weekdayMap = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };
  
  classValues.forEach(entry => {
    entry.classes.forEach(cls => {
      if (cls.day) {
        const weekdayIndex = weekdayMap[cls.day.toLowerCase()];
        if (weekdayIndex !== undefined) {
          classByWeekday[weekdayIndex].push({
            ...cls,
            nif: entry.nif,
            vacationPeriods: entry.vacationPeriods || []
          });
        }
      }
    });
  });
  
  return classByWeekday;
}

// Optimized value calculation for a specific weekday
function getExpectedValueForWeekday(classByWeekday, weekday, date, classValues) {
  const classes = classByWeekday[weekday] || [];
  let total = 0;
  const details = [];
  
  classes.forEach(cls => {
    // Check if this class is in vacation period
    const entry = classValues.find(entry => entry.nif === cls.nif);
    const isInVacation = entry && entry.vacationPeriods && entry.vacationPeriods.some(vacation => {
      const startDate = new Date(vacation.startDate + 'T00:00:00');
      const endDate = new Date(vacation.endDate + 'T23:59:59');
      return date >= startDate && date <= endDate;
    });
    
    if (!isInVacation) {
      // Only add to active classes if not in vacation
      total += Number(cls.value) || 0;
      details.push({
        classType: cls.classType,
        value: Number(cls.value) || 0,
        nif: cls.nif,
        time: cls.time
      });
    }
  });
  
  // Sort details by time once
  details.sort((a, b) => {
    const getStart = t => t && t.split('-')[0] ? Number(t.split('-')[0].replace('h', '')) : 0;
    return getStart(a.time) - getStart(b.time);
  });
  
  return { total, details };
}

// Optimized cell styling
function styleDateCell(cell, day, monthIdx, year, todayDay, todayMonth, todayYear, weekday, isHoliday) {
  // Current day highlight
  if (day === todayDay && monthIdx === todayMonth && year === todayYear) {
    cell.style.background = '#b3e6ff';
  }
  // Weekend
  else if (weekday === 0 || weekday === 6) {
    cell.style.background = '#fffbe6';
  }
  // Holiday
  else if (isHoliday) {
    cell.style.background = '#eee';
  }
}

// Optimized tooltip addition
function addTooltipToCell(cell, total, details) {
  const tooltipHtml = details.map(d =>
    `<div>
      ${d.time ? `<span style="color:#2d6cdf;">${d.time}</span> - ` : ''}
      <span style="color:#888;">${d.nif || ''}</span>
      <span style="color:#2d6cdf; font-weight:500;"> ${d.classType || ''}</span>
      <span style="color:#222;"> [${d.value.toFixed(2)} €]</span>
    </div>`
  ).join('');

  cell.classList.add('calendar-tooltip');
  cell.innerHTML += `
    <span style="font-weight:bold">${total.toFixed(2)} €</span>
    <div class="calendar-tooltip-panel">${tooltipHtml}</div>
  `;
}

// Optimized summary row
function addSummaryRow(table, monthlySums) {
  const tfoot = document.createElement('tfoot');
  const sumRow = document.createElement('tr');
  sumRow.style.background = '#e3eaf7';
  
  let yearTotal = 0;
  let rowHTML = '<th style="font-weight:bold;">Total</th>';
  
  for (let m = 0; m < 12; m++) {
    rowHTML += `<th style="font-weight:bold;">${monthlySums[m].toFixed(2)} €</th>`;
    yearTotal += monthlySums[m];
  }
  
  rowHTML += `<th style="font-weight:bold;background:#2d6cdf;color:#fff;">${yearTotal.toFixed(2)} €</th>`;
  sumRow.innerHTML = rowHTML;
  
  tfoot.appendChild(sumRow);
  table.appendChild(tfoot);
}

// Cached holiday loading
async function loadYearHolidays(year) {
  try {
    const holidays = await loadHolidays();
    return holidays[year] || [];
  } catch (err) {
    console.error(`❌ Erro ao carregar feriados para ${year}:`, err);
    return [];
  }
}

// Optimized tooltip adjustment
function adjustCalendarTooltips() {
  const tooltips = document.querySelectorAll('.salary-calendar-table .calendar-tooltip');
  
  tooltips.forEach((cell, index) => {
    const tooltip = cell.querySelector('.calendar-tooltip-panel');
    if (!tooltip) return;
    
    // Calculate column index more efficiently
    const row = cell.parentElement;
    const colIdx = Array.from(row.children).indexOf(cell);
    
    tooltip.classList.remove('top', 'left', 'right');
    
    if (colIdx === 1) { // First month
      tooltip.classList.add('top', 'left');
    } else if (colIdx === 12) { // Last month
      tooltip.classList.add('top', 'right');
    }
  });
}