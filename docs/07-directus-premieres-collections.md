# Directus: your first collections

> Written on 18 September 2026, in English to match the Directus interface. You create `regions` and
> the languages yourself, to see how Directus works; then I take over for the other collections.
> About 30 to 45 minutes. Field reference: [05-modele-de-donnees.md](05-modele-de-donnees.md) (in
> French).

## Before you start

- **Staging only**: https://cms-staging-5f20.up.railway.app. The schema is never edited in
  production; it gets applied there later, from the snapshot. Staging goes to sleep when idle, so
  the first load can take half a minute.
- **The labels below come from the Directus documentation** and from your screen. If something
  looks different, open the admin in the Claude app's browser: I then see the same page as you and
  can guide you. You log in yourself; I never type your password.

Four words to know:

| Directus | Database | Example |
|---|---|---|
| collection | table | `regions` |
| field | column | `slug` |
| interface | the input widget of a field | dropdown, map, Markdown editor |
| item | row | the region "Dévoluy" |

## Step 1 — Create the `regions` collection

1. **Settings** (the gear icon, bottom left) → **Data Model** → the **+** button (Create
   Collection).
2. Name: `regions`. Primary key: **auto-incremented integer** (the default), named `id`.
3. On the optional fields screen, tick:
   - **Sort**: the display order, by drag and drop;
   - **Date Created**, **Date Updated**, **User Created**, **User Updated**: who did what, and
     when.

   **Do not tick Status**: regions have no publication status.
4. Confirm.

*What just happened*: Directus created a `regions` table in Postgres, with these columns. You can
find it, still empty, under **Content**.

- [ ] `regions` collection created

## Step 2 — The fields shared by all languages

In **Data Model → regions**, click **Create Field** for each of these:

1. **`slug`**: **Input** interface.
   - In the interface options, turn on **Slug**: Directus formats what you type (lowercase,
     hyphens, no accents).
   - Tick **Required** ("Require value to be set on creation") and **Unique**: two regions cannot
     share the same address.
2. **`niveau`**: **Dropdown** interface, required. Two choices:
   - text "Zone", value `zone`;
   - text "Massif", value `massif`.
3. **`parent`**: **Many to One** interface. Related Collection: **`regions`**, the collection
   itself. Display Template: `{{slug}}`. This is the field that says which zone a massif belongs
   to.

   ⚠️ **Many to One, not One to Many.** If the screen shows the type "Alias", a "Foreign Key"
   picker and a "List" layout, you are on One to Many: cancel and start again. With Many to One,
   you only pick the related collection: Directus uses its primary key `id` by itself, and the field
   becomes an integer.
4. **`emprise`**, optional: **Map** interface, **Polygon** geometry. You can skip it.

*What just happened*: `parent` is a **relation** from `regions` to `regions`. In the database, it is
a column holding the `id` of another region.

- [ ] Fields `slug`, `niveau` and `parent` created

## Step 3 — Languages and translated fields

1. In `regions`, create a field with the **Translations** interface, key `traductions`.
   - Directus offers to create the languages collection: accept **`languages`**.
   - It also offers the translations table: accept **`regions_translations`**.

   Two collections appear. `regions_translations` is a junction table, which Directus often hides:
   if you don't see it in the list, look for the option that shows hidden collections.
2. In **Content → Languages**, keep only **French** (`fr`) and **English** (`en`). Delete the
   others if Directus created any, and add these two if they are missing. **No Korean yet**: it will
   come later, as a single new row.
3. In **Data Model → regions_translations**, create the translated fields:
   - **`nom`**: Input, required;
   - **`description`**: **Markdown**, optional.
4. In **Data Model → regions → traductions**, set the default language to **French**, if the
   interface offers it.

There is a shortcut: the **Generate Translations** wizard, in the collection settings, does all of
this in one go. But it creates 8 languages by default (English, Arabic, German…), which you would
then have to delete. The manual route above shows better what is going on.

*What just happened*: the name and the description no longer live in `regions` but in
`regions_translations`, with one row per region and per language. In the form, they show up as
FR | EN tabs.

- [ ] `languages` reduced to `fr` and `en`
- [ ] Fields `nom` and `description` created in `regions_translations`

## Step 4 — Enter the four regions

**Content → Regions → +**, then fill in both the FR and EN tabs of the Translations field:

| `slug` | `niveau` | `parent` | Name (FR) | Name (EN) |
|---|---|---|---|---|
| `alpes` | Zone | — | Alpes | Alps |
| `coree-du-sud` | Zone | — | Corée du Sud | South Korea |
| `devoluy` | Massif | `alpes` | Dévoluy | Dévoluy |
| `jeju` | Massif | `coree-du-sud` | Jeju | Jeju |

Create the two zones first: a massif needs its zone for the `parent` field. Then, by drag and drop
in the list, put the Alps before South Korea.

The rule "French and English required to publish" does not exist yet: it will be a phase 2
extension. Just fill in both languages.

- [ ] The four regions entered, in French and in English

## Step 5 — Recap, then hand over to me

You have now seen the building blocks used everywhere else:
- a **collection** and its system fields (sort, dates, authors);
- **interfaces**: input, slug, dropdown, map, Markdown;
- a **Many to One relation**, here from one region to another, and how it differs from One to
  Many;
- **translations**: a junction table towards `languages`.

Tell me when you are done. We look at the result together in the app's browser, then I take over
for `sommets`, `itineraires` and the other collections. After that, the schema gets exported
(`directus schema snapshot`) to `apps/cms/snapshots/schema.yaml`, so it is versioned.
