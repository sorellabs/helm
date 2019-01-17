// TODO: Rewrite these dependencies to control them
const { Html5Entities } = require("html-entities");
const sanitizeHtml = require("sanitize-html");

const entities = new Html5Entities();

function escapeEntities(text: string): string {
  return entities.encode(text);
}

export { escapeEntities, sanitizeHtml };
