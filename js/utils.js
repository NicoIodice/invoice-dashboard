// Utility for formatting currency
export function formatCurrency(value) {
  return `${parseFloat(value).toFixed(2)} €`;
}

// Helper function to add empty state row to tables
export function addEmptyStateRow(tableBody, columnCount) {
  const emptyRow = document.createElement('tr');
  emptyRow.innerHTML = `
    <td colspan="${columnCount}" style="text-align: center; padding: 2em; color: #888; font-style: italic;">
      No data available.
    </td>
  `;
  tableBody.appendChild(emptyRow);
}