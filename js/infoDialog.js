export function infoDialogListeners() {
  document.getElementById('infoIcon').addEventListener('click', () => {
    document.getElementById('infoDialog').style.display = 'flex';
  });

  document.getElementById('closeInfoDialog').addEventListener('click', () => {
    document.getElementById('infoDialog').style.display = 'none';
  });

  // Optional: close dialog when clicking outside the box
  document.getElementById('infoDialog').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.style.display = 'none';
    }
  });
}