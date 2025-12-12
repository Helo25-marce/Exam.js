# Guide Complet pour Tester avec Postman

## ✅ Vérification Préalable

La connexion MongoDB a été testée et fonctionne parfaitement :
- ✅ Connexion MongoDB Atlas : **RÉUSSIE**
- ✅ Base de données `auth_db` : **ACCESSIBLE**
- ✅ Insertion/Suppression : **FONCTIONNE**
- ✅ Collections nécessaires : **SERONT CRÉÉES AUTOMATIQUEMENT**

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

- **Port 3007** : Microservice Pepper
- **Port 3006** : Serveur Principal (toutes les routes d'authentification)

## 🔐 Calcul de la Preuve de Travail (PoW)

**IMPORTANT** : Toutes les requêtes vers le port 3006 nécessitent l'en-tête `X-PoW-Proof`.

### Formule
Le client doit trouver une valeur `preuve` telle que :
```
sha256(IP_client + seed_10min + preuve) commence par 4 zéros (0000...)
```

### Script JavaScript pour Calculer PoW

Créez un script dans Postman (Pre-request Script) ou utilisez ce code :

```javascript
const crypto = require('crypto');

function calculerPoW(ip, seed, difficulte = 4) {
  let preuve = 0;
  const prefixe = '0'.repeat(difficulte);
  
  while (true) {
    const chaine = ip + seed + preuve.toString();
    const hash = crypto.createHash('sha256').update(chaine).digest('hex');
    
    if (hash.startsWith(prefixe)) {
      return preuve.toString();
    }
    
    preuve++;
    
    // Sécurité : limiter les tentatives
    if (preuve > 1000000) {
      throw new Error('Preuve de travail trop difficile');
    }
  }
}

// Pour Postman Pre-request Script :
const ipClient = '127.0.0.1'; // ou pm.environment.get('client_ip')
const maintenant = new Date();
const minutes = maintenant.getMinutes();
const minutesArrondies = Math.floor(minutes / 10) * 10;
const dateArrondie = new Date(maintenant);
dateArrondie.setMinutes(minutesArrondies, 0, 0);
const seed = Math.floor(dateArrondie.getTime() / 1000).toString();

const preuve = calculerPoW(ipClient, seed, 4);
pm.environment.set('pow_proof', preuve);
```

### Script Postman Pre-request (Simplifié)

Dans Postman, pour chaque requête vers le port 3006, ajoutez ce script dans "Pre-request Script" :

```javascript
// Calculer la seed (change toutes les 10 minutes)
const maintenant = new Date();
const minutes = maintenant.getMinutes();
const minutesArrondies = Math.floor(minutes / 10) * 10;
const dateArrondie = new Date(maintenant);
dateArrondie.setMinutes(minutesArrondies, 0, 0);
const seed = Math.floor(dateArrondie.getTime() / 1000).toString();

// IP du client (localhost pour les tests)
const ipClient = '127.0.0.1';

// Trouver la preuve
let preuve = 0;
const prefixe = '0000';
let trouve = false;

while (!trouve && preuve < 1000000) {
    const chaine = ipClient + seed + preuve.toString();
    const hash = CryptoJS.SHA256(chaine).toString();
    
    if (hash.startsWith(prefixe)) {
        trouve = true;
    } else {
        preuve++;
    }
}

if (trouve) {
    pm.environment.set('pow_proof', preuve.toString());
    console.log('Preuve PoW calculée:', preuve);
} else {
    console.error('Impossible de calculer la preuve PoW');
}
```

**Note** : Postman utilise CryptoJS, pas crypto natif. Vous devrez peut-être installer CryptoJS dans Postman.

## 📋 Routes Disponibles pour Postman

### 1. Phase 1 & 2 : Routes de Base

#### POST /register
- **URL** : `http://localhost:3006/register`
- **Method** : POST
- **Headers** :
  - `Content-Type: application/json`
  - `X-PoW-Proof: {{pow_proof}}` (valeur calculée)
- **Body** (JSON) :
```json
{
  "email": "user@example.com",
  "password": "monMotDePasse123"
}
```

#### POST /login
- **URL** : `http://localhost:3006/login`
- **Method** : POST
- **Headers** :
  - `Content-Type: application/json`
  - `X-PoW-Proof: {{pow_proof}}`
- **Body** (JSON) :
```json
{
  "email": "user@example.com",
  "password": "monMotDePasse123"
}
```

### 2. Phase 3 : Routes avec Salt

#### POST /beginRegistration
- **URL** : `http://localhost:3006/beginRegistration`
- **Method** : POST
- **Headers** :
  - `Content-Type: application/json`
  - `X-PoW-Proof: {{pow_proof}}`
- **Body** (JSON) :
```json
{
  "email": "user2@example.com",
  "password": "monMotDePasse123"
}
```

#### GET /getSalt
- **URL** : `http://localhost:3006/getSalt?email=user2@example.com`
- **Method** : GET
- **Headers** :
  - `X-PoW-Proof: {{pow_proof}}`
- **Response** : `{ "salt": "..." }`

### 3. Phase 5 : Connexion Sécurisée

#### POST /loginWithSalt
- **URL** : `http://localhost:3006/loginWithSalt`
- **Method** : POST
- **Headers** :
  - `Content-Type: application/json`
  - `X-PoW-Proof: {{pow_proof}}`
  - `User-Agent: PostmanRuntime/7.32.3` (important pour le fingerprint)
- **Body** (JSON) :
```json
{
  "email": "user2@example.com",
  "password": "monMotDePasse123",
  "salt": "salt_recu_depuis_getSalt"
}
```
- **Response** : Cookies `sessionToken` et `refreshToken` seront retournés

### 4. Phase 7 : Route Protégée

#### GET /me
- **URL** : `http://localhost:3006/me`
- **Method** : GET
- **Headers** :
  - `X-PoW-Proof: {{pow_proof}}`
  - `Cookie: sessionToken={{session_token}}` (récupéré depuis la réponse de loginWithSalt)
  - `User-Agent: PostmanRuntime/7.32.3` (doit correspondre à celui utilisé lors du login)

### 5. Phase 8 : Refresh Tokens

#### POST /refresh
- **URL** : `http://localhost:3006/refresh`
- **Method** : POST
- **Headers** :
  - `X-PoW-Proof: {{pow_proof}}`
  - `Cookie: refreshToken={{refresh_token}}` (récupéré depuis la réponse de loginWithSalt)
  - `User-Agent: PostmanRuntime/7.32.3` (doit correspondre)

### 6. Phase 9 : Administration

#### POST /admin/refresh-pepper
- **URL** : `http://localhost:3006/admin/refresh-pepper`
- **Method** : POST
- **Headers** :
  - `X-PoW-Proof: {{pow_proof}}`

## 🔄 Parcours de Test Complet

### Étape 1 : Inscription
1. **POST /beginRegistration** avec email et password
2. **GET /getSalt?email=xxx** pour obtenir le salt

### Étape 2 : Connexion
1. **POST /loginWithSalt** avec email, password et salt
2. **Copier les cookies** `sessionToken` et `refreshToken` depuis les headers de réponse

### Étape 3 : Accès Protégé
1. **GET /me** avec le cookie `sessionToken`

### Étape 4 : Refresh Token
1. **POST /refresh** avec le cookie `refreshToken`

## ⚠️ Notes Importantes

1. **PoW** : La preuve de travail doit être recalculée toutes les 10 minutes (seed change)
2. **Cookies** : Postman gère automatiquement les cookies si vous utilisez l'onglet "Cookies"
3. **User-Agent** : Doit être identique entre login et requêtes protégées (pour le fingerprint)
4. **Temps de réponse** : Les réponses peuvent prendre 200ms minimum (uniformisation)

## 🧪 Test Rapide sans PoW (pour développement)

Si vous voulez tester rapidement sans calculer PoW, vous pouvez temporairement commenter le middleware PoW dans `exam.js` :

```javascript
// Phase 6: Appliquer le middleware PoW à toutes les routes
// app.use(middlewarePreuveDeTravail(4)); // Commenté temporairement pour tests
```

**⚠️ N'oubliez pas de le réactiver après les tests !**

## 📊 Vérification dans MongoDB Atlas

Après les tests, vérifiez dans MongoDB Atlas :
1. Allez dans **"Data Explorer"**
2. Base de données : `auth_db`
3. Collections créées :
   - `users` (après inscription)
   - `sessions` (après connexion)
   - `refreshTokens` (après connexion)

