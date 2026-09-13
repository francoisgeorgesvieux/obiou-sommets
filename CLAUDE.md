# obiou-sommets — contexte projet pour Claude

> Document de passation vivant. Dernière mise à jour : **2026-09-13**.

## Ce que c'est

Site public de cartographie des sommets (massif pilote : Dévoluy) : carte interactive, fiche
sommet, fiches itinéraires, téléchargement de traces (GPX/KML/GeoJSON/FIT). Admin sans code pour les
éditeurs. Accès MCP public (lecture seule) et admin (brouillons seulement).

Projet frère d'[obioucounting](../obioucounting) (même propriétaire, même domaine obiou.eu), mais
**totalement isolé** : projet Railway, base et secrets séparés.

## État

**Cadrage et maquettes.** Rien n'est construit ni déployé.

- **Décidé par le propriétaire (2026-09-13)** : sous-domaine `sommets.obiou.eu` ; site personnel
  **non commercial, sans publicité** ; contenu = ses propres sorties, **Alpes + Corée du Sud**.
- **Encore ouvert** : D2, D5, D6, D7, D9 de
  [l'architecture](docs/01-architecture-technique.md#14-décisions-ouvertes).
- **Maquettes** publiées (45 écrans, lots 1 à 4) : https://claude.ai/code/artifact/bb79abd1-e08c-4cf9-834a-017c95d230ec.
  Les artboards sources sont dans `design/*.dc.html`. Si le canvas a été modifié en ligne, la
  version en ligne fait foi : la relire avant de régénérer. Données et fonds de carte fictifs.

## Invariants proposés (à confirmer en phase 0)

- **Écriture via Directus, lecture publique via vues SQL** (`db/views`). Le site public et le MCP
  public ne dépendent pas de Directus à l'exécution.
- **Le rôle MCP « Agent IA » ne publie jamais et ne supprime jamais** : brouillons seulement.
- **Schéma Directus modifié en staging uniquement**, versionné dans `apps/cms/snapshots/`.
- **Aucune métadonnée personnelle** (horodatages, cardio, appareil) dans un GPX publié.
- **Région EU vérifiée** sur chaque service Railway et le bucket, pas seulement choisie.

## Documents

- [docs/01-architecture-technique.md](docs/01-architecture-technique.md)
- [docs/02-roadmap-deploiement.md](docs/02-roadmap-deploiement.md)
- [docs/03-prompt-claude-design.md](docs/03-prompt-claude-design.md)
- [docs/04-avis-critique.md](docs/04-avis-critique.md)
