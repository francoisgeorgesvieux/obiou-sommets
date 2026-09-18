# Directus : tes premières collections

> Préparé le 18 septembre 2026. Tu crées `regions` et les langues toi-même, pour voir comment
> Directus fonctionne ; je prends ensuite la main pour les autres collections. Environ 30 à 45 min.
> Référence des champs : [05-modele-de-donnees.md](05-modele-de-donnees.md).

## Avant de commencer

- **Uniquement en staging** : https://cms-staging-5f20.up.railway.app. Le schéma ne se modifie
  jamais en production ; il y sera appliqué plus tard depuis le snapshot. Le staging se met en
  veille : le premier chargement peut prendre une demi-minute.
- **Les libellés ci-dessous viennent de la documentation de Directus**, en anglais, avec le français
  entre parenthèses. L'interface de la version 12 peut différer un peu. En cas de doute, ouvre
  l'admin dans le navigateur de l'app Claude : je vois alors la même page que toi et je te guide.
  Tu te connectes toi-même, je ne saisis jamais ton mot de passe.

Quatre mots à connaître :

| Directus | Base de données | Exemple |
|---|---|---|
| collection | table | `regions` |
| champ (*field*) | colonne | `slug` |
| interface | le widget de saisie d'un champ | liste déroulante, carte, éditeur Markdown |
| élément (*item*) | ligne | la région « Dévoluy » |

## Étape 1 — Créer la collection `regions`

1. **Settings** (Paramètres, la roue crantée en bas à gauche) → **Data Model** (Modèle de données)
   → le bouton **+** (Create Collection).
2. Nom : `regions`. Clé primaire : **entier auto-incrémenté** (le choix par défaut), nommée `id`.
3. À l'écran des champs optionnels, coche :
   - **Sort** : l'ordre d'affichage, par glisser-déposer ;
   - **Date Created**, **Date Updated**, **User Created**, **User Updated** : qui a fait quoi, et
     quand.

   **Ne coche pas Status** : les régions n'ont pas de statut de publication.
4. Valide.

*Ce qui vient de se passer* : Directus a créé une table `regions` dans Postgres, avec ces colonnes.
Tu la retrouves dans **Content** (Contenu), vide pour l'instant.

- [ ] Collection `regions` créée

## Étape 2 — Les champs communs à toutes les langues

Dans **Data Model → regions**, bouton **Create Field** (Créer un champ), pour chacun :

1. **`slug`** : type **Input** (Saisie).
   - Dans les options de l'interface, active **Slug** : Directus met la saisie en forme (minuscules,
     tirets, sans accent).
   - Coche **Required** (obligatoire) et **Unique** : deux régions ne peuvent pas avoir la même
     adresse.
2. **`niveau`** : type **Dropdown** (Liste déroulante), obligatoire. Deux choix :
   - libellé « Zone », valeur `zone` ;
   - libellé « Massif », valeur `massif`.
3. **`parent`** : type **Many to One** (Plusieurs à un). Collection liée : **`regions`**, elle-même.
   Modèle d'affichage : `{{slug}}`. C'est ce champ qui dira qu'un massif appartient à une zone.
4. **`emprise`**, facultatif : type **Map** (Carte), géométrie **Polygon**. Tu peux le sauter.

*Ce qui vient de se passer* : `parent` est une **relation** de `regions` vers `regions`. En base,
c'est une colonne qui contient l'`id` d'une autre région.

- [ ] Champs `slug`, `niveau` et `parent` créés

## Étape 3 — Les langues et les champs traduits

1. Dans `regions`, crée un champ de type **Translations** (Traductions), clé `traductions`.
   - Directus propose de créer la collection des langues : accepte **`languages`**.
   - Il propose aussi la table des traductions : accepte **`regions_translations`**.

   Deux collections apparaissent. `regions_translations` est une table de liaison, que Directus
   masque souvent : si elle n'apparaît pas dans la liste, cherche l'option qui affiche les
   collections cachées.
2. Dans **Content → Languages**, ne garde que **Français** (`fr`) et **English** (`en`). Supprime
   les autres si Directus en a créé, ajoute ces deux-là s'ils manquent. **Pas de coréen
   maintenant** : il s'ajoutera plus tard, par une simple ligne.
3. Dans **Data Model → regions_translations**, crée les champs traduits :
   - **`nom`** : Input, obligatoire ;
   - **`description`** : **Markdown**, facultatif.
4. Dans **Data Model → regions → traductions**, règle la langue par défaut sur **Français**, si
   l'interface le propose.

Il existe un raccourci : l'assistant **Generate Translations**, dans les réglages de la collection,
fait tout cela d'un coup. Mais il crée 8 langues par défaut (anglais, arabe, allemand…) qu'il
faudrait supprimer ensuite. La voie manuelle ci-dessus montre mieux ce qui se passe.

*Ce qui vient de se passer* : le nom et la description ne sont plus dans `regions` mais dans
`regions_translations`, avec une ligne par région et par langue. Dans le formulaire, ils
apparaissent en onglets FR | EN.

- [ ] `languages` réduite à `fr` et `en`
- [ ] Champs `nom` et `description` créés dans `regions_translations`

## Étape 4 — Saisir les quatre régions

**Content → Regions → +**, puis remplis les onglets FR et EN du champ Traductions :

| `slug` | `niveau` | `parent` | Nom FR | Nom EN |
|---|---|---|---|---|
| `alpes` | Zone | — | Alpes | Alps |
| `coree-du-sud` | Zone | — | Corée du Sud | South Korea |
| `devoluy` | Massif | `alpes` | Dévoluy | Dévoluy |
| `jeju` | Massif | `coree-du-sud` | Jeju | Jeju |

Crée les deux zones d'abord : un massif a besoin de sa zone pour le champ `parent`. Ensuite, par
glisser-déposer dans la liste, mets les Alpes avant la Corée du Sud.

La règle « français et anglais obligatoires pour publier » n'existe pas encore : ce sera une
extension de la phase 2. Remplis simplement les deux langues.

- [ ] Les quatre régions saisies, en français et en anglais

## Étape 5 — Faire le point, puis me passer la main

Tu as vu les briques qui servent partout ailleurs :
- une **collection** et ses champs système (tri, dates, auteurs) ;
- des **interfaces** : saisie, slug, liste déroulante, carte, Markdown ;
- une **relation** « plusieurs à un », ici d'une région vers une autre ;
- les **traductions** : une table de liaison vers `languages`.

Dis-moi quand c'est fait. On regarde le résultat ensemble dans le navigateur de l'app, puis je prends
la main pour `sommets`, `itineraires` et les autres collections. Il restera ensuite à exporter le
schéma (`directus schema snapshot`) dans `apps/cms/snapshots/schema.yaml`, pour le versionner.
