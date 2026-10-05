export const DEFAULT_SPELLCHECK_PLUGIN = 'Spellcheck Only';

export function buildSpellcheckPrompt(text: string, pluginName = DEFAULT_SPELLCHECK_PLUGIN) {
  const normalizedPluginName = pluginName.trim() || DEFAULT_SPELLCHECK_PLUGIN;
  return `@${normalizedPluginName}\n\n${text}`;
}

export function buildSpellcheckUrl(text: string, pluginName = DEFAULT_SPELLCHECK_PLUGIN) {
  return `https://chatgpt.com/?q=${encodeURIComponent(buildSpellcheckPrompt(text, pluginName))}`;
}
