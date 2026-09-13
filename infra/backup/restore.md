# Restaurer une sauvegarde

Les sauvegardes sont chiffrées avec [age](https://age-encryption.org) vers une clé publique. La clé
privée n'est **jamais** sur Railway : elle reste chez toi (gestionnaire de mots de passe + copie hors
ligne). Sans elle, les sauvegardes sont illisibles.

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

Toujours sur une **base neuve**, jamais par-dessus la production en service :

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
