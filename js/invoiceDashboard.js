import { config } from './config.js';
import { showLoading, hideLoading, formatCurrency, addEmptyStateRow } from './utils.js';
import { loadInvoiceDataFromCSV, getYearList, clearRefreshableCache } from './data.js';

let currentYear = new Date().getFullYear();
let globalNifsMap = {};

const tableBody = document.querySelector("#invoiceTable tbody");
const yearSelect = document.getElementById("yearSelect");
const refreshBtn = document.getElementById("refreshBtn");

const quarterTotals = [0, 0, 0, 0];
const nifCounts = {};

export async function setupYearSelector(nifsMap) {
  globalNifsMap = nifsMap;
  let years;
  try {
    years = await getYearList();
  } catch (err) {
    resetDashboard(tableBody, quarterTotals, nifCounts, config);
    console.error("❌ Não foi possível carregar a lista de anos.", err);
    // Add placeholder option when year list fails to load
    yearSelect.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "-";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    yearSelect.appendChild(placeholderOption);
    return;
  }
  
  yearSelect.innerHTML = "";
  
  // Check if years array is empty or null
  if (!years || years.length === 0) {
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "-";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    yearSelect.appendChild(placeholderOption);
    
    // Reset dashboard since no years are available
    resetDashboard(tableBody, quarterTotals, nifCounts, config);
    return;
  }
  
  // Add year options
  years.forEach(year => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    if (year == currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  });
  
  // Only add event listener if we have valid years
  yearSelect.addEventListener("change", () => {
    currentYear = yearSelect.value;
    loadAndUpdateDashboard(globalNifsMap);
  });
}

export async function loadAndUpdateDashboard(nifsMap) {
  showLoading();
  try {
    window.totalValue = 0;
    const rows = await loadInvoiceDataFromCSV(currentYear, nifsMap);
    updateUI(rows, tableBody, quarterTotals, nifCounts, config);
  } catch (err) {
    // Clear globalNifsMap on error to trigger N/A display
    globalNifsMap = {};
    resetDashboard(tableBody, quarterTotals, nifCounts, config);
    console.error("❌ Erro ao carregar CSV para o ano selecionado:", err);
  } finally {
    hideLoading();
  }
}

// Resets all dashboard panels and table
function resetDashboard(tableBody, quarterTotals, nifCounts, config) {
  tableBody.innerHTML = "";
  quarterTotals.fill(0);
  Object.keys(nifCounts).forEach(k => delete nifCounts[k]);
  window.totalValue = 0;
  updateQuarterSummaryPanel(quarterTotals);
  updateFiscalStatusPanel(config);
  updateInvoicesByNifPanel([], nifCounts);
  document.getElementById("totalYearValue").textContent = formatCurrency(0);
  addEmptyStateRow(tableBody, 6); // 6 columns in invoice table
}

// Updates the main UI with new rows
function updateUI(rows, tableBody, quarterTotals, nifCounts, config) {
  tableBody.innerHTML = "";
  quarterTotals.fill(0);
  Object.keys(nifCounts).forEach(k => delete nifCounts[k]);
  window.totalValue = 0;

  updateInvoicesTable(rows, tableBody, quarterTotals, nifCounts);
  updateQuarterSummaryPanel(quarterTotals, rows);
  updateFiscalStatusPanel(config);
  updateInvoicesByNifPanel(rows, nifCounts);
}

// Updates the invoice table
function updateInvoicesTable(rows, tableBody, quarterTotals, nifCounts) {
  const fragment = document.createDocumentFragment();
  
  for (const row of rows) {
    if (!validateRow(row)) continue;

    const date = new Date(row['DATA SERVICO']);
    const month = date.getMonth();
    const quarter = getQuarter(month);
    const value = parseFloat(row.VALOR);

    quarterTotals[quarter - 1] += value;
    window.totalValue += value;
    nifCounts[row.NIF] = (nifCounts[row.NIF] || 0) + 1;

    const tr = document.createElement("tr");
    tr.classList.add(`quarter-${quarter}`);
    tr.innerHTML = `
      <td>${row.NIF}</td>
      <td>${row.ENTIDADE || '-'}</td>
      <td>${formatCurrency(value)}</td>
      <td>${row['DATA EMISSAO']}</td>
      <td>${row['DATA SERVICO']}</td>
      <td>T${quarter}</td>
    `;
    fragment.appendChild(tr);
  }
  
  tableBody.appendChild(fragment); // Single DOM operation
}

refreshBtn.addEventListener("click", async () => {
  refreshBtn.classList.add("refreshing");
  showLoading();
  try {
    // Clear cache before refreshing
    clearRefreshableCache();
    
    // Reset totalValue immediately
    window.totalValue = 0;
    
    // Reload year list (in case new CSV files were added)
    await setupYearSelector(globalNifsMap);
    
    // Reload current dashboard data
    await loadAndUpdateDashboard(globalNifsMap);
    } catch (error) {
    console.error('❌ Erro durante refresh:', error);
  } finally {
    setTimeout(() => refreshBtn.classList.remove("refreshing"), 700);
    hideLoading();
  }
});

// Updates the quarter summary panel with tooltips
function updateQuarterSummaryPanel(quarterTotals, rows = []) {
  const monthsByQuarter = [
    [0, 1, 2],   // Q1: Jan, Feb, Mar
    [3, 4, 5],   // Q2: Apr, May, Jun
    [6, 7, 8],   // Q3: Jul, Aug, Sep
    [9, 10, 11], // Q4: Oct, Nov, Dec
  ];
  const monthNames = [
    "Janeiro", "Fevereiro", "Março",
    "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro",
    "Outubro", "Novembro", "Dezembro"
  ];

  const monthTotalsByQuarter = monthsByQuarter.map(months => {
    const totals = {};
    months.forEach(m => totals[m] = 0);
    rows.forEach(row => {
      const date = new Date(row['DATA SERVICO']);
      const month = date.getMonth();
      if (months.includes(month)) {
        totals[month] += parseFloat(row.VALOR);
      }
    });
    return totals;
  });

  document.getElementById("quarterSummary").innerHTML = quarterTotals
    .map((val, i) => {
      const monthTotals = monthTotalsByQuarter[i];
      const tooltip = Object.entries(monthTotals)
        .map(([m, total]) =>
          `<div class="quarter-tooltip-row">
            <span class="quarter-tooltip-label">${monthNames[m]}</span>
            <span class="quarter-tooltip-value">${formatCurrency(total)}</span>
          </div>`
        ).join("");
      return `
        <div class="quarter-item">
          <span class="quarter-label quarter-tooltip">
            Trimestre ${i + 1}
            <span class="quarter-tooltip-panel">${tooltip}</span>
          </span>
          <span class="quarter-value">${formatCurrency(val)}</span>
        </div>
      `;
    })
    .join("");

  document.getElementById("totalYearValue").textContent = formatCurrency(window.totalValue);
}

// Updates the fiscal status panel
function updateFiscalStatusPanel(config) {
  const taxPanel = document.getElementById("taxPanel");
  taxPanel.querySelectorAll(".fiscal-item").forEach(el => el.remove());

  const thresholds = [
    { label: "Pagamento IVA", threshold: config.ivaThreshold },
    { label: "Retenção na Fonte", threshold: config.retencaoFonteThreshold },
    { label: "Pagamento IRS", threshold: config.irsThreshold },
  ];

  thresholds.forEach(({ label, threshold }) => {
    const item = document.createElement("div");
    item.className = "fiscal-item";

    const labelSpan = document.createElement("span");
    labelSpan.className = "fiscal-label";
    labelSpan.textContent = label;

    const iconSpan = document.createElement("span");
    iconSpan.className = "fiscal-icon";
    
    // Check if we have valid data and threshold
    // Also check if we have a valid nifsMap (which indicates successful data loading)
    if (window.totalValue !== undefined && window.totalValue !== null && 
        threshold !== undefined && threshold !== null && !isNaN(threshold) &&
        globalNifsMap && Object.keys(globalNifsMap).length > 0) {
      iconSpan.textContent = Number(window.totalValue) > Number(threshold) ? "✅" : "❌";
    } else {
      iconSpan.textContent = "N/A";
      iconSpan.style.color = "#888";
    }

    item.appendChild(labelSpan);
    item.appendChild(iconSpan);
    taxPanel.appendChild(item);
  });
}

// Updates the NIF stats panel with tooltips
function updateInvoicesByNifPanel(rows, nifCounts) {
  const sortedNifs = Object.entries(nifCounts)
    .sort((a, b) => b[1] - a[1]);

  let nifList = '';
  
  if (sortedNifs.length === 0) {
    nifList = '<li style="text-align: center; color: #888; font-style: italic; padding: 1em;">No data available</li>';
  } else {
    nifList = sortedNifs
      .map(([nif, count]) => {
        const entityName = globalNifsMap[nif] || 'Entidade não encontrada';
        return `
          <li class="nif-item">
            <span class="nif-label quarter-tooltip">
              ${entityName}
              <span class="quarter-tooltip-panel" style="min-width: 15em; white-space: normal;">
                <div class="quarter-tooltip-row">
                  <span class="quarter-tooltip-label">NIF</span>
                  <span class="quarter-tooltip-value">${nif}</span>
                </div>
              </span>
            </span>
            <span class="nif-count">${count} fatura(s)</span>
          </li>
        `;
      })
      .join("");
  }
  
  document.getElementById("nifStats").innerHTML = nifList;
  document.getElementById("totalInvoices").innerHTML =
    `<span class="total-value">${rows.length}</span>`;
}

// Helper: get quarter from month (0-based)
function getQuarter(month) {
  if (month <= 2) return 1;
  if (month <= 5) return 2;
  if (month <= 8) return 3;
  return 4;
}

// Helper: validate a row (should be imported or duplicated if needed)
function validateRow(row) {
  const nifValid = row.NIF && /^\d+$/.test(row.NIF.trim());
  const valueValid = /^\d+(\.\d{1,2})?$/.test(row.VALOR);
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(row['DATA SERVICO']);
  return nifValid && valueValid && dateValid;
}