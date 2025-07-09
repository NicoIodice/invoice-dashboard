import { config } from './config.js';
import { dropboxDownload, dropboxDownloadJSON } from './dropbox.js';

export async function loadCSV(year) {
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
  return parseCSV(text);
}

export function parseCSV(text) {
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
      return {
        NIF: NIF.trim(),
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