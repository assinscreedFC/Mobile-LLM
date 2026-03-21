import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { resources } from "./translations";

const systemLanguage = Localization.getLocales()[0]?.languageCode || "en";

const isLanguageSupported = Object.keys(resources).includes(systemLanguage);

const defaultLanguage = isLanguageSupported ? systemLanguage : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
