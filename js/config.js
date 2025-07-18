export let config = {};

export async function loadConfig() {
  try {
    const res = await fetch('config/config.json');
    if (!res.ok) {
      throw new Error(`❌ Erro ao carregar config: ${res.status} ${res.statusText}`);
    }
    const configData = await res.json();
    Object.assign(config, configData);
    //console.log('✅ Config loaded successfully:', config);
    return config;
  } catch (error) {
    console.error('❌ Error loading config:', error);
    throw error;
  }
}

// Helper function to check if config is loaded
export function isConfigLoaded() {
  return Object.keys(config).length > 0;
}