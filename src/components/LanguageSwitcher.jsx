import useTranslate from "../utils/useTranslate";

function LanguageSwitcher() {
  const { i18n, currentLanguage } = useTranslate();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-switcher">
      <button
        type="button"
        onClick={() => changeLanguage("en")}
        className={currentLanguage === "en" ? "active" : ""}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => changeLanguage("pl")}
        className={currentLanguage === "pl" ? "active" : ""}
      >
        PL
      </button>
    </div>
  );
}

export default LanguageSwitcher;
