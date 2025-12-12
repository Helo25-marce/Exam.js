# 📋 Résumé Final - Test avec Postman

## ✅ Vérifications Complètes Effectuées

### ✅ Connexion MongoDB Atlas
- **Statut** : ✅ **FONCTIONNE PARFAITEMENT**
- **Base de données** : `auth_db` accessible
- **Test d'insertion** : ✅ Réussi
- **Collections** : Sera créées automatiquement

### ✅ Configuration
- **Fichier .env** : ✅ Correctement configuré
- **Code** : ✅ Utilise `ServerApiVersion.v1`
- **Ports** : 3006 (serveur) et 3007 (pepper)

## 🚀 Démarrage des Serveurs

### Terminal 1 - Microservice Pepper
```bash
cd Exam.js
node pepper-service.js
```
**Attendu** : "Microservice pepper démarré sur le port 3007"

### Terminal 2 - Serveur Principal
```bash
cd Exam.js
node exam.js
```
**Attendu** :
- "✅ Connecté à MongoDB Atlas avec succès!"
- "Pepper récupéré avec succès depuis le microservice"
- "Serveur démarré sur le port 3006"

## 📍 Ports pour Postman

| Port | Service | Route Exemple |
|------|---------|---------------|
| **3007** | Microservice Pepper | `GET http://localhost:3007/pepper` |
| **3006** | Serveur Principal | Toutes les routes d'authentification |

## 🔐 Calcul de la Preuve de Travail (PoW)

**IMPORTANT** : Toutes les requêtes vers le port 3006 nécessitent l'en-tête `X-PoW-Proof`.

### Méthode Rapide : Utiliser le Script

```bash
node calculer-pow.js
```

Cela affichera la valeur à utiliser dans l'en-tête `X-PoW-Proof`.

**Exemple de sortie** :
```
📋 Utilisez cette valeur dans l'en-tête X-PoW-Proof: 24079
```

### Dans Postman

1. Créez une variable d'environnement `pow_proof`
2. Exécutez `node calculer-pow.js` pour obtenir la valeur
3. Ajoutez l'en-tête : `X-PoW-Proof: 24079` (ou utilisez `{{pow_proof}}`)

**⚠️ Note** : La preuve change toutes les 10 minutes. Recalculez si vous obtenez une erreur 403.

## 📋 Routes Disponibles (Ordre Chronologique)

### Phase 1 & 2 : Routes de Base

#### 1. POST /register
- **URL** : `http://localhost:3006/register`
- **Headers** :
  - `Content-Type: application/json`
  - `X-PoW-Proof: 24079` (valeur calculée)
- **Body** :
```json
{
  "email": "test1@example.com",
  "password": "password123"
}
```

#### 2. POST /login
- **URL** : `http://localhost:3006/login`
- **Headers** : Même que /register
- **Body** : Même que /register

### Phase 3 : Routes avec Salt

#### 3. POST /beginRegistration
- **URL** : `http://localhost:3006/beginRegistration`
- **Headers** : Même format
- **Body** :
```json
{
  "email": "test2@example.com",
  "password": "password123"
}
```

#### 4. GET /getSalt
- **URL** : `http://localhost:3006/getSalt?email=test2@example.com`
- **Headers** :
  - `X-PoW-Proof: 24079`
- **Response** : `{ "salt": "abc123..." }`

### Phase 5 : Connexion Sécurisée

#### 5. POST /loginWithSalt
- **URL** : `http://localhost:3006/loginWithSalt`
- **Headers** :
  - `Content-Type: application/json`
  - `X-PoW-Proof: 24079`
  - `User-Agent: PostmanRuntime/7.32.3` (important !)
- **Body** :
```json
{
  "email": "test2@example.com",
  "password": "password123",
  "salt": "salt_recu_depuis_getSalt"
}
```
- **Response** : Cookies `sessionToken` et `refreshToken` dans les headers

### Phase 7 : Route Protégée

#### 6. GET /me
- **URL** : `http://localhost:3006/me`
- **Headers** :
  - `X-PoW-Proof: 24079`
  - `Cookie: sessionToken=VOTRE_TOKEN` (récupéré depuis loginWithSalt)
  - `User-Agent: PostmanRuntime/7.32.3` (doit correspondre au login)

### Phase 8 : Refresh Tokens

#### 7. POST /refresh
- **URL** : `http://localhost:3006/refresh`
- **Headers** :
  - `X-PoW-Proof: 24079`
  - `Cookie: refreshToken=VOTRE_REFRESH_TOKEN` (récupéré depuis loginWithSalt)
  - `User-Agent: PostmanRuntime/7.32.3` (doit correspondre)

### Phase 9 : Administration

#### 8. POST /admin/refresh-pepper
- **URL** : `http://localhost:3006/admin/refresh-pepper`
- **Headers** :
  - `X-PoW-Proof: 24079`

## 🔄 Parcours de Test Complet Recommandé

### Test 1 : Inscription Simple (Phase 1 & 2)
1. Calculer PoW : `node calculer-pow.js`
2. **POST /register** avec email et password
3. **POST /login** avec les mêmes identifiants

### Test 2 : Inscription avec Salt (Phase 3)
1. **POST /beginRegistration** avec email et password
2. **GET /getSalt?email=xxx** pour obtenir le salt
3. Vérifier que le salt est retourné

### Test 3 : Connexion Complète (Phase 5, 7, 8)
1. **GET /getSalt?email=xxx** (si pas déjà fait)
2. **POST /loginWithSalt** avec email, password et salt
3. **Copier les cookies** `sessionToken` et `refreshToken` depuis les headers
4. **GET /me** avec le cookie `sessionToken`
5. **POST /refresh** avec le cookie `refreshToken`

## 📊 Vérification dans MongoDB Atlas

Après les tests, vérifiez dans MongoDB Atlas :

1. Allez dans **"Data Explorer"** : https://cloud.mongodb.com/v2/693bd5bcd76c3c2244d878fc#/metrics/replicaSet/693bda7988e0a076020aa59a/explorer/auth_db
2. Base de données : `auth_db`
3. Collections créées :
   - ✅ `users` (après inscription via /beginRegistration)
   - ✅ `sessions` (après connexion via /loginWithSalt)
   - ✅ `refreshTokens` (après connexion via /loginWithSalt)

## ⚠️ Points Importants

1. **PoW** : Recalculez toutes les 10 minutes ou si vous obtenez une erreur 403
2. **Cookies** : Postman gère automatiquement les cookies dans l'onglet "Cookies"
3. **User-Agent** : Doit être identique entre login et requêtes protégées
4. **Temps de réponse** : Minimum 200ms (uniformisation des temps)

## 🧪 Script de Test Rapide

Pour tester rapidement, vous pouvez utiliser ce script Node.js :

```bash
# Calculer PoW
node calculer-pow.js

# Tester MongoDB
node test-exam-mongodb.js

# Tester serveur complet (nécessite que les serveurs soient démarrés)
node test-serveur-complet.js
```

## ✅ Checklist Finale

- [x] MongoDB Atlas connecté et fonctionnel
- [x] Base de données `auth_db` accessible
- [x] Collections seront créées automatiquement
- [x] Code utilise `ServerApiVersion.v1`
- [x] Fichier `.env` correctement configuré
- [x] Script de calcul PoW disponible
- [x] Documentation complète créée

## 🎯 Prêt pour les Tests !

Tout est configuré et testé. Vous pouvez maintenant :
1. Démarrer les serveurs (pepper-service.js et exam.js)
2. Calculer la preuve de travail : `node calculer-pow.js`
3. Tester avec Postman en suivant le guide ci-dessus

**Bonne chance avec votre TP ! 🚀**

