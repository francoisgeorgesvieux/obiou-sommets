# Obiou Sommets

Carte interactive des sommets de montagne et des randonnées qui y mènent. Chaque sommet a sa fiche,
chaque itinéraire ses infos pratiques, ses conseils et sa trace téléchargeable (GPX, KML, GeoJSON,
FIT) pour le téléphone ou la montre. Le contenu se gère depuis une interface d'administration sans
code. Visiteurs et éditeurs peuvent aussi passer par un assistant IA via MCP.

Site personnel et non commercial : les sommets gravis par l'auteur dans les Alpes et en Corée du Sud.
En ligne sur `sommets.obiou.eu`.

> **Statut : phase 2, CMS et pipeline GPX.** Fondations closes le 17 sept. 2026 : monorepo, CI,
> infrastructure Railway, Directus et sauvegardes restaurables. Pas encore de contenu ni de
> fonctionnalités publiques.

**Maquettes (45 écrans : parcours visiteur, pages publiques, back-office, design system)** : https://claude.ai/code/artifact/bb79abd1-e08c-4cf9-834a-017c95d230ec
(sources des écrans dans [`design/`](design/)).

## Documents

| Document | Contenu |
|---|---|
| [Architecture technique](docs/01-architecture-technique.md) | Stack, services, modèle de données, pipeline GPX, MCP, sécurité, infra |
| [Roadmap de déploiement](docs/02-roadmap-deploiement.md) | Phases, jalons, critères de sortie, procédure Railway + DNS |
| [Prompt Claude Design](docs/03-prompt-claude-design.md) | Prompt complet décrivant toutes les pages publiques et admin |
| [Avis critique](docs/04-avis-critique.md) | Forces, risques, recommandations, questions ouvertes |
| [Modèle de données](docs/05-modele-de-donnees.md) | Collections, champs, langues, vues publiques, droits (validé le 18 sept. 2026) |
| [SCAN 25, marche à suivre](docs/06-scan25-pas-a-pas.md) | Licence IGN grand public : décision, démarche, obligations (D4) |
| [Directus, premières collections](docs/07-directus-premieres-collections.md) | Guide pas à pas : `languages` et `regions` dans l'admin staging |

## Stack

Nuxt 4 · Directus 12 · PostgreSQL 17 + PostGIS · MapLibre GL + IGN Géoplateforme ·
MCP (`@nuxtjs/mcp-toolkit` et MCP intégré Directus) · Railway

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `apps/web` | Site public Nuxt 4 (carte, fiches, `/api`, MCP public à venir) |
| `apps/cms` | Image Directus 12 : démarrage, extensions, snapshots de schéma |
| `packages/geo` | Calculs géographiques purs (distances, dénivelés), testés avec Vitest |
| `infra/backup` | Sauvegarde quotidienne : dump, restauration vérifiée, chiffrement, envoi |
| `docs` | Architecture, roadmap, prompt de design, avis critique |
| `design` | Sources des maquettes |

## Démarrer en local

Prérequis : Node 22, Docker.

```bash
corepack enable
```

```bash
pnpm install
```

```bash
cp .env.example .env
```

Remplis `.env` avec des valeurs locales (`openssl rand -base64 32`), puis :

```bash
docker compose up -d
```

```bash
pnpm dev
```

- Site : http://localhost:3000
- Directus : http://localhost:8055

Vérifications (les mêmes que la CI) :

```bash
pnpm check
```

## Déploiement

Railway, projet `obiou-sommets`. La branche `staging` déploie l'environnement staging, `main` la
production. Les services se construisent depuis ce dépôt, sans passer par GitHub Actions. Détails
dans la [roadmap](docs/02-roadmap-deploiement.md#procédure-de-déploiement-railway--obioueu) et
[`infra/backup/restore.md`](infra/backup/restore.md) pour restaurer une sauvegarde.
