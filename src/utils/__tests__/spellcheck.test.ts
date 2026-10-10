import { buildSpellcheckPrompt, buildSpellcheckUrl } from '../spellcheck';

describe('spellcheck helpers', () => {
  test('targets the Spellcheck Only plugin by default', () => {
    expect(buildSpellcheckPrompt('teh text')).toBe('@Spellcheck Only\n\nteh text');
  });

  test('encodes selected Markdown in the ChatGPT query', () => {
    const url = new URL(buildSpellcheckUrl('**teh** & [link](https://example.com)'));
    expect(url.origin).toBe('https://chatgpt.com');
    expect(url.searchParams.get('q')).toBe(
      '@Spellcheck Only\n\n**teh** & [link](https://example.com)',
    );
  });

  test('falls back to the default plugin name when the setting is blank', () => {
    expect(buildSpellcheckPrompt('teh text', '   ')).toBe('@Spellcheck Only\n\nteh text');
  });
});
