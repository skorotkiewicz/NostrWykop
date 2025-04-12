import useTranslate from "../utils/useTranslate";
import { useTheme } from "../contexts/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslate();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={t("theme.toggle")}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

export default ThemeToggle;
