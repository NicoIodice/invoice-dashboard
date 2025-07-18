import { addEmptyStateRow } from '../utils.js';

let classSortKey = 'entidade';
let classSortAsc = true;
let selectedClassesYear = null;

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

// Update the filterClassesByYear function to not remove rows
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
  }); // Remove the filter that was removing entries with no classes
}

// Add this function to setup year selector
function setupClassesYearSelector(classValues) {
  const yearSelect = document.getElementById('classesYearSelect');
  const years = extractYearsFromClassValues(classValues);
  const currentYear = new Date().getFullYear();
  
  // Filter out the current year from the options
  const filteredYears = years.filter(year => year !== currentYear);
  
  // Clear existing options
  yearSelect.innerHTML = '';
  
  // Add year options (excluding current year)
  filteredYears.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
  
  // Set default to the previous year (highest year that's not current year)
  if (filteredYears.length > 0) {
    // Get the most recent year (first in descending order)
    const previousYear = filteredYears[0];
    yearSelect.value = previousYear;
    selectedClassesYear = previousYear;
  } else {
    // If no other years available, add a placeholder
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = '-';
    yearSelect.appendChild(placeholderOption);
    yearSelect.value = '';
    selectedClassesYear = null;
  }
  
  // Add event listener for year changes
  yearSelect.addEventListener('change', (e) => {
    selectedClassesYear = e.target.value ? parseInt(e.target.value) : null;
    // Re-render table with filtered data
    renderClassesInfoTable(document.classesNifsMap, document.classesClassValues);
  });
}

// Update the renderClassesInfoTable function
export async function renderClassesInfoTable(nifsMap, classValues) {
  // Store references for year filtering
  document.classesNifsMap = nifsMap;
  document.classesClassValues = classValues;
  
  // Setup year selector if not already done
  const yearSelect = document.getElementById('classesYearSelect');
  if (yearSelect && !yearSelect.hasChildNodes()) {
    setupClassesYearSelector(classValues);
  }
  
  const tbody = document.querySelector('#classesInfoTable tbody');
  tbody.innerHTML = '';
  
  // Check if classValues is empty or null
  if (!classValues || classValues.length === 0) {
    addEmptyStateRow(tbody, 5); // 5 columns in classes table
    return;
  }

  // Filter classes to show only CURRENT YEAR data
  const currentYear = new Date().getFullYear();
  const currentYearClassValues = classValues.map(entry => {
    const currentYearClasses = entry.classes.filter(cls => {
      if (!cls.valuePeriod) return false;
      
      let startYear = null;
      let endYear = null;
      
      if (cls.valuePeriod.startDate) {
        const startDateParts = cls.valuePeriod.startDate.split('-');
        if (startDateParts.length === 3) {
          startYear = parseInt(startDateParts[2]);
        }
      }
      
      if (cls.valuePeriod.endDate) {
        const endDateParts = cls.valuePeriod.endDate.split('-');
        if (endDateParts.length === 3) {
          endYear = parseInt(endDateParts[2]);
        }
      }
      
      // Include class if it overlaps with the current year
      return (startYear <= currentYear && (!endYear || endYear >= currentYear)) ||
             (startYear === currentYear || endYear === currentYear);
    });
    
    return {
      ...entry,
      classes: currentYearClasses
    };
  });
  
  // Filter out entries with no classes for current year
  const validEntries = currentYearClassValues.filter(entry => entry.classes.length > 0);
  
  // Check if no valid entries after filtering
  if (validEntries.length === 0) {
    addEmptyStateRow(tbody, 5); // 5 columns in classes table
    return;
  }
  
  const arr = [...currentYearClassValues]; // Use current year filtered data

  // Prepare a flat array for sorting and rendering
  const rows = arr.map(entry => {
    const { nif, classes } = entry;
    const entidade = nifsMap[nif] || '-';
    const numClasses = classes.length; // Current year classes only
    
    // Calculate variation based on selected year vs current year
    const allClassesForNif = classValues.find(cv => cv.nif === nif)?.classes || [];
    const variation = calculateVariation(allClassesForNif, selectedClassesYear);
    
    // Get current year class details only
    const classDetails = classes.map(c => ({
      classType: c.classType || 'Aula',
      value: c.value
    }));
    
    // Group by value to show unique values (current year only)
    const valueGroups = {};
    classDetails.forEach(detail => {
      if (!valueGroups[detail.value]) {
        valueGroups[detail.value] = [];
      }
      if (!valueGroups[detail.value].includes(detail.classType)) {
        valueGroups[detail.value].push(detail.classType);
      }
    });

    // Group by class type for the "Nº Aulas/Semana" tooltip (current year only)
    const classTypeGroups = {};
    classDetails.forEach(detail => {
      if (!classTypeGroups[detail.classType]) {
        classTypeGroups[detail.classType] = 0;
      }
      classTypeGroups[detail.classType]++;
    });

    const uniqueValues = Object.keys(valueGroups).map(Number).sort((a, b) => a - b);
    
    // Get all endDates (if any) - current year only
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
      variation, // Compares current year to selected year
      expired
    };
  });

  // Sorting (add variation sorting)
  rows.sort((a, b) => {
    let cmp;
    if (classSortKey === 'nif') {
      cmp = a.nif.localeCompare(b.nif, 'pt');
    } else if (classSortKey === 'entidade') {
      cmp = a.entidade.localeCompare(b.entidade, 'pt');
    } else if (classSortKey === 'numClasses') {
      cmp = a.numClasses - b.numClasses;
    } else if (classSortKey === 'variation') {
      cmp = a.variation.percentage - b.variation.percentage;
    } else {
      // Sort by first value per class
      cmp = (a.uniqueValues[0] || 0) - (b.uniqueValues[0] || 0);
    }
    return classSortAsc ? cmp : -cmp;
  });

  // Render rows
  rows.forEach(({ nif, entidade, numClasses, uniqueValues, valueGroups, classTypeGroups, variation, expired }) => {
    // Show current year values only
    const valueCell = uniqueValues.length > 0 
      ? uniqueValues.map(v => `${parseFloat(v).toFixed(2)} €`).join(', ')
      : '-';
    
    const tr = document.createElement('tr');
    if (expired) tr.style.background = '#eee';
    
    // Create tooltip content for values if there are multiple different values
    const hasMultipleValues = uniqueValues.length > 1;
    let valueTooltipContent = '';
    
    if (hasMultipleValues) {
      const tooltipRows = uniqueValues.map(value => {
        const classTypes = valueGroups[value];
        return classTypes.map(classType => 
          `<div class="class-info-tooltip-row">
            <span class="class-info-tooltip-label">${classType}</span>
            <span class="class-info-tooltip-value">${parseFloat(value).toFixed(2)} €</span>
          </div>`
        ).join('');
      }).join('');
      
      valueTooltipContent = `<span class="class-info-tooltip-panel">${tooltipRows}</span>`;
    }
    
    // Create tooltip content for class types (current year only)
    const classTypeNames = Object.keys(classTypeGroups);
    let classTypeTooltipContent = '';
    
    if (classTypeNames.length > 0) {
      const classTypeRows = classTypeNames.map(classType => 
        `<div class="class-info-tooltip-row">
          <span class="class-info-tooltip-label">${classType}</span>
          <span class="class-info-tooltip-value">${classTypeGroups[classType]}</span>
        </div>`
      ).join('');
        
      classTypeTooltipContent = `<span class="class-info-tooltip-panel">${classTypeRows}</span>`;
    }

    // Create variation cell content (compares current year to selected year)
    const getArrowIcon = (arrow) => {
      switch (arrow) {
        case 'positive': return '↗';
        case 'negative': return '↘';
        default: return '-';
      }
    };

    const variationContent = variation.display === '-' 
      ? '<span class="variation-percentage neutral">-</span>'
      : `<span class="variation-arrow ${variation.arrow}">${getArrowIcon(variation.arrow)}</span>
         <span class="variation-percentage ${variation.arrow}">${variation.display}</span>`;

    tr.innerHTML = `
      <td>${nif}</td>
      <td>${entidade}</td>
      <td ${numClasses > 0 ? 'class="class-info-tooltip"' : ''}>
        ${numClasses}
        ${numClasses > 0 ? classTypeTooltipContent : ''}
      </td>
      <td ${hasMultipleValues ? 'class="class-info-tooltip"' : ''}>
        ${valueCell}
        ${hasMultipleValues ? valueTooltipContent : ''}
      </td>
      <td>
        <div class="variation-cell">
          ${variationContent}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Add this function to calculate variation percentage
function calculateVariation(classesForNif, selectedYear) {
  if (!selectedYear) return { percentage: 0, arrow: 'neutral', display: '-' };
  
  const currentYear = new Date().getFullYear();
  
  // If selected year is the current year, no variation to show
  if (selectedYear === currentYear) {
    return { percentage: 0, arrow: 'neutral', display: '-' };
  }
  
  // Get classes for the selected year
  const selectedYearClasses = classesForNif.filter(cls => {
    if (!cls.valuePeriod) return false;
    
    let startYear = null;
    let endYear = null;
    
    if (cls.valuePeriod.startDate) {
      const startDateParts = cls.valuePeriod.startDate.split('-');
      if (startDateParts.length === 3) {
        startYear = parseInt(startDateParts[2]);
      }
    }
    
    if (cls.valuePeriod.endDate) {
      const endDateParts = cls.valuePeriod.endDate.split('-');
      if (endDateParts.length === 3) {
        endYear = parseInt(endDateParts[2]);
      }
    }
    
    // Include class if it overlaps with the selected year
    return (startYear <= selectedYear && (!endYear || endYear >= selectedYear)) ||
           (startYear === selectedYear || endYear === selectedYear);
  });
  
  // Get the current year's classes
  const currentYearClasses = classesForNif.filter(cls => {
    if (!cls.valuePeriod) return false;
    
    let startYear = null;
    let endYear = null;
    
    if (cls.valuePeriod.startDate) {
      const startDateParts = cls.valuePeriod.startDate.split('-');
      if (startDateParts.length === 3) {
        startYear = parseInt(startDateParts[2]);
      }
    }
    
    if (cls.valuePeriod.endDate) {
      const endDateParts = cls.valuePeriod.endDate.split('-');
      if (endDateParts.length === 3) {
        endYear = parseInt(endDateParts[2]);
      }
    }
    
    // Include class if it overlaps with the current year
    return (startYear <= currentYear && (!endYear || endYear >= currentYear)) ||
           (startYear === currentYear || endYear === currentYear);
  });
  
  // Calculate average value per class for each year
  const selectedYearAvg = selectedYearClasses.length > 0 
    ? selectedYearClasses.reduce((sum, cls) => sum + (cls.value || 0), 0) / selectedYearClasses.length
    : 0;
    
  const currentYearAvg = currentYearClasses.length > 0 
    ? currentYearClasses.reduce((sum, cls) => sum + (cls.value || 0), 0) / currentYearClasses.length
    : 0;
  
  // If no data for selected year OR no data for current year, return neutral
  if (selectedYearAvg === 0 || currentYearAvg === 0) {
    return { percentage: 0, arrow: 'neutral', display: '-' };
  }
  
  // Calculate percentage change: (current - selected) / selected * 100
  // This shows how much the current year changed compared to the selected year
  const percentageChange = ((currentYearAvg - selectedYearAvg) / selectedYearAvg) * 100;
  
  // Determine arrow and formatting
  let arrow = 'neutral';
  let display = '-';
  
  if (Math.abs(percentageChange) < 0.01) { // Very small difference, treat as no change
    arrow = 'neutral';
    display = '-';
  } else if (percentageChange > 0) {
    arrow = 'positive';
    display = `${percentageChange.toFixed(2)}%`;
  } else if (percentageChange < 0) {
    arrow = 'negative';
    display = `${Math.abs(percentageChange).toFixed(2)}%`;
  }
  
  return { percentage: percentageChange, arrow, display };
}

// Keep your existing classesInfoListeners function unchanged
export function classesInfoListeners(nifsMap, classValues) {
  document.getElementById('sortClassNif').addEventListener('click', () => {
    classSortKey = 'nif';
    classSortAsc = !classSortAsc;
    renderClassesInfoTable(nifsMap, classValues);
  });

  document.getElementById('sortClassEntidade').addEventListener('click', () => {
    classSortKey = 'entidade';
    classSortAsc = !classSortAsc;
    renderClassesInfoTable(nifsMap, classValues);
  });

  document.getElementById('sortClassCount').addEventListener('click', () => {
    classSortKey = 'numClasses';
    classSortAsc = !classSortAsc;
    renderClassesInfoTable(nifsMap, classValues);
  });

  document.getElementById('sortClassValue').addEventListener('click', () => {
    classSortKey = 'value';
    classSortAsc = !classSortAsc;
    renderClassesInfoTable(nifsMap, classValues);
  });

  // Add the new variation sorting listener
  document.getElementById('sortClassVariation').addEventListener('click', () => {
    classSortKey = 'variation';
    classSortAsc = !classSortAsc;
    renderClassesInfoTable(nifsMap, classValues);
  });
}