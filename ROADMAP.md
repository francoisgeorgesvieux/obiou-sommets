# Roadmap — Obiou Sommets

> **Ordre validé par le propriétaire le 2026-11-25.** Ce fichier est la liste de priorités
> vivante : l'ordre ci-dessous est celui dans lequel les fiches seront écrites puis codées. Le
> calendrier par phases et les critères de sortie restent dans
> [docs/02-roadmap-deploiement.md](docs/02-roadmap-deploiement.md).

## Comment on s'en sert

1. **Le propriétaire fixe l'ordre** de cette liste, toutes les une ou deux semaines (point de
   validation n° 1).
2. **Une fiche d'une page par feature avant de coder**, dans `docs/fiches/`, sur le
   [modèle](docs/fiches/_modele.md). Le propriétaire la valide ou la corrige (point de validation
   n° 2).
3. Ensuite Claude développe, teste, passe par `staging` et fusionne selon les règles de `CLAUDE.md`.
   Les gros changements passent par une démo sur staging avant la production.

Statuts : `à cadrer` (pas de fiche) · `fiche à valider` · `prêt` (fiche validée) · `en cours` ·
`livré`.

## Où en est le projet (2026-11-25)

- **Côté admin, la phase 2 est presque finie** : schéma Directus complet en production, pipeline
  GPX (`packages/geo` + hook) qui calcule statistiques, profil et exports, hook de publication qui
  exige le français et l'anglais.
- **Côté public, il n'y a rien encore** : `sommets.obiou.eu` affiche une carte IGN et un état de la
  base. Pas de fiche, pas de téléchargement, pas de lecture du contenu (les vues SQL `db/views`
  n'existent pas).
- **Retard sur le calendrier** : la phase 3 (site public) devait courir du 16 nov. au 20 déc. Le
  lancement visé reste **mi-avril 2027**, avant la saison ; il reste environ 4 mois et demi.
- **Périmètre élargi le 2026-11-25** (propriétaire) : pas seulement des sommets, **toutes les
  sorties intéressantes**, par exemple les sentiers côtiers coréens (Jeju Olle, Haeparang-gil). Le
  site reste d'abord pour l'usage personnel du propriétaire, ouvert à tous en lecture ; lancement
  toujours visé **mi-avril 2027**, sans pression.
- **Le vrai goulot reste le contenu** (docs/04) : chaque feature ci-dessous est jugée sur ce qu'elle
  rapproche d'une première sortie publiée et utile.

## Maintenant : la première fiche en ligne

Objectif de ce bloc : **une vraie sortie, saisie dans l'admin, visible et téléchargeable sur le site**.

| # | Feature | Problème et valeur | Statut |
|---|---|---|---|
| 1 | **Sorties sans sommet** (sommet facultatif, catégorie, région sur l'itinéraire, adresse `/itineraires/…`) | Le modèle suppose un sommet par itinéraire ; un sentier côtier ne se saisit pas proprement. À trancher avant le contenu et les pages, qui en dépendent. | [fiche à valider](docs/fiches/01-sorties-sans-sommet.md) |
| 2 | **Lecture publique du contenu** (vues SQL `db/views`, rôle Postgres en lecture seule, `packages/domain`) | Le site ne sait rien lire. C'est le socle de toutes les pages et du MCP public, et l'invariant « le site ne dépend pas de Directus à l'exécution ». | à cadrer |
| 3 | **Fiche itinéraire** (trace sur la carte, profil, statistiques, infos pratiques, date de la sortie) | La page qui porte la valeur : « est-ce que cette sortie est pour moi ? ». Le pipeline GPX calcule déjà tout ce qu'elle affiche. | à cadrer |
| 4 | **Téléchargement de la trace** (GPX, KML, GeoJSON, compteur, guide d'import) | La promesse du site : trouver une sortie et télécharger sa trace en moins d'une minute. Les exports existent déjà dans le bucket. | à cadrer |
| 5 | **Carte hors de France** (MapTiler outdoor, repli OpenTopoMap, D9) | Remontée : la moitié des sorties pilotes sont en Corée, où le fond IGN est vide. | à cadrer |
| 6 | **Carte des sorties + fiche sommet** (repères, filtres par catégorie, panneau ou bottom sheet) | Le point d'entrée du site, qui remplace la page d'accueil provisoire. Montre toutes les sorties, les sommets regroupant leurs itinéraires. | à cadrer |
| 7 | **Aperçu carte et profil dans l'admin** (extension d'interface sur l'itinéraire) | Aujourd'hui on dépose un GPX sans voir le résultat ni les anomalies : la saisie se fait à l'aveugle. | à cadrer |
| 8 | **Première saisie chronométrée** (sorties pilotes Alpes et Corée, choisies par Claude dans les données Strava) | Critère de sortie de la phase 2 : un sommet et 2 itinéraires en moins de 20 minutes. Mesure ce qui ralentit la saisie avant d'en faire 30. | à cadrer |

## Ensuite : un site publiable

| # | Feature | Problème et valeur | Statut |
|---|---|---|---|
| 9 | **Version anglaise du site** (`/en`, contenu des tables de traduction) | L'anglais est déjà obligatoire pour publier, mais le site ne l'affiche pas : travail de traduction sans lecteur. | à cadrer |
| 10 | **Pages légales et avertissement** (« récit de sortie, pas un topo officiel », mentions, confidentialité) | Indispensable avant toute ouverture publique : c'est la principale protection en responsabilité (docs/04). | à cadrer |
| 11 | **Liste, recherche et filtres** (catégorie, altitude, cotation, durée, D+, région) | Utile dès une quinzaine de sommets ; avant, la carte suffit. | à cadrer |
| 12 | **SEO et cache** (sitemap, JSON-LD, Open Graph, SWR, purge à la publication) | Sans ça, personne ne trouve le site au lancement. À faire avant la bêta, pas avant. | à cadrer |
| 13 | **Saison et réglementation visibles** (mois praticables, bandeau hors saison, fermetures en Corée) | Évite qu'une trace d'été passe pour valable en hiver ; les sentiers coréens ferment par saison. | à cadrer |
| 14 | **Signalement** (formulaire public, file dans l'admin) | Garde les fiches à jour une fois le site ouvert. Peut attendre la bêta. | à cadrer |
| 15 | **Favoris dans le navigateur** (D7, sans compte) | Confort, pas indispensable au lancement. | à cadrer |

## Plus tard : avant ou après le lancement

| # | Feature | Problème et valeur | Statut |
|---|---|---|---|
| 16 | **MCP public en lecture seule** (`/mcp`, 7 outils) | Le différenciateur « demande à ton assistant » ; peu coûteux une fois les vues SQL faites. Visé en janvier 2027. | à cadrer |
| 17 | **Export FIT** (D5) | Au lancement seulement s'il passe sur 3 montres réelles, sinon v1.1. | à cadrer |
| 18 | **MCP admin, rôle Agent IA en brouillons** | Aide à la saisie ; demande les tests négatifs (publier, supprimer : refusés) avant activation. | à cadrer |
| 19 | **Tableau de bord admin** (téléchargements, fiches non revérifiées depuis 12 mois, signalements) | Pilotage une fois qu'il y a du trafic et du contenu. | à cadrer |
| 20 | **Grands sentiers en étapes** (Haeparang-gil, Jeju Olle : une page par sentier, étapes dans l'ordre), mode hiver et bulletins d'avalanche, PWA hors ligne, coréen | Backlog de saison (docs/02, phase 7), à trier selon les données. | à cadrer |

## Dette et vérifications en attente (hors priorisation)

Pas des features, mais à faire au fil de l'eau :

- **Altitude IGN et Copernicus jamais essayée contre les vrais services** : le réseau de la session
  cloud refuse `data.geopf.fr` et `api.open-meteo.com`. Le propriétaire doit ouvrir ces domaines
  (ou Claude passe par son Mac), puis mesurer le D+ du modèle de terrain sur les six traces Strava.
- **Seuil de D+ du modèle de terrain (2 m) non mesuré.**
- **Rôles Éditeur et Contributeur** du schéma : à confirmer quand un deuxième éditeur arrivera.

## Décisions du 2026-11-25

- L'ordre proposé est validé, la carte hors de France remonte (sorties pilotes en Corée et dans
  les Alpes).
- Lancement mi-avril 2027 maintenu, sans pression : usage personnel d'abord.
- Périmètre élargi à toutes les sorties intéressantes, pas seulement les sommets (fiche n° 1).
