# Snapshots de schéma

Le modèle de données Directus est versionné ici, dans `schema.yaml`.

- Le schéma se modifie **dans Directus staging uniquement**.
- Export : `npx directus schema snapshot --yes ./snapshots/schema.yaml` dans le conteneur staging,
  puis commit via une PR.
- Au démarrage, l'image applique `schema.yaml` s'il existe (voir `obiou/entrypoint.cjs`).
- En production, personne ne modifie le modèle depuis l'interface.
