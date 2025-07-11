import { loadNifsMap } from './data.js';

let classSortKey = 'entidade';
let classSortAsc = true;

let nifsMap = {};

export async function renderClassesTable(classValues) {
  nifsMap = await loadNifsMap();
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