import { 
  getConfig,
  getYearsList,
  getNifsMap,
  getInvoiceData,
  refreshAll
 } from '../dataStorage.js';
import { 
  formatCurrency, 
  addEmptyStateRow } from '../utils.js';
import { 
  showErrorToaster, 
  showSuccessToaster } from '../toaster.js';
import router from '../router.js';

let currentYear = new Date().getFullYear();

let tableBody = null;
let yearSelect = null;

const quarterTotals = [0, 0, 0, 0];
const nifCounts = {};

let pieChart = null;

export async function init() {
  try {
    tableBody = document.querySelector("#invoiceTable tbody");
    yearSelect = document.getElementById("yearSelect");

    // Setup year selector
    await setupYearSelector();
    
    // Load dashboard data
    await loadAndUpdateDashboard();
    
    // Setup event listeners
    setupRefreshButton();
    setupInfoDialog();
    
  } catch (error) {
    console.error('❌ Error initializing invoice dashboard:', error);
    showErrorToaster('Erro ao inicializar dashboard de facturas');
  }
}

export async function cleanup() {
  // Cleanup any timers, event listeners, etc.
  console.log('🧹 Cleaning up invoice dashboard');
}

function setupInfoDialog() {
  const infoIcon = document.getElementById('infoIcon');
  const infoDialog = document.getElementById('infoDialog');
  const closeInfoDialog = document.getElementById('closeInfoDialog');

  if (infoIcon) {
    infoIcon.addEventListener('click', () => {
      infoDialog.style.display = 'flex';
    });
  }

  if (closeInfoDialog) {
    closeInfoDialog.addEventListener('click', () => {
      infoDialog.style.display = 'none';
    });
  }

  // Close dialog when clicking outside
  infoDialog?.addEventListener('click', (e) => {
    if (e.target === infoDialog) {
      infoDialog.style.display = 'none';
    }
  });
}

function setupRefreshButton() {
  const refreshBtn = document.getElementById("refreshBtn");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.classList.add("refreshing");
      router.showLoading();
      try {
        // Clear cache before refreshing
        refreshAll();
        
        // Reset totalValue immediately
        window.totalValue = 0;
        
        // Reload year list (in case new CSV files were added)
        await setupYearSelector();
        
        // Reload current dashboard data
        await loadAndUpdateDashboard();
        showSuccessToaster("Dados atualizados com sucesso!");
        } catch (error) {
        console.error('❌ Erro durante refresh:', error);
        showErrorToaster("Erro ao atualizar dados: " + (error.message || "Erro desconhecido"));
      } finally {
        setTimeout(() => refreshBtn.classList.remove("refreshing"), 700);
        router.hideLoading();
      }
    });
  }
}

async function setupYearSelector() {
  let years;
  try {
    years = getYearsList();
  } catch (err) {
    resetDashboard(tableBody, quarterTotals, nifCounts);
    console.error("❌ Não foi possível carregar a lista de anos.", err);
    showErrorToaster("Erro ao carregar lista de anos: " + (err.message || "Erro desconhecido"));
    
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
    resetDashboard(tableBody, quarterTotals, nifCounts);
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
    loadAndUpdateDashboard();
  });
}

async function loadAndUpdateDashboard() {
  router.showLoading();
  try {
    window.totalValue = 0;
    const rows = await getInvoiceData(currentYear);
    updateUI(rows, tableBody, quarterTotals, nifCounts);
  } catch (err) {
    resetDashboard(tableBody, quarterTotals, nifCounts);
    console.error(`❌ Erro ao carregar dados de faturas para o ano selecionado: ${currentYear}`, err);
    showErrorToaster(`Erro ao carregar dados de faturas para o ano seleccionado ${currentYear}: ${err.message || "Erro desconhecido"}`);
  }finally {
    router.hideLoading();
  }
}

// Resets all dashboard panels and table
function resetDashboard(tableBody, quarterTotals, nifCounts) {
  tableBody.innerHTML = "";
  quarterTotals.fill(0);
  Object.keys(nifCounts).forEach(k => delete nifCounts[k]);
  window.totalValue = 0;
  updateQuarterSummaryPanel(quarterTotals);
  updateFiscalStatusPanel();
  updateInvoicesByNifPanel([], nifCounts);
  document.getElementById("totalYearValue").textContent = formatCurrency(0);
  addEmptyStateRow(tableBody, 6);
  updatePieChart([]);
}

// Updates the main UI with new rows
function updateUI(rows, tableBody, quarterTotals, nifCounts) {
  tableBody.innerHTML = "";
  quarterTotals.fill(0);
  Object.keys(nifCounts).forEach(k => delete nifCounts[k]);
  window.totalValue = 0;

  updateInvoicesTable(rows, tableBody, quarterTotals, nifCounts);
  updateQuarterSummaryPanel(quarterTotals, rows);
  updateFiscalStatusPanel();
  updateInvoicesByNifPanel(rows, nifCounts);
  updatePieChart(rows); // Add this line
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
    
    // Get entity name from NIF map, fallback to NIF if no match
    let nifsMap = getNifsMap();
    const entityName = nifsMap[row.NIF] || row.NIF;

    const tr = document.createElement("tr");
    tr.classList.add(`quarter-${quarter}`);
    tr.innerHTML = `
      <td>${entityName}</td>
      <td>${formatCurrency(value)}</td>
      <td>${row['DATA EMISSAO']}</td>
      <td>${row['DATA SERVICO']}</td>
    `;
    fragment.appendChild(tr);
  }
  
  tableBody.appendChild(fragment); // Single DOM operation
}

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
function updateFiscalStatusPanel() {
  const taxPanel = document.getElementById("taxPanel");
  taxPanel.querySelectorAll(".fiscal-item").forEach(el => el.remove());
  const config = getConfig();
  
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
    let nifsMap = getNifsMap();
    if (window.totalValue !== undefined && window.totalValue !== null && 
        threshold !== undefined && threshold !== null && !isNaN(threshold) &&
        nifsMap && Object.keys(nifsMap).length > 0) {
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
    let nifsMap = getNifsMap();
    nifList = sortedNifs
      .map(([nif, count]) => {
        const entityName = nifsMap[nif] || 'Entidade não encontrada';
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

// Helper function to generate distinct colors
function generateColors(count) {
  const colors = [];
  const hueStep = 360 / count;
  
  for (let i = 0; i < count; i++) {
    const hue = i * hueStep;
    const saturation = 65 + (i % 3) * 10; // Vary saturation slightly
    const lightness = 50 + (i % 2) * 10;  // Vary lightness slightly
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  
  return colors;
}

// Pie chart creation and management
function createPieChart(data) {
  const canvas = document.getElementById('pieChart');
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('pieChartTooltip');
  const legend = document.getElementById('pieChartLegend');
  
  // Clear previous chart
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  legend.innerHTML = '';
  
  if (!data || data.length === 0) {
    // Show empty state
    ctx.fillStyle = '#ccc';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sem dados disponíveis', canvas.width / 2, canvas.height / 2);
    return;
  }
  
  // Calculate total and percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = generateColors(data.length);
  
  // Chart configuration
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;
  
  // Create pie chart data with colors and angles
  let currentAngle = -Math.PI / 2; // Start from top
  const pieData = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    
    const slice = {
      ...item,
      color: colors[index],
      percentage: percentage,
      startAngle: currentAngle,
      endAngle: currentAngle + sliceAngle,
      centerAngle: currentAngle + sliceAngle / 2
    };
    
    currentAngle += sliceAngle;
    return slice;
  });
  
  // Store for mouse events
  pieChart = {
    data: pieData,
    centerX,
    centerY,
    radius,
    canvas,
    ctx,
    tooltip,
    hoveredSlice: null
  };
  
  // Draw pie chart
  drawPieChart();
  
  // Create legend
  createPieLegend(pieData, legend);
  
  // Add mouse events
  setupPieChartEvents();
}

function drawPieChart() {
  const { data, ctx, centerX, centerY, radius, hoveredSlice } = pieChart;
  
  ctx.clearRect(0, 0, pieChart.canvas.width, pieChart.canvas.height);
  
  // Draw slices
  data.forEach((slice, index) => {
    const isHovered = hoveredSlice === index;
    const sliceRadius = isHovered ? radius + 10 : radius;
    
    // Draw slice
    ctx.beginPath();
    ctx.arc(centerX, centerY, sliceRadius, slice.startAngle, slice.endAngle);
    ctx.lineTo(centerX, centerY);
    ctx.closePath();
    
    // Fill slice
    ctx.fillStyle = slice.color;
    ctx.fill();
    
    // Add stroke
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add shadow for hovered slice
    if (isHovered) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  });
}

function createPieLegend(data, legend) {
  data.forEach((slice, index) => {
    const legendItem = document.createElement('div');
    legendItem.className = 'pie-legend-item';
    legendItem.innerHTML = `
      <div class="pie-legend-color" style="background-color: ${slice.color}"></div>
      <span class="pie-legend-label">${slice.label}</span>
      <span class="pie-legend-value">${formatCurrency(slice.value)}</span>
    `;
    
    // Add hover events for legend items
    legendItem.addEventListener('mouseenter', () => {
      pieChart.hoveredSlice = index;
      drawPieChart();
    });
    
    legendItem.addEventListener('mouseleave', () => {
      pieChart.hoveredSlice = null;
      drawPieChart();
      hidePieChartTooltip();
    });
    
    legend.appendChild(legendItem);
  });
}

function setupPieChartEvents() {
  const { canvas, tooltip } = pieChart;
  
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const hoveredIndex = getHoveredSlice(x, y);
    
    if (hoveredIndex !== null) {
      pieChart.hoveredSlice = hoveredIndex;
      drawPieChart();
      showPieChartTooltip(e, hoveredIndex);
    } else {
      pieChart.hoveredSlice = null;
      drawPieChart();
      hidePieChartTooltip();
    }
  });
  
  canvas.addEventListener('mouseleave', () => {
    pieChart.hoveredSlice = null;
    drawPieChart();
    hidePieChartTooltip();
  });
}

function getHoveredSlice(x, y) {
  const { data, centerX, centerY, radius } = pieChart;
  
  // Check if point is within circle
  const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
  if (distance > radius + 10) return null;
  
  // Calculate angle
  const angle = Math.atan2(y - centerY, x - centerX);
  const normalizedAngle = angle < -Math.PI / 2 ? angle + 2 * Math.PI : angle;
  
  // Find which slice the angle belongs to
  for (let i = 0; i < data.length; i++) {
    const slice = data[i];
    let startAngle = slice.startAngle;
    let endAngle = slice.endAngle;
    
    // Normalize angles
    if (startAngle < -Math.PI / 2) startAngle += 2 * Math.PI;
    if (endAngle < -Math.PI / 2) endAngle += 2 * Math.PI;
    
    if (normalizedAngle >= startAngle && normalizedAngle <= endAngle) {
      return i;
    }
  }
  
  return null;
}

function showPieChartTooltip(e, sliceIndex) {
  const { tooltip, data } = pieChart;
  const slice = data[sliceIndex];
  
  tooltip.innerHTML = `
    <strong>${slice.label}</strong><br>
    ${formatCurrency(slice.value)} (${slice.percentage.toFixed(1)}%)
  `;
  
  // Get the mouse position relative to the viewport
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  
  // Position tooltip relative to the mouse cursor
  tooltip.style.left = (mouseX + 10) + 'px';
  tooltip.style.top = (mouseY - 10) + 'px';
  
  // Ensure tooltip doesn't go off-screen
  const rect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Adjust horizontal position if tooltip goes off right edge
  if (mouseX + rect.width + 10 > viewportWidth) {
    tooltip.style.left = (mouseX - rect.width - 10) + 'px';
  }
  
  // Adjust vertical position if tooltip goes off bottom edge
  if (mouseY + rect.height + 10 > viewportHeight) {
    tooltip.style.top = (mouseY - rect.height - 10) + 'px';
  }
  
  tooltip.classList.add('visible');
}

function hidePieChartTooltip() {
  const { tooltip } = pieChart;
  tooltip.classList.remove('visible');
}

// Update the pie chart with invoice data
function updatePieChart(rows) {
  if (!rows || rows.length === 0) {
    createPieChart([]);
    return;
  }
  
  // Group invoices by entity and sum values
  const entityTotals = {};
  
  rows.forEach(row => {
    if (!validateRow(row)) return;
    let nifsMap = getNifsMap();
    const entity = row.ENTIDADE || nifsMap[row.NIF] || `NIF ${row.NIF}`;
    const value = parseFloat(row.VALOR);
    
    if (!entityTotals[entity]) {
      entityTotals[entity] = 0;
    }
    entityTotals[entity] += value;
  });
  
  // Convert to array and sort by value
  const pieData = Object.entries(entityTotals)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  
  // Limit to top 10 entities to avoid overcrowding
  const maxEntities = 10;
  let finalData = pieData.slice(0, maxEntities);
  
  // If there are more entities, group the rest as "Outros"
  if (pieData.length > maxEntities) {
    const othersValue = pieData.slice(maxEntities).reduce((sum, item) => sum + item.value, 0);
    finalData.push({ label: 'Outros', value: othersValue });
  }
  
  createPieChart(finalData);
}