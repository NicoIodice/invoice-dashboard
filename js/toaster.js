class ToasterManager {
  constructor() {
    this.container = null;
    this.toasters = [];
    this.init();
  }

  init() {
    // Create toaster container
    this.container = document.createElement('div');
    this.container.id = 'toaster-container';
    this.container.className = 'toaster-container';
    document.body.appendChild(this.container);
  }

  showError(message, duration = 5000) {
    const toaster = this.createToaster(message, 'error');
    this.addToaster(toaster, duration);
  }

  showSuccess(message, duration = 5000) {
    const toaster = this.createToaster(message, 'success');
    this.addToaster(toaster, duration);
  }

  showInfo(message, duration = 5000) {
    const toaster = this.createToaster(message, 'info');
    this.addToaster(toaster, duration);
  }

  createToaster(message, type) {
    const toaster = document.createElement('div');
    toaster.className = `toaster toaster-${type}`;
    
    const icon = this.getIcon(type);
    
    toaster.innerHTML = `
      <div class="toaster-icon">${icon}</div>
      <div class="toaster-message">${message}</div>
      <button class="toaster-close" onclick="toasterManager.removeToaster(this.parentElement)">×</button>
    `;

    return toaster;
  }

  getIcon(type) {
    switch (type) {
      case 'error': return '❌';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }

  addToaster(toaster, duration) {
    this.toasters.push(toaster);
    this.container.appendChild(toaster);

    // Trigger fade-in animation
    requestAnimationFrame(() => {
      toaster.classList.add('toaster-show');
    });

    // Auto-remove after duration
    setTimeout(() => {
      this.removeToaster(toaster);
    }, duration);
  }

  removeToaster(toaster) {
    if (!toaster || !toaster.parentElement) return;

    // Add fade-out animation
    toaster.classList.add('toaster-hide');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (toaster.parentElement) {
        toaster.parentElement.removeChild(toaster);
      }
      
      // Remove from toasters array
      const index = this.toasters.indexOf(toaster);
      if (index > -1) {
        this.toasters.splice(index, 1);
      }
    }, 300); // Match CSS animation duration
  }

  clearAll() {
    this.toasters.forEach(toaster => this.removeToaster(toaster));
  }
}

// Create global instance
const toasterManager = new ToasterManager();

// Export functions for easy use
export function showErrorToaster(message, duration = 5000) {
  toasterManager.showError(message, duration);
}

export function showSuccessToaster(message, duration = 5000) {
  toasterManager.showSuccess(message, duration);
}

export function showInfoToaster(message, duration = 5000) {
  toasterManager.showInfo(message, duration);
}

export function clearAllToasters() {
  toasterManager.clearAll();
}

// Make toasterManager globally available for onclick handlers
window.toasterManager = toasterManager;