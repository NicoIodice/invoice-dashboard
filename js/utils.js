// Utility for formatting currency
export function formatCurrency(value) {
  return `${parseFloat(value).toFixed(2)} €`;
}

export function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}
export function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}