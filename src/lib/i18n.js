(function (root) {
  const LANGUAGES = ['fi', 'en'];
  const LANGUAGE_SETTINGS = ['auto', ...LANGUAGES];
  const LOCALES = { fi: 'fi-FI', en: 'en-GB' };

  const MESSAGES = {
    fi: {
      appName: 'AI-suodatin',
      stateOn: 'Piilottaa AI-videot YouTubesta',
      stateOff: 'Pois päältä, videot näkyvät',
      filteringOn: 'Suodatus päällä',
      blockedChannels: 'Estetyt kanavat',
      emptyTitle: 'Estolista on vielä tyhjä.',
      emptyBody:
        'Kanava lisätään automaattisesti, kun YouTube merkitsee sen videon tekoälyllä tehdyksi. Voit myös merkitä kanavan itse videon alta.',
      exportFile: 'Vie tiedostoon',
      importFile: 'Tuo tiedostosta',
      language: 'Kieli',
      languageAuto: 'Auto',
      addedManually: 'lisätty käsin',
      removeFromBlocklist: 'Poista estolistalta',
      removeNamed: 'Poista {name} estolistalta',
      removed: '{name} poistettu estolistalta.',
      undo: 'Kumoa',
      removeFailed: 'Poisto epäonnistui. Yritä uudelleen.',
      restoreFailed: 'Palautus epäonnistui.',
      invalidJson: 'Tiedosto ei ole kelvollista JSONia.',
      importFailed: 'Tuonti epäonnistui.',
      importNothing: 'Tiedostossa ei ollut uusia kanavia.',
      importDone: 'Tuotiin kanavia: {blocked} estolistalle, {allowed} sallittuihin.',
      importPrompt: 'Valitse tuotava tiedosto painamalla "Tuo tiedostosta".',
      saveFailed: 'Asetuksen tallennus epäonnistui.',
      aiLabelNotice: 'YouTube: ääntä tai kuvaa on muokattu tai luotu tekoälyllä.',
      channelBlockedNamed: 'Kanava {name} on AI-estolistalla.',
      channelBlocked: 'Kanava on AI-estolistalla.',
      unmarkChannel: 'Poista AI-estolistalta',
      markChannel: 'Merkitse AI-kanavaksi',
      videoBlocked: 'Video estetty',
      videoAiLabelled: 'YouTube on merkinnyt tämän videon tekoälyllä luoduksi tai muokatuksi.',
      showAnyway: 'Näytä silti',
    },
    en: {
      appName: 'AI Filter',
      stateOn: 'Hides AI videos on YouTube',
      stateOff: 'Off, all videos are shown',
      filteringOn: 'Filtering on',
      blockedChannels: 'Blocked channels',
      emptyTitle: 'Your blocklist is empty.',
      emptyBody:
        'A channel is added automatically when YouTube labels one of its videos as made with AI. You can also mark a channel yourself below a video.',
      exportFile: 'Export to file',
      importFile: 'Import from file',
      language: 'Language',
      languageAuto: 'Auto',
      addedManually: 'added manually',
      removeFromBlocklist: 'Remove from blocklist',
      removeNamed: 'Remove {name} from blocklist',
      removed: '{name} removed from blocklist.',
      undo: 'Undo',
      removeFailed: 'Removing failed. Try again.',
      restoreFailed: 'Restoring failed.',
      invalidJson: 'The file is not valid JSON.',
      importFailed: 'Import failed.',
      importNothing: 'The file had no new channels.',
      importDone: 'Imported channels: {blocked} to blocklist, {allowed} to allowed.',
      importPrompt: 'Choose the file to import with "Import from file".',
      saveFailed: 'Saving the setting failed.',
      aiLabelNotice: 'YouTube: sound or visuals were altered or generated with AI.',
      channelBlockedNamed: 'Channel {name} is on your AI blocklist.',
      channelBlocked: 'This channel is on your AI blocklist.',
      unmarkChannel: 'Remove from AI blocklist',
      markChannel: 'Mark as AI channel',
      videoBlocked: 'Video blocked',
      videoAiLabelled: 'YouTube has labelled this video as generated or altered with AI.',
      showAnyway: 'Show anyway',
    },
  };

  function browserLanguage() {
    return String(root.navigator?.language ?? '').toLowerCase().startsWith('fi') ? 'fi' : 'en';
  }

  function resolveLanguage(setting) {
    return LANGUAGES.includes(setting) ? setting : browserLanguage();
  }

  let current = browserLanguage();

  function setLanguage(setting) {
    current = resolveLanguage(setting);
    return current;
  }

  function t(key, params = {}) {
    const template = MESSAGES[current][key] ?? MESSAGES.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
  }

  const api = {
    LANGUAGE_SETTINGS,
    MESSAGES,
    t,
    setLanguage,
    resolveLanguage,
    language: () => current,
    locale: () => LOCALES[current],
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AiBlockI18n = api;
})(globalThis);
