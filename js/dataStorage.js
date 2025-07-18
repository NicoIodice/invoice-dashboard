import { loadConfig } from './config.js';
import { 
  loadYearsList, 
  loadNifsMap, 
  loadClassValues, 
  loadHolidays,
  loadInvoiceData 
} from '/js/dataLoader.js';
import { showErrorToaster } from '/js/toaster.js';

class DataStorage {
  constructor() {
    this.data = {
      config: null,
      yearsList: [],
      nifsMap: {},
      classValues: [],
      holidays: {},
      invoiceData: new Map(),
      isLoaded: false,
      isLoading: false
    };
    this.currentYear = null;
    this.loadingPromise = null;
  }

  // Initialize store with all common data
  async init() {
    if (this.data.isLoading) {
      return this.loadingPromise;
    }

    if (this.data.isLoaded) {
      return this.data;
    }

    this.data.isLoading = true;
    this.currentYear = new Date().getFullYear();
    this.loadingPromise = this.loadAllData();
    
    try {
      await this.loadingPromise;
      this.data.isLoaded = true;
      console.log('✅ Store initialized successfully');
      return this.data;
    } catch (error) {
      console.error('❌ Error initializing store:', error);
      showErrorToaster('Erro ao carregar configurações e dados da aplicação');
      throw error;
    } finally {
      this.data.isLoading = false;
      this.loadingPromise = null;
    }
  }

  // Load all common data
  async loadAllData() {
    try {
      console.log('📥 Loading application data...');
      
      // STEP 1: Load config first (required for all other operations)
      console.log('📥 Loading config...');
      this.data.config = await this.loadConfig();
      
      // STEP 2: Load other common data in parallel (now that config is available)
      console.log('📥 Loading common data...');
      const [yearsList, nifsMap, classValues, holidays] = await Promise.all([
        this.loadYearsList(),
        this.loadNifsMap(),
        this.loadClassValues(),
        this.loadHolidays()
      ]);

      // Update store
      this.data.yearsList = yearsList;
      this.data.nifsMap = nifsMap;
      this.data.classValues = classValues;
      this.data.holidays = holidays;

      // STEP 3: Load invoice data (requires previous config and nifs data)
      console.log('📥 Loading invoice data...');
      const invoiceData = await this.loadInvoiceData(this.currentYear);
      this.data.invoiceData.set(this.currentYear, invoiceData);

      console.log('✅ All common data loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading common data:', error);
      throw error;
    }
  }

  // Load config with error handling
  async loadConfig() {
    try {
      const config = await loadConfig();
      console.log(`✅ Config loaded (${config.length} entries)`);
      return config;
    } catch (error) {
      console.error('❌ Error loading config:', error);
      showErrorToaster('Erro ao carregar configuração');
      throw error;
    }
  }

  // Load years list with error handling
  async loadYearsList() {
    try {
      const yearsList = await loadYearsList(this.data.config);
      console.log(`✅ Years list loaded (${yearsList.length} entries)`);
      return yearsList;
    } catch (error) {
      console.error('❌ Error loading years list:', error);
      showErrorToaster('Erro ao carregar lista de anos');
      return []; // Return empty array on error
    }
  }

  // Load NIFs map with error handling
  async loadNifsMap() {
    try {
      const nifsMap = await loadNifsMap(this.data.config);
      console.log(`✅ NIFs map loaded (${Object.keys(nifsMap).length} entries)`);
      return nifsMap;
    } catch (error) {
      console.error('❌ Error loading NIFs map:', error);
      showErrorToaster('Erro ao carregar mapa de NIFs');
      return {}; // Return empty object on error
    }
  }

  // Load class values with error handling
  async loadClassValues() {
    try {
      const classValues = await loadClassValues(this.data.config);
      console.log(`✅ Class values loaded (${classValues.length} entries)`);
      return classValues;
    } catch (error) {
      console.error('❌ Error loading class values:', error);
      showErrorToaster('Erro ao carregar valores de aulas');
      return []; // Return empty array on error
    }
  }

  // Load holidays with error handling
  async loadHolidays() {
    try {
      const holidays = await loadHolidays(this.data.config);
      console.log(`✅ Holidays loaded (${Object.keys(holidays).length} entries)`);
      return holidays;
    } catch (error) {
      console.error('❌ Error loading holidays:', error);
      showErrorToaster('Erro ao carregar feriados');
      return {}; // Return empty object on error
    }
  }

  // Load invoice data with error handling
  async loadInvoiceData(year) {
    try {
      const invoiceData = await loadInvoiceData(this.data.config, year, this.data.nifsMap);
      console.log(`✅ Invoice data loaded (${invoiceData.length} entries)`);
      return invoiceData;
    } catch (error) {
      console.error('❌ Error loading invoice data:', error);
      showErrorToaster('Erro ao carregar dados de faturas');
      return []; // Return empty array on error
    }
  }

  // Refresh specific data
  async refreshYearsList() {
    try {
      this.data.yearsList = await this.loadYearsList();
      return this.data.yearsList;
    } catch (error) {
      console.error('❌ Error refreshing years list:', error);
      throw error;
    }
  }

  async refreshNifsMap() {
    try {
      this.data.nifsMap = await this.loadNifsMap();
      return this.data.nifsMap;
    } catch (error) {
      console.error('❌ Error refreshing NIFs map:', error);
      throw error;
    }
  }

  async refreshClassValues() {
    try {
      this.data.classValues = await this.loadClassValues();
      return this.data.classValues;
    } catch (error) {
      console.error('❌ Error refreshing class values:', error);
      throw error;
    }
  }

  async refreshHolidays() {
    try {
      this.data.holidays = await this.loadHolidays();
      return this.data.holidays;
    } catch (error) {
      console.error('❌ Error refreshing holidays map:', error);
      throw error;
    }
  }

  async refreshInvoiceData(year) {
    try {
      const invoiceData = await this.loadInvoiceData(year);
      this.data.invoiceData.set(cacheKey, invoiceData);
      return this.data.invoiceData;
    } catch (error) {
      console.error('❌ Error refreshing invoice data:', error);
      throw error;
    }
  }

  // Clear invoice data cache
  clearInvoiceDataCache(year = null) {
    if (year) {
      // Clear specific year
      const cacheKey = `${year}`;
      this.data.invoiceData.delete(cacheKey);
      console.log(`📦 Invoice data cache cleared for year ${year}`);
    } else {
      // Clear all invoice data
      this.data.invoiceData.clear();
      console.log('📦 All invoice data cache cleared');
    }
  }

  // Refresh all data
  async refreshAll() {
    console.log('🔄 Refreshing all data...');
    this.data.isLoaded = false;
    this.clearInvoiceDataCache();
    return await this.init();
  }

  // Getters for accessing data
  getConfig() {
    return this.data.config;
  }

  getYearsList() {
    return this.data.yearsList;
  }

  getNifsMap() {
    return this.data.nifsMap;
  }

  getClassValues() {
    return this.data.classValues;
  }

  getHolidays() {
    return this.data.holidays;
  }

  // Load invoice data for specific year with caching
  async getInvoiceData(year) {
    // Ensure common data is loaded first
    if (!this.data.isLoaded) {
      await this.init();
    }

    const cacheKey = `${year}`;
    
    // Check cache first
    if (this.data.invoiceData.has(cacheKey)) {
      console.log(`📦 Invoice data cache HIT for year ${year}`);
      return this.data.invoiceData.get(cacheKey);
    }

    // Otherwise load data from source
    try {
      console.log(`📥 Loading invoice data for year ${year}...`);
      const invoiceData = await this.loadInvoiceData(year);
      
      // Cache the result
      this.data.invoiceData.set(cacheKey, invoiceData);
      console.log(`✅ Invoice data loaded and cached for year ${year} (${invoiceData.length} entries)`);
      
      return invoiceData;
    } catch (error) {
      console.error(`❌ Error loading invoice data for year ${year}:`, error);
      showErrorToaster(`Erro ao carregar dados para ${year}: ${error.message}`);
      throw error;
    }
  }

  isDataLoaded() {
    return this.data.isLoaded;
  }

  isDataLoading() {
    return this.data.isLoading;
  }

  getCurrentYear() {
    return this.currentYear;
  }

  // Get all data at once
  getAllData() {
    return {
      config: this.data.config,
      yearsList: this.data.yearsList,
      nifsMap: this.data.nifsMap,
      classValues: this.data.classValues,
      invoiceData: this.data.invoiceData,
      isLoaded: this.data.isLoaded,
      isLoading: this.data.isLoading
    };
  }
}

// Create singleton instance
const dataStorage = new DataStorage();

// Export both the instance and individual methods for convenience
export default dataStorage;

export const getConfig = () => dataStorage.getConfig();
export const getYearsList = () => dataStorage.getYearsList();
export const getNifsMap = () => dataStorage.getNifsMap();
export const getClassValues = () => dataStorage.getClassValues();
export const getHolidays = () => dataStorage.getHolidays();
export const getInvoiceData = (year) => dataStorage.getInvoiceData(year);
export const isDataLoaded = () => dataStorage.isDataLoaded();
export const isDataLoading = () => dataStorage.isDataLoading();
export const getAllData = () => dataStorage.getAllData();
export const refreshAll = () => dataStorage.refreshAll();
export const clearInvoiceDataCache = (year) => dataStorage.clearInvoiceDataCache(year);
export const getCurrentYear = () => dataStorage.getCurrentYear();