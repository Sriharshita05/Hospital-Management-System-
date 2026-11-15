// Creates a readable unique ID such as VIS-20261114-4F2A
// Used when the client does not supply its own ID.
const generateId = (prefix) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
};

export default generateId;
