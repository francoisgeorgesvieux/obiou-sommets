# Directus admin + API. Pinned minor: upgrade deliberately, staging first.
FROM directus/directus:12.3

COPY --chown=node:node obiou/ /directus/obiou/
COPY --chown=node:node extensions/ /directus/extensions/
COPY --chown=node:node snapshots/ /directus/snapshots/

CMD ["node", "/directus/obiou/entrypoint.cjs"]
