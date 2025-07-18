import { showErrorToaster } from './toaster.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentPage = null;
    this.components = new Map();
    this.init();
  }

  init() {
    // Load common components
    this.loadSidebar();
    this.setupSidebarEvents();
    
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      const page = event.state?.page || 'dashboard';
      this.navigateTo(page, false);
    });
  }

  // Register a route
  register(path, pageModule) {
    this.routes.set(path, pageModule);
  }

  // Navigate to a page
  async navigateTo(page, pushState = true) {
    if (this.currentPage === page) return;

    try {
      // Show loading
      this.showLoading();

      // Get page module
      const pageModule = this.routes.get(page);
      if (!pageModule) {
        throw new Error(`Page '${page}' not found`);
      }

      // Cleanup current page
      if (this.currentPage) {
        await this.cleanup();
      }

      // Load page content
      await this.loadPage(page, pageModule);

      // Update browser history
      if (pushState) {
        history.pushState({ page }, '', `#${page}`);
      }

      // Update current page
      this.currentPage = page;

      // Update sidebar active state
      this.updateSidebarActive(page);

    } catch (error) {
      console.error('❌ Error loading page:', error);
      showErrorToaster(`Erro ao carregar página: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  // Load page content
  async loadPage(page, pageModule) {
    // Load HTML template
    const htmlContent = await this.loadTemplate(page);
    
    // Load CSS if exists
    await this.loadPageCSS(page);
    
    // Insert content
    document.getElementById('mainContent').innerHTML = htmlContent;
    
    // Initialize page module
    if (pageModule.init) {
      await pageModule.init();
    }
  }

  // Load HTML template
  async loadTemplate(page) {
    try {
      const response = await fetch(`/pages/${page}.html`);
      if (!response.ok) throw new Error(`Template not found: ${page}`);
      return await response.text();
    } catch (error) {
      console.error(`❌ Error loading template for ${page}:`, error);
      return `<div class="error">Erro ao carregar página ${page}</div>`;
    }
  }

  // Load page-specific CSS
  async loadPageCSS(page) {
    const linkId = `page-css-${page}`;
    
    // Remove existing page CSS
    const existingLink = document.getElementById(linkId);
    if (existingLink) {
      existingLink.remove();
    }

    // Add new page CSS
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `/css/pages/${page}.css`;
    
    // Only add if CSS file exists
    try {
      const response = await fetch(link.href);
      if (response.ok) {
        document.head.appendChild(link);
      }
    } catch (error) {
      // CSS file doesn't exist, that's okay
    }
  }

  // Load sidebar component
  async loadSidebar() {
    try {
      const response = await fetch('/pages/components/sidebar.html');
      if (response.ok) {
        const sidebarHTML = await response.text();
        document.getElementById('sidebar').innerHTML = sidebarHTML;
      }
    } catch (error) {
      console.error('❌ Error loading sidebar:', error);
    }
  }

  // Setup sidebar navigation events
  setupSidebarEvents() {
    document.addEventListener('click', (e) => {
      const menuItem = e.target.closest('.sidebar-menu');
      if (!menuItem) return;

      const page = menuItem.dataset.page;
      if (page) {
        this.navigateTo(page);
      }
    });
  }

  // Update sidebar active state
  updateSidebarActive(page) {
    document.querySelectorAll('.sidebar-menu').forEach(item => {
      item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[data-page="${page}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  // Cleanup current page
  async cleanup() {
    const pageModule = this.routes.get(this.currentPage);
    if (pageModule?.cleanup) {
      await pageModule.cleanup();
    }
    
    // Remove page-specific CSS
    const linkId = `page-css-${this.currentPage}`;
    const existingLink = document.getElementById(linkId);
    if (existingLink) {
      existingLink.remove();
    }
  }

  // Show loading
  showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
  }

  // Hide loading
  hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
  }

  // Get current page from URL hash
  getCurrentPageFromHash() {
    const hash = window.location.hash.slice(1);
    return hash || 'invoice-dashboard';
  }
}

// Create global router instance
const router = new Router();

export default router;