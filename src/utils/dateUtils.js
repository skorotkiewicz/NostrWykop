import i18next from 'i18next';

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) {
    return i18next.t('timeAgo.yearsAgo', { count: interval });
  }
  if (interval === 1) {
    return i18next.t('timeAgo.yearAgo');
  }

  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return i18next.t('timeAgo.monthsAgo', { count: interval });
  }
  if (interval === 1) {
    return i18next.t('timeAgo.monthAgo');
  }

  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return i18next.t('timeAgo.daysAgo', { count: interval });
  }
  if (interval === 1) {
    return i18next.t('timeAgo.dayAgo');
  }

  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return i18next.t('timeAgo.hoursAgo', { count: interval });
  }
  if (interval === 1) {
    return i18next.t('timeAgo.hourAgo');
  }

  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return i18next.t('timeAgo.minutesAgo', { count: interval });
  }
  if (interval === 1) {
    return i18next.t('timeAgo.minuteAgo');
  }

  if (seconds < 10) {
    return i18next.t('timeAgo.justNow');
  }

  return i18next.t('timeAgo.secondsAgo', { count: seconds });
}
