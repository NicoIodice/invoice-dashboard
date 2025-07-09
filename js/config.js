export let config = {};

export async function loadConfig() {
  const res = await fetch('config/config.json');
  Object.assign(config, await res.json());
}