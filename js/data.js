import { config } from './config.js';
import { dropboxDownload, dropboxDownloadJSON } from './dropbox.js';

export async function loadCSV(year, nifsMap) {
  let text;
  if (config.loadFromDropbox) {
    const filePath = `${config.dropboxFolder}/${year}.csv`;
    text = await dropboxDownload(filePath);
  } else {
    const filePath = `${config.dataFolder}/${year}.csv`.replace('./', '');
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`❌ Erro ao carregar CSV local para o ano ${year}.csv`);
    text = await res.text();
  }
  return parseCSV(text, nifsMap);
}

export function parseCSV(text, nifsMap = {}) {
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
      console.log("NIF:" + NIF.trim() + " | Entidade: " + entidade);
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
  let files;
  if (config.loadFromDropbox) {
    const indexPath = `${config.dropboxFolder}/index.json`;
    files = await dropboxDownloadJSON(indexPath);
  } else {
    const res = await fetch('data/index.json');
    files = await res.json();
  }
  const yearPattern = /^(\d{4})\.csv$/;
  return files
    .map(f => {
      const match = f.match(yearPattern);
      return match ? match[1] : null;
    })
    .filter(Boolean)
    .sort((a, b) => b - a);
}

export async function loadNifsMap() {
  let nifsArr = [];
  if (config.loadFromDropbox) {
    const nifsPath = `${config.dropboxFolder}/nifs.json`;
    nifsArr = await dropboxDownloadJSON(nifsPath);
  } else {
    const res = await fetch('data/nifs.json');
    nifsArr = await res.json();
  }
  // Convert array to map: { [id]: entity }
  const nifsMap = {};
  nifsArr.forEach(item => {
    nifsMap[item.id] = item.entity;
  });
  return nifsMap;
}