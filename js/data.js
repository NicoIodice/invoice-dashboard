import { config } from '/js/config.js';
import { dropboxListFolder, dropboxDownload, dropboxDownloadJSON } from '/js/dropbox.js';
import { showErrorToaster } from '/js/toaster.js';

// Simple in-memory cache
const cache = new Map();

export async function loadInvoiceDataFromCSV(year, nifsMap) {
  const cacheKey = `invoiceData_${year}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let text;

  if (config.loadFromDropbox) {
    const filePath = `${config.dropboxFolder}/${year}.csv`;
    text = await dropboxDownload(filePath);
  } else {
    const filePath = `${config.dataFolder}/${year}.csv`.replace('./', '');
    const res = await fetch(filePath);
    if (!res.ok) {
      showErrorToaster(`Erro ao carregar CSV para o ano ${year}: ${error.message}`);
      throw new Error(`❌ Erro ao carregar CSV para o ano ${year}.csv`);
    }
    text = await res.text();
  }

  const result = parseInvoiceDataCSV(text, nifsMap);
  cache.set(cacheKey, result);
  return result;
}

export function parseInvoiceDataCSV(text, nifsMap = {}) {
  const lines = text.trim().split("\n").slice(1); // Skip headers
  return lines
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
      // Find entity entity name for this NIF
      const entidade = nifsMap[NIF.trim()] || "-";
      return {
        NIF: NIF.trim(),
        ENTIDADE: entidade,
        VALOR: VALOR.trim(),
        'DATA EMISSAO': EMISSAO.trim(),
        'DATA SERVICO': SERVICO.trim()
      };
    })
    .filter(Boolean);
}

export async function getYearList() {
  const cacheKey = 'yearList';
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let files;

  if (config.loadFromDropbox) {
    const indexPath = `${config.dropboxFolder}`;
    files = await dropboxListFolder(indexPath);
  } else {
    // TODO: Fix this later
    const filePath = `${config.dataFolder}`.replace('./', '');
    const res = await fetch(filePath);
  }

  const yearPattern = /^(\d{4})\.csv$/;

  const yearList = files
    .map(f => {
      const match = f.match(yearPattern);
      return match ? match[1] : null;
    })
    .filter(Boolean)
    .sort((a, b) => b - a);

  cache.set(cacheKey, yearList);
  return yearList;
}

export async function loadClassValues() {
  const cacheKey = 'classValues';
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const fileName = 'school-info.json';
  let arr = [];

  if (config.loadFromDropbox) {
    const path = `${config.dropboxFolder}/${fileName}`;
    arr = await dropboxDownloadJSON(path);
  } else {
    const filePath = `${config.dataFolder}/${fileName}`.replace('./', '');
    const res = await fetch(filePath);
    arr = await res.json();
  }

  cache.set(cacheKey, arr);
  return arr;
}

export async function loadNifsMap() {
  const cacheKey = 'nifsMap';
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const fileName = 'nifs.json';
  let nifsArr = [];

  if (config.loadFromDropbox) {
    const nifsPath = `${config.dropboxFolder}/${fileName}`;
    nifsArr = await dropboxDownloadJSON(nifsPath);
  } else {
    const filePath = `${config.dataFolder}/${fileName}`.replace('./', '');
    const res = await fetch(filePath);
    nifsArr = await res.json();
  }

  // Convert array to map: { [id]: entity }
  const nifsMap = {};
  nifsArr.forEach(item => {
    nifsMap[item.id] = item.entity;
  });

  cache.set(cacheKey, nifsMap);
  return nifsMap;
}

export async function loadHolidays() {
  const cacheKey = 'holidays';
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const fileName = 'holidays.json';
  let holidays = {};

  if (config.loadFromDropbox) {
    const path = `${config.dropboxFolder}/${fileName}`;
    holidays = await dropboxDownloadJSON(path);
  } else {
    const filePath = `${config.dataFolder}/${fileName}`.replace('./', '');
    const res = await fetch(filePath);
    holidays = await res.json();
  }

  cache.set(cacheKey, holidays);
  return holidays;
}

export function clearInvoiceDataCache(year = null) {
  if (year) {
    // Clear specific year
    cache.delete(`invoiceData_${year}`);
  } else {
    // Clear all invoice data cache
    for (const key of cache.keys()) {
      if (key.startsWith('invoiceData_')) {
        cache.delete(key);
      }
    }
  }
}

export function clearNifsMapCache() {
  cache.delete('nifsMap');
}

export function clearYearListCache() {
  cache.delete('yearList');
}

// Clear all relevant caches for refresh
export function clearRefreshableCache() {
  // Clear all invoice data
  clearInvoiceDataCache();
  
  // Clear NIFs map
  clearNifsMapCache();
  
  // Clear year list
  clearYearListCache();
}

// Optional: Clear all cache
export function clearAllCache() {
  cache.clear();
}