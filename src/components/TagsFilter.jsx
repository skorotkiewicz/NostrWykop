import { useState, useEffect } from "react";
import useTranslate from "../utils/useTranslate";

function TagsFilter({ selectedTags, onTagSelect }) {
  const { t } = useTranslate();
  const [popularTags, setPopularTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Tutaj można pobrać popularne tagi z API
    // Na potrzeby przykładu używamy statycznych danych
    const mockPopularTags = [
      "technologia",
      "polityka",
      "humor",
      "nauka",
      "sport",
      "gry",
      "filmy",
      "muzyka",
      "programowanie",
      "kuchnia",
      "zdrowie",
      "biznes",
      "crypto",
      "nostr",
    ];

    setPopularTags(mockPopularTags);
  }, []);

  const filteredTags = popularTags.filter((tag) =>
    tag.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const displayedTags = showAll ? filteredTags : filteredTags.slice(0, 10);

  return (
    <div className="tags-filter">
      <h3>{t('tagsFilter.filterByTags')}</h3>

      <div className="search-tags">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('tagsFilter.searchTags')}
        />
      </div>

      <div className="tags-list">
        {displayedTags.map((tag) => (
          <button
            type="button"
            key={tag}
            className={`tag-btn ${selectedTags.includes(tag) ? "selected" : ""}`}
            onClick={() => onTagSelect(tag)}
          >
            #{tag}
          </button>
        ))}

        {filteredTags.length > 10 && !showAll && (
          <button
            type="button"
            className="show-more-btn"
            onClick={() => setShowAll(true)}
          >
            {t('tagsFilter.showMore')}
          </button>
        )}

        {showAll && (
          <button
            type="button"
            className="show-less-btn"
            onClick={() => setShowAll(false)}
          >
            {t('tagsFilter.showLess')}
          </button>
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className="selected-tags">
          <h4>{t('tagsFilter.selectedTags')}</h4>
          <div className="selected-tags-list">
            {selectedTags.map((tag) => (
              <span key={tag} className="selected-tag">
                #{tag}
                <button
                  type="button"
                  className="remove-tag-btn"
                  onClick={() => onTagSelect(tag)}
                >
                  &times;
                </button>
              </span>
            ))}

            <button
              type="button"
              className="clear-all-btn"
              onClick={() => {
                for (const tag of selectedTags) {
                  onTagSelect(tag);
                }
              }}
            >
              {t('tagsFilter.clearAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TagsFilter;
