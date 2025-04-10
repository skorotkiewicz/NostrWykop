export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) {
    return `${interval} lat temu`;
  }
  if (interval === 1) {
    return "rok temu";
  }

  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return `${interval} mies. temu`;
  }
  if (interval === 1) {
    return "miesiąc temu";
  }

  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return `${interval} dni temu`;
  }
  if (interval === 1) {
    return "wczoraj";
  }

  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return `${interval} godz. temu`;
  }
  if (interval === 1) {
    return "godzinę temu";
  }

  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return `${interval} min. temu`;
  }
  if (interval === 1) {
    return "minutę temu";
  }

  if (seconds < 10) {
    return "przed chwilą";
  }

  return `${seconds} sek. temu`;
}
