let classSortKey = 'entidade';
let classSortAsc = true;
let selectedClassesYear = null; // Add this line

// Add this function to extract years from class value periods
function extractYearsFromClassValues(classValues) {
  const yearsSet = new Set();
  
  classValues.forEach(entry => {
    entry.classes.forEach(cls => {
      if (cls.valuePeriod) {
        // Extract year from startDate
        if (cls.valuePeriod.startDate) {
          // Parse DD-MM-YYYY format correctly
          const startDateParts = cls.valuePeriod.startDate.split('-');
          if (startDateParts.length === 3) {
            const startYear = parseInt(startDateParts[2]); // Year is the third part
            if (!isNaN(startYear)) {
              yearsSet.add(startYear);
            }
          }
        }
        
        // Extract year from endDate
        if (cls.valuePeriod.endDate) {
          // Parse DD-MM-YYYY format correctly
          const endDateParts = cls.valuePeriod.endDate.split('-');
          if (endDateParts.length === 3) {
            const endYear = parseInt(endDateParts[2]); // Year is the third part
            if (!isNaN(endYear)) {
              yearsSet.add(endYear);
            }
          }
        }
      }
    });
  });
  
  // Convert to array and sort in descending order
  return Array.from(yearsSet).sort((a, b) => b - a);
}

// Also update the filterClassesByYear function:
function filterClassesByYear(classValues, year) {
  if (!year) {
    return classValues; // Return all if no year selected
  }
  
  return classValues.map(entry => {
    const filteredClasses = entry.classes.filter(cls => {
      if (!cls.valuePeriod) return false;
      
      // Check if the class period overlaps with the selected year
      let startYear = null;
      let endYear = null;
      
      if (cls.valuePeriod.startDate) {
        // Parse DD-MM-YYYY format correctly
        const startDateParts = cls.valuePeriod.startDate.split('-');
        if (startDateParts.length === 3) {
          startYear = parseInt(startDateParts[2]);
        }
      }
      
      if (cls.valuePeriod.endDate) {
        // Parse DD-MM-YYYY format correctly
        const endDateParts = cls.valuePeriod.endDate.split('-');
        if (endDateParts.length === 3) {
          endYear = parseInt(endDateParts[2]);
        }
      }
      
      // Include class if it overlaps with the selected year
      return (startYear <= year && (!endYear || endYear >= year)) ||
             (startYear === year || endYear === year);
    });
    
    return {
      ...entry,
      classes: filteredClasses
    };
  }).filter(entry => entry.classes.length > 0); // Only include entries with classes
}

// Add this function to setup year selector
function setupClassesYearSelector(classValues) {
  const yearSelect = document.getElementById('classesYearSelect');
  const years = extractYearsFromClassValues(classValues);
  
  // Clear existing options
  yearSelect.innerHTML = '';
  
  // Add year options
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
  
  // Set default to current year if available, otherwise "All Years"
  const currentYear = new Date().getFullYear();
  if (years.includes(currentYear)) {
    yearSelect.value = currentYear;
    selectedClassesYear = currentYear;
  } else {
    yearSelect.value = '';
    selectedClassesYear = null;
  }
  
  // Add event listener for year changes
  yearSelect.addEventListener('change', (e) => {
    selectedClassesYear = e.target.value ? parseInt(e.target.value) : null;
    // Re-render table with filtered data
    renderclassesInfoTable(document.classesNifsMap, document.classesClassValues);
  });
}

// Update the renderclassesInfoTable function
export async function renderclassesInfoTable(nifsMap, classValues) {
  // Store references for year filtering
  document.classesNifsMap = nifsMap;
  document.classesClassValues = classValues;
  
  // Setup year selector if not already done
  const yearSelect = document.getElementById('classesYearSelect');
  if (yearSelect && !yearSelect.hasChildNodes()) {
    setupClassesYearSelector(classValues);
  }
  
  // Filter classes by selected year
  const filteredClassValues = filterClassesByYear(classValues, selectedClassesYear);
  
  const tbody = document.querySelector('#classesInfoTable tbody');
  tbody.innerHTML = '';
  const arr = [...filteredClassValues];

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
    
    // Create tooltip content for class types (always show)
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

// Keep your existing classesInfoListeners function unchanged
export function classesInfoListeners(nifsMap, classValues) {
  document.getElementById('sortClassNif').addEventListener('click', () => {
    classSortKey = 'nif';
    classSortAsc = !classSortAsc;
    renderclassesInfoTable(nifsMap, classValues);
  });

  document.getElementById('sortClassEntidade').addEventListener('click', () => {
    classSortKey = 'entidade';
    classSortAsc = !classSortAsc;
    renderclassesInfoTable(nifsMap, classValues);
  });

  document.getElementById('sortClassCount').addEventListener('click', () => {
    classSortKey = 'numClasses';
    classSortAsc = !classSortAsc;
    renderclassesInfoTable(nifsMap, classValues);
  });

  document.getElementById('sortClassValue').addEventListener('click', () => {
    classSortKey = 'value';
    classSortAsc = !classSortAsc;
    renderclassesInfoTable(nifsMap, classValues);
  });
}