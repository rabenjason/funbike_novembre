# Backend Funbike — Node.js, GraphQL et MySQL

Le backend fournit l’API catalogue et les mutations d’administration. Il n’installe, ne démarre et ne virtualise pas MySQL : il se connecte à une instance MySQL/MariaDB déjà disponible (hébergement existant, serveur local ou instance administrée notamment par phpMyAdmin). Il n’y a pas de Docker requis ni de données d’exemple insérées.

## 1. Préparer MySQL

1. Dans votre hébergeur MySQL ou dans phpMyAdmin, créez une base vide (par exemple `funbike`) et un utilisateur dédié.
2. Pour l’installation du schéma, cet utilisateur doit pouvoir créer des tables et index. Une fois le schéma appliqué, ses permissions peuvent être limitées à `SELECT`, `INSERT`, `UPDATE` et `DELETE` pour le fonctionnement courant.
3. Depuis `backend/`, créez la configuration locale :

   ```sh
   cp .env.example .env
   ```

4. Modifiez `backend/.env` avec l’URL de l’instance MySQL et générez un secret privé pour les jetons :

   ```env
   DATABASE_URL=mysql://UTILISATEUR:MOT_DE_PASSE@HOTE:3306/funbike
   API_PORT=4000
   API_PROXY_TARGET=http://127.0.0.1:4000
   JWT_SECRET=une-valeur-aleatoire-privee-d-au-moins-32-octets
   JWT_EXPIRES_IN=8h
   ```

   Vous pouvez générer un secret avec `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. Encodez en URL les caractères réservés éventuellement présents dans le nom d’utilisateur ou le mot de passe MySQL. Ne partagez ni ne commitez `.env`.

5. Installez les dépendances et appliquez le schéma sans données de démonstration :

   ```sh
   npm ci
   npm run db:setup
   ```

   Vous pouvez également sélectionner la base dans phpMyAdmin et importer `database/schema.sql`.

## 2. Initialiser le compte administrateur

Il n’existe ni compte par défaut, ni inscription publique, ni mot de passe codé dans le backend. Après la création des tables, définissez temporairement dans `backend/.env` :

```env
INITIAL_ADMIN_EMAIL=votre-adresse-privee
INITIAL_ADMIN_PASSWORD=votre-mot-de-passe-unique
```

Le mot de passe doit compter au moins 12 caractères et au plus 72 octets UTF-8. Depuis `backend/`, lancez une seule fois :

```sh
npm run admin:create
```

La commande crée le premier compte administrateur uniquement et refuse de créer un deuxième compte par cette procédure. Elle enregistre un hash bcrypt, jamais le mot de passe en clair. **Supprimez ensuite `INITIAL_ADMIN_PASSWORD` de `backend/.env`.** Le courriel et le mot de passe restent dans votre environnement privé; ne les envoyez pas dans le chat ni dans Git.

## 3. Démarrer l’API et le frontend

Depuis `backend/` :

```sh
npm run dev
```

L’API **Apollo Server 5** est servie par Express 5 sur `http://localhost:4000/graphql`. Le front utilise Apollo Client et envoie ses requêtes vers `/graphql` sur la même origine. Dans un second terminal, depuis la racine du dépôt, démarrez le frontend avec `npm run dev`. **`npm run dev` démarre seulement le frontend** : si le backend n’est pas lancé, le proxy Vite ne peut pas joindre `/graphql` et le dashboard affichera une erreur HTTP. Après avoir configuré `backend/.env`, vous pouvez aussi démarrer les deux processus depuis la racine avec `npm run dev:stack`. Vite relaie `/graphql` au backend via la variable serveur `API_PROXY_TARGET`; le navigateur utilise uniquement cette URL relative.

Ouvrez `/admin` sur le site pour vous connecter avec l’adresse e-mail du compte initialisé. En production, configurez l’hébergement statique pour réécrire `/admin` vers `index.html` (fallback SPA). Le tableau de bord permet de gérer le catalogue paginé (recherche et filtres), les classifications, les marques et leurs associations aux rubriques, les catégories éditoriales de l’accueil, les bannières héro, les promotions et les points de vente. Les nouveaux produits sont créés en brouillon. Les photos de marques, catégories, bannières et promotions s’importent depuis l’ordinateur, avec aperçu, remplacement et retrait avant l’enregistrement. Sur grand écran, les sections sont organisées dans un menu latéral; sur mobile, la navigation reste horizontale. Les champs d’ordre d’affichage acceptent uniquement des entiers de 0 à 100 000 et le backend rejette les valeurs négatives. Pour normaliser en base les valeurs négatives déjà enregistrées, réappliquez le schéma avec `npm run db:setup`; elles seront ramenées à 0. La modification du mot de passe révoque les jetons actifs et demande une nouvelle connexion.

### Importation des photos

Dans le dashboard, les produits acceptent plusieurs photos; les logos de marque et les images de catégorie, bannière et promotion acceptent une photo chacun. Les aperçus apparaissent dès la sélection sur l’ordinateur. Une photo peut être retirée ou remplacée avant l’enregistrement. Pour un produit, la première photo est principale par défaut; le bouton « Définir comme principale » permet d’en choisir une autre. Les formats acceptés sont JPG, PNG, WebP, GIF et AVIF, avec une limite de 10 Mo par fichier. L’importation et le nettoyage des photos exigent une session administrateur.

Le backend conserve les fichiers dans `backend/uploads/` par défaut. `UPLOAD_DIR` peut définir un autre dossier persistant et accessible en écriture. Sauvegardez ce dossier avec la base de données : les fiches stockent les chemins des photos, pas leur contenu binaire. Les chemins `/admin/uploads` (importation/nettoyage) et `/uploads/` (lecture publique des photos) doivent être relayés vers le backend par le reverse proxy en production; le serveur Vite les relaie automatiquement en développement.

## API et autorisations

Vérifier l’état du serveur et de MySQL :

```graphql
query {
  health { status database }
}
```

Lire les produits publiés est public. Les brouillons ne sont visibles que dans les requêtes d’administration authentifiées. Toutes les mutations, à l’exception de `login`, exigent un jeton administrateur `Authorization: Bearer <accessToken>`. Les jetons sont signés avec `JWT_SECRET`, expirent après `JWT_EXPIRES_IN` (huit heures par défaut), et sont invalidés lorsque l’e-mail ou le mot de passe change. Le frontend conserve le jeton dans le stockage de session de l’onglet courant. Le compte se consulte avec `me`; seul son propriétaire peut modifier ses propres identifiants, et chaque changement exige le mot de passe actuel. `changeMyEmail(currentPassword, newEmail)` normalise et vérifie l’unicité de l’adresse; `changeMyPassword(currentPassword, newPassword)` vérifie la longueur et remplace le hash bcrypt. Après l’une ou l’autre opération, l’interface déconnecte le compte pour une nouvelle connexion avec les identifiants mis à jour. Après huit échecs de connexion pour la même adresse, les tentatives sont temporairement bloquées pendant quinze minutes; cette limite mémoire est réinitialisée au redémarrage, et une limitation complémentaire au niveau du reverse proxy est recommandée en production.

Exemple de connexion :

```graphql
mutation {
  login(email: "votre-adresse-privee", password: "votre-mot-de-passe-unique") {
    accessToken
    expiresIn
    user { id email role }
  }
}
```

Une fois connecté, le profil courant est disponible avec `query { me { id email role isActive } }`. Pour modifier les identifiants, envoyez le jeton dans l’en-tête `Authorization: Bearer <accessToken>` et passez toujours le mot de passe actuel :

```graphql
mutation ChangeEmail($currentPassword: String!, $newEmail: String!) {
  changeMyEmail(currentPassword: $currentPassword, newEmail: $newEmail)
}
```

```graphql
mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
  changeMyPassword(currentPassword: $currentPassword, newPassword: $newPassword)
}
```

Ces mutations portent uniquement sur le compte connecté (aucun `userId` n’est accepté), pour empêcher la modification d’un autre compte. Après le changement, les jetons précédents sont révoqués et il faut se reconnecter. Il n’y a pas de création publique d’utilisateurs : le backend utilise le compte administrateur initialisé par la commande locale.

En production, définissez `NODE_ENV=production`, utilisez HTTPS, gardez `JWT_SECRET` privé et configurez un reverse proxy approprié. Ne publiez pas phpMyAdmin sur Internet sans protection réseau et authentification renforcée.

## Modèle de données

- `products.id` est un identifiant technique; `products.reference` reste une référence commerciale indépendante et facultative.
- `products.brand_id` indique le fabricant. Les marques compatibles des pièces sont une relation distincte (`spare_part_compatible_brands`).
- Les familles, sous-familles, types, catégories catalogue, usages et définitions de caractéristiques sont des valeurs en base, non des énumérations GraphQL de valeurs métier. Leur archivage les retire des choix publics sans supprimer l’historique.
- Les modèles structurels de produit restent `Motorcycle`, `SparePart`, `Equipment` et `Accessory`; `TVS_ACCESSORIES` n’est pas transformé en une nouvelle catégorie de produit.
- Les images sont conservées dans `product_images`; les caractéristiques dans `product_characteristics` et `characteristic_definitions`.
- Le prix est du texte afin de conserver les valeurs telles que « Sur devis ».
- Une mise à jour produit remplace ses images, spécifications et listes d’associations; envoyez les listes souhaitées, y compris `[]` pour les vider. Une suppression de classification ou de marque est un archivage; la suppression d’un produit efface sa fiche et ses associations.
- `brand_sections` conserve les liens administrables entre les marques et les rubriques du site (ordre, libellé, route, filtres, mise en avant et ordre du pied de page). `categories` contient les cartes éditoriales de l’accueil, distinctes des catégories de produits.
- `featured_banners`, `homepage_promotions` et `dealers` stockent respectivement les diapositives héro, les promotions avec leurs points forts et les points de vente avec leurs services. Ces tables sont créées vides : il n’y a ni seed ni import automatique des tableaux locaux.
- Le frontend interroge GraphQL pour le catalogue et le contenu éditorial. Certains composants gardent les tableaux historiques de `src/data/` comme secours pendant le chargement initial ou si l’API est indisponible; ces tableaux ne sont jamais insérés automatiquement. Une base vide reste vide et doit être remplie depuis le dashboard.
