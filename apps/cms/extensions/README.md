# Extensions Directus

Extensions maison, copiées dans `/directus/extensions` à la construction de l'image.

Prévues en phase 2 :

- `hook-pipeline-gpx` (**fait**, 2026-10-30) : calculs et exports au dépôt d'un GPX ;
- `interface-import-gpx` : aperçu carte et profil dans le formulaire itinéraire ;
- `interface-position-carte` : sélecteur de position avec altitude proposée.

## Construire

L'image `cms` est construite à partir de `apps/cms` seul et ne voit pas `packages/geo` : chaque
extension est donc un paquet du workspace dont le **bundle esbuild est commité** (`dist/index.js`).
Après toute modification d'une extension ou de `packages/geo` : `pnpm --dir apps/cms/extensions/<nom>
build`, puis committer `dist/`. La CI reconstruit et refuse un bundle périmé. Le `.dockerignore`
n'envoie dans l'image que `package.json` et `dist/`.
