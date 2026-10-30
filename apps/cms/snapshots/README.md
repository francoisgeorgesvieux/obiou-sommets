# Snapshots de schéma

Le modèle de données Directus est versionné ici, dans `schema.yaml`. Référence des champs :
[docs/05-modele-de-donnees.md](../../../docs/05-modele-de-donnees.md).

## ⚠️ Le snapshot est appliqué à chaque démarrage

`obiou/entrypoint.cjs` lance `directus schema apply --yes schema.yaml` à **chaque** démarrage du
service `cms`. L'application rend la base **identique** au fichier : une collection ou un champ créé
dans l'admin mais absent du fichier est **supprimé, avec ses données**, au déploiement suivant.

D'où la règle : **toute modification de schéma dans l'admin staging est exportée et commitée avant
le prochain déploiement de `cms`**.

## Modifier le schéma

1. Modifier dans l'admin **staging uniquement** (https://cms-staging-5f20.up.railway.app).
2. Exporter : connecté à l'admin staging, ouvrir
   https://cms-staging-5f20.up.railway.app/schema/snapshot?export=yaml ; le navigateur télécharge
   le fichier. (Autre voie : `npx directus schema snapshot` dans le conteneur, qui demande une clé
   SSH enregistrée chez Railway.)
3. Remplacer `schema.yaml` par l'export, relire le diff, commit sur une branche, pousser la branche
   sur `staging`, puis PR vers `main` : la fusion applique le schéma en production.

En production, personne ne modifie le modèle depuis l'interface.

## Limite de collections de la licence

Directus 12 plafonne le nombre de collections selon la licence : **25 en « Core »** (sans clé),
dossiers et tables système exclus, **tables de traduction et de liaison comprises**. Le schéma en
compte 30 : il faut la licence Open Innovation Grant (staging et production). En local, sans clé,
`schema apply` échoue sur `collections limit exceeded`. Pour tester en local, découper le schéma en
moitiés de 25 collections au plus (mesuré le 2026-09-19).

Un `schema apply` en échec n'est **pas atomique** : les collections créées avant l'erreur restent.
