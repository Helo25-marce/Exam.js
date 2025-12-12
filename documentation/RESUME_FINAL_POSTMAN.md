# Guide Postman - Résumé

## ✅ État du Système

- MongoDB Atlas : ✅ Connecté et fonctionnel
- Base de données : `auth_db` accessible
- Collections : créées automatiquement lors de la première utilisation

## 🚀 Démarrage

**Terminal 1** :
```bash
node pepper-service.js
```
Attendu : "Microservice pepper démarré sur le port 3007"

**Terminal 2** :
```bash
node exam.js
```
Attendu : "Connecté à MongoDB Atlas", "Pepper récupéré", "Serveur démarré sur le port 3006"

## 📍 Ports

- **3007** : Microservice Pepper (`GET http://localhost:3007/pepper`)
- **3006** : Serveur Principal (toutes les routes)

## 🔐 Preuve de Travail (PoW)

**Important** : Toutes les requêtes vers le port 3006 nécessitent l'en-tête `X-PoW-Proof`.

**Calculer la valeur** :
```bash
node calculer-pow.js
```

Cela affiche la valeur à utiliser (ex: `24079`). **Note** : Change toutes les 10 minutes, recalculer si erreur 403.

## 📋 Routes Disponibles

### Phase 1 & 2 : Routes de base

**POST /register**
- URL : `http://localhost:3006/register`
- Headers : `Content-Type: application/json`, `X-PoW-Proof: <valeur>`
- Body : `{"email": "test@example.com", "password": "password123"}`

**POST /login**
- Même format que /register

### Phase 3 : Routes avec salt

**POST /beginRegistration**
- URL : `http://localhost:3006/beginRegistration`
- Headers : même format
- Body : `{"email": "test@example.com", "password": "password123"}`

**GET /getSalt**
- URL : `http://localhost:3006/getSalt?email=test@example.com`
- Headers : `X-PoW-Proof: <valeur>`
- Response : `{"salt": "abc123..."}`

### Phase 5 : Connexion sécurisée

**POST /loginWithSalt**
- URL : `http://localhost:3006/loginWithSalt`
- Headers : `Content-Type: application/json`, `X-PoW-Proof: <valeur>`, `User-Agent: PostmanRuntime/7.32.3`
- Body : `{"email": "test@example.com", "password": "password123", "salt": "<salt_recu>"}`
- Response : Cookies `sessionToken` et `refreshToken` dans les headers

### Phase 7 : Route protégée

**GET /me**
- URL : `http://localhost:3006/me`
- Headers : `X-PoW-Proof: <valeur>`, `Cookie: sessionToken=<token>`, `User-Agent: PostmanRuntime/7.32.3`
- **Important** : User-Agent doit correspondre à celui utilisé lors du login

### Phase 8 : Refresh tokens

**POST /refresh**
- URL : `http://localhost:3006/refresh`
- Headers : `X-PoW-Proof: <valeur>`, `Cookie: refreshToken=<token>`, `User-Agent: PostmanRuntime/7.32.3`

### Phase 9 : Administration

**POST /admin/refresh-pepper**
- URL : `http://localhost:3006/admin/refresh-pepper`
- Headers : `X-PoW-Proof: <valeur>`

## 🔄 Parcours de Test Recommandé

1. **Inscription** : `POST /beginRegistration`
2. **Récupérer salt** : `GET /getSalt?email=xxx`
3. **Connexion** : `POST /loginWithSalt` → copier les cookies
4. **Accès protégé** : `GET /me` avec cookie sessionToken
5. **Refresh** : `POST /refresh` avec cookie refreshToken

## ⚠️ Points Importants

1. **PoW** : Recalculer toutes les 10 minutes
2. **Cookies** : Postman gère automatiquement dans l'onglet "Cookies"
3. **User-Agent** : Doit être identique entre login et requêtes protégées
4. **Temps de réponse** : Minimum 200ms (normal, uniformisation)

## 📊 Vérification MongoDB

Après tests, vérifier dans MongoDB Atlas :
- Collection `users` : après inscription
- Collection `sessions` : après connexion
- Collection `refreshTokens` : après connexion

## ✅ Prêt !

Tout est configuré. Démarrer les serveurs et tester avec Postman.
