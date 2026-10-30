// src/rules.ts
var REQUIRED_FIELDS = {
  sommets: ["description"],
  itineraires: ["nom", "slug", "description"],
  conseils: ["titre", "texte"],
  pages: ["titre", "slug", "contenu"]
};
var DEFAULT_MANDATORY = ["fr", "en"];
function mandatoryLanguages(languages) {
  if (!languages.some((l) => l.obligatoire === true)) return [...DEFAULT_MANDATORY];
  return languages.filter((l) => l.obligatoire === true).map((l) => l.code);
}
var isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function mergeTranslations(current, change) {
  if (change === void 0) return [...current];
  const byId = new Map(current.map((t) => [t.id, t]));
  if (Array.isArray(change)) {
    return change.map((entry) => isObject(entry) ? { ...byId.get(entry.id) ?? {}, ...entry } : byId.get(entry) ?? { id: entry });
  }
  if (!isObject(change)) return [...current];
  const deleted = new Set(Array.isArray(change.delete) ? change.delete : []);
  const updates = new Map((Array.isArray(change.update) ? change.update : []).filter(isObject).map((u) => [u.id, u]));
  const created = (Array.isArray(change.create) ? change.create : []).filter(isObject);
  return [...current.filter((t) => !deleted.has(t.id)).map((t) => ({ ...t, ...updates.get(t.id) ?? {} })), ...created];
}
var blank = (value) => value === null || value === void 0 || typeof value === "string" && !value.trim() || Array.isArray(value) && !value.length;
var languageOf = (translation) => {
  const code = translation.languages_code;
  return isObject(code) ? code.code : code;
};
function publicationProblems(translations, mandatory, fields) {
  return mandatory.flatMap((language) => {
    const translation = translations.find((t) => languageOf(t) === language);
    if (!translation) return [{ language, fields: [], missing: true }];
    const empty = fields.filter((field) => blank(translation[field]));
    if (empty.length) return [{ language, fields: empty }];
    return translation.statut === "brouillon" ? [{ language, fields: [], draft: true }] : [];
  });
}
function problemMessage(problems, languages) {
  const name = (code) => languages.find((l) => l.code === code)?.name ?? code;
  const parts = problems.map((p) => {
    if (p.missing) return `${name(p.language)} : traduction absente`;
    if (p.draft) return `${name(p.language)} : traduction encore en brouillon`;
    return `${name(p.language)} : ${p.fields.join(", ")} \xE0 remplir`;
  });
  return `Publication impossible. ${parts.join(" ; ")}.`;
}

// src/index.ts
var PublicationError = class extends Error {
  name = "DirectusError";
  code = "INVALID_PAYLOAD";
  status = 400;
  extensions;
  constructor(reason) {
    super(reason);
    this.extensions = { reason };
  }
};
async function guard(db, collection, payload, rows, now) {
  const publishing = payload.statut === "publie";
  const targets = publishing ? rows : payload.statut === void 0 && "traductions" in payload ? rows.filter((r) => r.statut === "publie") : [];
  if (!targets.length) return payload;
  const languages = await db("languages").select("code", "name", "obligatoire");
  const mandatory = mandatoryLanguages(languages);
  for (const row of targets) {
    const current = row.id === void 0 ? [] : await db(`${collection}_translations`).select("*").where(`${collection}_id`, row.id);
    const problems = publicationProblems(mergeTranslations(current, payload.traductions), mandatory, REQUIRED_FIELDS[collection]);
    if (problems.length) throw new PublicationError(problemMessage(problems, languages));
  }
  if (publishing && payload.date_publication === void 0 && rows.every((r) => !r.date_publication)) {
    return { ...payload, date_publication: now().toISOString() };
  }
  return payload;
}
function register({ filter }, { database }, now = () => /* @__PURE__ */ new Date()) {
  for (const collection of Object.keys(REQUIRED_FIELDS)) {
    filter(
      `${collection}.items.create`,
      (payload, _meta, context) => guard(context.database ?? database, collection, payload, [{ id: void 0, statut: void 0, date_publication: void 0 }], now)
    );
    filter(`${collection}.items.update`, async (payload, { keys = [] }, context) => {
      const db = context.database ?? database;
      const rows = await db(collection).select("id", "statut", "date_publication").whereIn("id", keys);
      return guard(db, collection, payload, rows, now);
    });
  }
}
export {
  PublicationError,
  register as default
};
