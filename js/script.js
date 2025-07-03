const tableBody = document.querySelector("#invoiceTable tbody");
const yearSelect = document.getElementById("yearSelect");
const refreshBtn = document.getElementById("refreshBtn");

let config = {};
let currentYear = new Date().getFullYear();
let totalValue = 0;
const quarterTotals = [0, 0, 0, 0];
const nifCounts = {};

const DROPBOX_CONFIG = 'config/dropbox.env';

async function loadConfig() {
  const res = await fetch('config/config.json');
  Object.assign(config, await res.json());
}

function getQuarter(month) {
  if (month <= 2) return 1;
  if (month <= 5) return 2;
  if (month <= 8) return 3;
  return 4;
}

function formatCurrency(value) {
  return `${parseFloat(value).toFixed(2)} €`;
}

function resetDashboard() {
  tableBody.innerHTML = "";
  quarterTotals.fill(0);
  Object.keys(nifCounts).forEach(k => delete nifCounts[k]);
  totalValue = 0;
  updateQuarterSummaryPanel(quarterTotals);
  updateFiscalStatusPanel(config);
  updateInvoicesByNifPanel([], nifCounts);
}

function validateRow(row) {
  //const nifValid = /^\d+$/.test(row.NIF);
  const nifValid = row.NIF && row.NIF.trim().length > 0;
  const valueValid = /^\d+(\.\d{1,2})?$/.test(row.VALOR);
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(row['DATA SERVICO']);
  return nifValid && valueValid && dateValid;
}

function updateUI(rows) {
  tableBody.innerHTML = "";
  quarterTotals.fill(0);
  Object.keys(nifCounts).forEach(k => delete nifCounts[k]);
  totalValue = 0;

  // Update invoice data table
  updateInvoicesTable(rows);

  // Update panels
  updateQuarterSummaryPanel(quarterTotals, rows); // Pass rows here!
  updateFiscalStatusPanel(config);
  updateInvoicesByNifPanel(rows, nifCounts);
}

function updateInvoicesTable(rows) {
  for (const row of rows) {
    if (!validateRow(row)) {
      console.warn("Linha inválida ignorada:", row);
      continue;
    }

    const date = new Date(row['DATA SERVICO']);
    const month = date.getMonth();
    const quarter = getQuarter(month);
    const value = parseFloat(row.VALOR);

    quarterTotals[quarter - 1] += value;
    totalValue += value;
    nifCounts[row.NIF] = (nifCounts[row.NIF] || 0) + 1;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.NIF}</td>
      <td>${formatCurrency(value)}</td>
      <td>${row['DATA EMISSAO']}</td>
      <td>${row['DATA SERVICO']}</td>
      <td>T${quarter}</td>
    `;
    tableBody.appendChild(tr);
  }
}

function updateQuarterSummaryPanel(quarterTotals, rows = []) {
  // Calculate totals per month for each quarter
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

  // Prepare month totals for each quarter
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
      // Tooltip content for this quarter
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

  document.getElementById("totalYearValue").textContent = formatCurrency(totalValue);
}

function updateFiscalStatusPanel(config) {
  const taxPanel = document.getElementById("taxPanel");
  // Remove all .fiscal-item elements (keep the heading)
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
    iconSpan.textContent = Number(totalValue) > Number(threshold) ? "✅" : "❌";

    item.appendChild(labelSpan);
    item.appendChild(iconSpan);
    taxPanel.appendChild(item);
  });
}

function updateInvoicesByNifPanel(rows, nifCounts) {
  const sortedNifs = Object.entries(nifCounts)
    .sort((a, b) => b[1] - a[1]); // Sort by count descending

  const nifList = sortedNifs
    .map(([nif, count]) => `
      <li class="nif-item">
        <span class="nif-label">${nif}</span>
        <span class="nif-count">${count} fatura(s)</span>
      </li>
    `)
    .join("");
  document.getElementById("nifStats").innerHTML = nifList;
  document.getElementById("totalInvoices").innerHTML =
    `<span class="total-value">${rows.length}</span>`;
}

async function loadCSV(year) {
  try {
    let text;
    if (config.loadFromDropbox) {
      // Fetch CSV from Dropbox
      const DROPBOX_ACCESS_TOKEN = await loadDropboxToken();
      const filePath = `${config.dropboxFolder}/${year}.csv`;
      const res = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
          'Dropbox-API-Arg': JSON.stringify({ path: filePath })
        }
      });
      if (!res.ok) throw new Error(`❌ Erro ao baixar ${year}.csv do Dropbox`);
      text = await res.text();
    } else {
      // Fetch CSV from local
      const filePath = `${config.dataFolder}/${year}.csv`.replace('./', '');
      const res = await fetch(filePath);
      if (!res.ok) throw new Error(`❌ Erro ao carregar CSV local para o ano ${year}.csv`);
      text = await res.text();
    }

    const lines = text.trim().split("\n").slice(1); // Skip headers
    const rows = lines
      .map(line => {
        const [NIF, VALOR, EMISSAO, SERVICO] = line.split(",");
        if (
          typeof NIF === "undefined" ||
          typeof VALOR === "undefined" ||
          typeof EMISSAO === "undefined" ||
          typeof SERVICO === "undefined"
        ) {
          return null; // skip invalid lines
        }
        return {
          NIF: NIF.trim(),
          VALOR: VALOR.trim(),
          'DATA EMISSAO': EMISSAO.trim(),
          'DATA SERVICO': SERVICO.trim()
        };
      })
      .filter(Boolean); // remove nulls
    updateUI(rows);
  } catch (err) {
    alert("❌ Erro ao carregar CSV para o ano selecionado.");
    resetDashboard();
    console.error(err);
  }
}

async function setupYearSelector() {
  let files = [];
  try {
    if (config.loadFromDropbox) {
      // Fetch index.json from Dropbox
      const DROPBOX_ACCESS_TOKEN = await loadDropboxToken();
      const indexPath = `${config.dropboxFolder}/index.json`;
      const res = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
          'Dropbox-API-Arg': JSON.stringify({ path: indexPath })
        }
      });
      if (!res.ok) throw new Error("❌ Erro ao baixar index.json do Dropbox");
      files = await res.json();
    } else {
      // Fetch index.json from local
      const res = await fetch('data/index.json');
      files = await res.json();
    }
  } catch (e) {
    alert("❌ Não foi possível carregar a lista de anos.");
    resetDashboard();
    return;
  }

  // Validate pattern: only files like 2021.csv, 2022.csv, etc.
  const yearPattern = /^(\d{4})\.csv$/;
  const years = files
    .map(f => {
      const match = f.match(yearPattern);
      return match ? match[1] : null;
    })
    .filter(Boolean)
    .sort((a, b) => b - a); // Descending order

  // Populate the select
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
    loadCSV(currentYear);
  });
}

refreshBtn.addEventListener("click", async () => {
  refreshBtn.classList.add("refreshing");
  try {
    await loadCSV(currentYear);
  } finally {
    setTimeout(() => refreshBtn.classList.remove("refreshing"), 700); // match animation duration
  }
});

async function loadDropboxToken() {
  const res = await fetch(DROPBOX_CONFIG);
  const text = await res.text();
  const match = text.match(/^DROPBOX_ACCESS_TOKEN\s*=\s*(.+)$/m);
  if (!match) throw new Error(`❌ DROPBOX_ACCESS_TOKEN não encontrado em ${DROPBOX_CONFIG}`);
  return match[1].trim();
}

(async function init() {
  await loadConfig();
  setupYearSelector();
  loadCSV(currentYear);
})();
