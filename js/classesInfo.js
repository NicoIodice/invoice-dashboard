let classSortKey = 'entidade';
let classSortAsc = true;

export async function renderClassesTable(nifsMap, classValues) {
  const tbody = document.querySelector('#classesTable tbody');
  tbody.innerHTML = '';
  const arr = [...classValues];

  // Prepare a flat array for sorting and rendering
  const rows = arr.map(entry => {
    const { nif, classes } = entry;
    const entidade = nifsMap[nif] || '-';
    const numClasses = classes.length;
    
    // Get all unique values per class with their class types
    const classDetails = classes.map(c => ({
      classType: c.classType || 'Aula',
      value: c.value
    }));
    
    // Group by value to show unique values
    const valueGroups = {};
    classDetails.forEach(detail => {
      if (!valueGroups[detail.value]) {
        valueGroups[detail.value] = [];
      }
      if (!valueGroups[detail.value].includes(detail.classType)) {
        valueGroups[detail.value].push(detail.classType);
      }
    });

    // Group by class type for the "Nº Aulas/Semana" tooltip
    const classTypeGroups = {};
    classDetails.forEach(detail => {
      if (!classTypeGroups[detail.classType]) {
        classTypeGroups[detail.classType] = 0;
      }
      classTypeGroups[detail.classType]++;
    });

    const uniqueValues = Object.keys(valueGroups).map(Number).sort((a, b) => a - b);
    
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
      valueGroups,
      classTypeGroups,
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
  rows.forEach(({ nif, entidade, numClasses, uniqueValues, valueGroups, classTypeGroups, expired }) => {
    const valueCell = uniqueValues.map(v => `${parseFloat(v).toFixed(2)} €`).join(', ');
    const tr = document.createElement('tr');
    if (expired) tr.style.background = '#eee';
    
    // Create tooltip content for values if there are multiple different values
    const hasMultipleValues = uniqueValues.length > 1;
    let valueTooltipContent = '';
    
    if (hasMultipleValues) {
      const tooltipRows = uniqueValues.map(value => {
        const classTypes = valueGroups[value];
        return classTypes.map(classType => 
          `<div class="quarter-tooltip-row">
            <span class="quarter-tooltip-label">${classType}</span>
            <span class="quarter-tooltip-value">${parseFloat(value).toFixed(2)} €</span>
          </div>`
        ).join('');
      }).join('');
      
      valueTooltipContent = `<span class="quarter-tooltip-panel">${tooltipRows}</span>`;
    }
    
    // Create tooltip content for class types (always show if more than one class type)
    const classTypeNames = Object.keys(classTypeGroups);
    let classTypeTooltipContent = '';
    
    const classTypeRows = classTypeNames.map(classType => 
      `<div class="quarter-tooltip-row">
        <span class="quarter-tooltip-label">${classType}</span>
        <span class="quarter-tooltip-value">${classTypeGroups[classType]}</span>
      </div>`
    ).join('');
      
    classTypeTooltipContent = `<span class="quarter-tooltip-panel">${classTypeRows}</span>`;

    tr.innerHTML = `
      <td>${nif}</td>
      <td>${entidade}</td>
      <td class="quarter-tooltip">
        ${numClasses}
        ${classTypeTooltipContent}
      </td>
      <td ${hasMultipleValues ? 'class="quarter-tooltip"' : ''}>
        ${valueCell}
        ${hasMultipleValues ? valueTooltipContent : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

}

export function classesInfoListeners(nifsMap, classValues) {
  document.getElementById('sortClassNif').addEventListener('click', () => {
    classSortKey = 'nif';
    classSortAsc = !classSortAsc;
    renderClassesTable(nifsMap, classValues);
  });

  document.getElementById('sortClassEntidade').addEventListener('click', () => {
    classSortKey = 'entidade';
    classSortAsc = !classSortAsc;
    renderClassesTable(nifsMap, classValues);
  });

  document.getElementById('sortClassCount').addEventListener('click', () => {
    classSortKey = 'numClasses';
    classSortAsc = !classSortAsc;
    renderClassesTable(nifsMap, classValues);
  });

  document.getElementById('sortClassValue').addEventListener('click', () => {
    classSortKey = 'value';
    classSortAsc = !classSortAsc;
    renderClassesTable(nifsMap, classValues);
  });
}