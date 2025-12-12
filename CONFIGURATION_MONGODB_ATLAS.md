# Configuration MongoDB Atlas - Guide Étape par Étape

## Étape 1 : Choisir la Méthode de Connexion

Sur l'écran MongoDB Atlas que vous voyez, **cliquez sur "Drivers"** (l'icône avec "1011" en vert).

C'est la bonne méthode car nous utilisons le driver MongoDB natif pour Node.js.

## Étape 2 : Obtenir la Chaîne de Connexion

1. Après avoir cliqué sur "Drivers", vous verrez un écran avec :
   - **Driver**: Node.js (devrait être sélectionné)
   - **Version**: La version la plus récente (ex: 5.5 ou plus récent)

2. **Copiez la chaîne de connexion** qui ressemble à :
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

3. **Remplacez `<username>` et `<password>`** par :
   - Le nom d'utilisateur que vous avez créé dans "Database Access"
   - Le mot de passe que vous avez créé

4. **Ajoutez le nom de la base de données** à la fin :
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/auth_db?retryWrites=true&w=majority
   ```
   Note : `auth_db` est le nom de la base de données que nous utilisons.

## Étape 3 : Mettre à Jour le Fichier .env

Mettez à jour votre fichier `.env` avec la nouvelle URI MongoDB :

```env
PORT=3006
MONGODB_URI=mongodb+srv://votre-username:votre-password@cluster0.xxxxx.mongodb.net/auth_db?retryWrites=true&w=majority
DB_NAME=auth_db
PEPPER_SERVICE_URL=http://localhost:3007
PEPPER_SERVICE_PORT=3007
PEPPER_SECRET=pepper-secret-tres-long-et-aleatoire-changez-moi-en-production-12345678901234567890
NODE_ENV=development
```

**Important** : Remplacez `votre-username`, `votre-password`, et `cluster0.xxxxx` par vos vraies valeurs.

## Étape 4 : Collections Nécessaires

MongoDB créera automatiquement les collections lors de la première utilisation. Vous n'avez **PAS besoin** de les créer manuellement.

Les collections qui seront créées automatiquement :

### 1. Collection `users`
- Créée lors de la première inscription (`POST /register` ou `POST /beginRegistration`)
- Structure :
  ```javascript
  {
    _id: ObjectId,
    email: String,
    password: String,  // Hash: sha256(password + salt + pepper)
    salt: String,      // Salt unique (seulement pour les utilisateurs créés via /beginRegistration)
    createdAt: Date
  }
  ```

### 2. Collection `sessions`
- Créée lors de la première connexion réussie (`POST /loginWithSalt`)
- Structure :
  ```javascript
  {
    _id: ObjectId,
    userId: ObjectId,
    token: String,        // Token de session (64 caractères hex)
    expiration: Date,     // Expiration (1 heure après création)
    fingerprint: String,  // Hash SHA256 du User-Agent
    createdAt: Date
  }
  ```

### 3. Collection `refreshTokens`
- Créée lors de la première connexion réussie (`POST /loginWithSalt`)
- Structure :
  ```javascript
  {
    _id: ObjectId,
    userId: ObjectId,
    token: String,        // Refresh token (64 caractères hex)
    expiration: Date,     // Expiration (7 jours après création)
    fingerprint: String,  // Hash SHA256 du User-Agent
    invalidated: Boolean, // false par défaut, true si invalidé
    parentToken: String,  // null pour le premier, puis référence au token parent
    createdAt: Date
  }
  ```

## Étape 5 : Vérifier la Connexion

1. **Assurez-vous que le microservice pepper est démarré** :
   ```bash
   node pepper-service.js
   ```

2. **Démarrez le serveur principal** :
   ```bash
   node exam.js
   ```

3. **Vérifiez les messages** :
   - ✅ "Connecté à MongoDB" - La connexion fonctionne
   - ✅ "Pepper récupéré avec succès depuis le microservice" - Le pepper est disponible
   - ✅ "Serveur démarré sur le port 3006" - Tout est prêt

4. **Si vous voyez des erreurs** :
   - "MongoServerError: Authentication failed" → Vérifiez le nom d'utilisateur et le mot de passe
   - "MongoNetworkError: connect ECONNREFUSED" → Vérifiez que votre IP est autorisée dans "Network Access"
   - "MongoServerSelectionError: getaddrinfo ENOTFOUND" → Vérifiez que l'URI est correcte

## Étape 6 : Vérifier les Collections dans MongoDB Atlas

1. Dans MongoDB Atlas, allez dans "Database" (menu de gauche)
2. Cliquez sur "Browse Collections"
3. Vous devriez voir la base de données `auth_db` avec les collections :
   - `users`
   - `sessions`
   - `refreshTokens`

**Note** : Les collections n'apparaîtront qu'après la première insertion de données.

## Test Rapide

Pour tester que tout fonctionne :

1. Utilisez Postman ou curl pour faire une requête `POST /register` (Phase 1)
2. Vérifiez dans MongoDB Atlas que la collection `users` a été créée
3. Vérifiez qu'un document utilisateur a été ajouté

---

## Résumé

✅ **Méthode à utiliser** : **Drivers** (Node.js)
✅ **Collections** : Créées automatiquement (users, sessions, refreshTokens)
✅ **Base de données** : `auth_db` (spécifiée dans l'URI ou créée automatiquement)
✅ **Pas besoin de créer manuellement** : MongoDB crée tout automatiquement

