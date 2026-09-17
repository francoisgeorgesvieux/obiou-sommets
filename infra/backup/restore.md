# Restaurer une sauvegarde

Les sauvegardes sont chiffrées avec [age](https://age-encryption.org) vers une clé publique. La clé
privée n'est **jamais** sur Railway : elle reste chez toi (gestionnaire de mots de passe + copie hors
ligne). Sans elle, les sauvegardes sont illisibles.

## Tester une restauration (propriétaire, sans rien installer)

```bash
infra/backup/restore-test.sh
```

Le script télécharge la dernière sauvegarde de production, la déchiffre avec
`~/.config/obiou-sommets/backup-age.key`, la restaure dans une base jetable sans réseau, puis
affiche les extensions, le nombre de tables et le nombre de lignes des tables non vides (aucun
contenu). Il ne demande que Docker et la CLI railway : aws, age et pg_restore tournent dans des
conteneurs, et tout est supprimé à la fin. Premier lancement : environ 900 Mo d'image à télécharger.

- `infra/backup/restore-test.sh <fichier>.dump.age` : un fichier déjà téléchargé ;
- `--garder` : garde la base restaurée pour l'explorer (le script affiche comment la supprimer).

Attendu : `✓ … restaurée : N tables publiques, dont M directus_*`, avec le même N que la dernière
ligne verte du service `backup`.

## 1. Récupérer le fichier

Dans Railway, onglet *Credentials* du bucket de production, ou avec l'AWS CLI :

```bash
aws s3 ls --endpoint-url "$ENDPOINT" "s3://$BUCKET/backups/postgres/"
aws s3 cp --endpoint-url "$ENDPOINT" "s3://$BUCKET/backups/postgres/<fichier>.dump.age" .
```

## 2. Déchiffrer

```bash
age --decrypt --identity ~/.config/obiou-sommets/backup-age.key --output restore.dump <fichier>.dump.age
```

## 3. Restaurer sur une base neuve

Toujours sur une **base neuve**, jamais par-dessus la production en service. Le serveur doit avoir
**TimescaleDB et PostGIS**, comme l'image de production
(`ghcr.io/railwayapp-templates/timescale-postgis-ssl:pg17-ts2.17`, amd64 seulement) : une image
PostGIS seule, comme celle du `docker-compose.yml` local, s'arrête sur
`extension "timescaledb" is not available` (mesuré le 2026-09-17).

```bash
createdb obiou_restore
pg_restore --no-owner --no-privileges --exit-on-error --dbname=obiou_restore restore.dump
```

Puis vérifier les données, pointer `DB_CONNECTION_STRING` (cms) et `NUXT_DATABASE_URL` (web) vers
la nouvelle base, et redéployer.

## Vérification automatique

Chaque nuit, le service `backup` restaure le dump dans une base temporaire (`obiou_restore_check`)
avant de l'envoyer. Un run vert dans Railway se termine par :

```
✓ backup uploaded and verified restorable: …
```

Un run rouge veut dire **pas de sauvegarde ce jour-là** : à regarder tout de suite.
