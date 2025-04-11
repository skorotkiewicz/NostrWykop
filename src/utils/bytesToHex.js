export const bytesToHex = (data) => {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
