# Système d'Authentification Web Sécurisé

## Description

Système d'authentification web sécurisé implémenté en Node.js avec Express et MongoDB, suivant les spécifications du TP. Toutes les fonctions cryptographiques structurelles sont codées manuellement (salts, peppers, tokens, comparaisons sécurisées).

## Prérequis

- Node.js (v14 ou supérieur)
- MongoDB (local ou distant)
- npm ou yarn

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer les variables d'environnement (créer un fichier `.env`) :
```env
PORT=3006
MONGODB_URI=mongodb://localhost:27017
DB_NAME=auth_db
PEPPER_SERVICE_URL=http://localhost:3007
PEPPER_SERVICE_PORT=3007
PEPPER_SECRET=votre-pepper-secret-tres-long-et-aleatoire
NODE_ENV=development
```

## Démarrage

### 1. Démarrer le microservice pepper (dans un terminal séparé)

```bash
node pepper-service.js
```

Le microservice pepper doit démarrer sur le port 3007.

### 2. Démarrer le serveur principal

```bash
npm start
# ou en mode développement avec nodemon
npm run dev
```

Le serveur principal démarre sur le port 3006. Il récupère automatiquement le pepper depuis le microservice au démarrage.

## Routes Disponibles

### Phase 1 & 2 : Routes de base (SHA256 simple)

- **POST /register** - Inscription avec mot de passe haché SHA256
- **POST /login** - Connexion avec vérification SHA256

### Phase 3 : Routes avec salt

- **POST /beginRegistration** - Inscription avec salt unique
- **GET /getSalt?email=xxx** - Obtenir le salt d'un utilisateur

### Phase 5 : Route de connexion sécurisée

- **POST /loginWithSalt** - Connexion avec salt, pepper, timingSafeCompare et génération de tokens

### Phase 7 : Route protégée

- **GET /me** - Obtenir le profil utilisateur (nécessite un token de session valide)

### Phase 8 : Refresh tokens

- **POST /refresh** - Rafraîchir les tokens (session + refresh)

### Phase 9 : Administration

- **POST /admin/refresh-pepper** - Rafraîchir manuellement le pepper depuis le microservice

## Utilisation

### 1. Inscription

```bash
curl -X POST http://localhost:3006/beginRegistration \
  -H "Content-Type: application/json" \
  -H "X-PoW-Proof: votre_preuve_de_travail" \
  -d '{"email": "user@example.com", "password": "monMotDePasse123"}'
```

### 2. Obtenir le salt

```bash
curl -X GET "http://localhost:3006/getSalt?email=user@example.com" \
  -H "X-PoW-Proof: votre_preuve_de_travail"
```

### 3. Connexion

```bash
curl -X POST http://localhost:3006/loginWithSalt \
  -H "Content-Type: application/json" \
  -H "X-PoW-Proof: votre_preuve_de_travail" \
  -d '{"email": "user@example.com", "password": "monMotDePasse123", "salt": "salt_recu"}'
```

Les cookies `sessionToken` et `refreshToken` seront retournés dans la réponse.

### 4. Accéder à une route protégée

```bash
curl -X GET http://localhost:3006/me \
  -H "Cookie: sessionToken=votre_token" \
  -H "X-PoW-Proof: votre_preuve_de_travail"
```

### 5. Rafraîchir les tokens

```bash
curl -X POST http://localhost:3006/refresh \
  -H "Cookie: refreshToken=votre_refresh_token" \
  -H "X-PoW-Proof: votre_preuve_de_travail"
```

## Proof of Work (PoW)

Toutes les routes nécessitent une preuve de travail dans l'en-tête `X-PoW-Proof`.

Le client doit calculer une valeur telle que :
```
sha256(IP_client + seed_10min + preuve) commence par N zéros
```

Où :
- `IP_client` : L'adresse IP du client
- `seed_10min` : Timestamp arrondi à la tranche de 10 minutes
- `preuve` : Valeur calculée par le client
- `N` : Difficulté (par défaut 4 zéros)

### Exemple de calcul PoW (JavaScript)

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
  }
}

// Utilisation
const ip = '127.0.0.1';
const seed = Math.floor(Date.now() / (10 * 60 * 1000)).toString(); // Seed toutes les 10 min
const preuve = calculerPoW(ip, seed, 4);
```

## Structure de la Base de Données

### Collection `users`
```javascript
{
  _id: ObjectId,
  email: String,
  password: String, // Hash: sha256(password + salt + pepper)
  salt: String,    // Salt unique par utilisateur
  createdAt: Date
}
```

### Collection `sessions`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  token: String,        // Token de session (randomBytes 32)
  expiration: Date,     // Expiration (1 heure)
  fingerprint: String, // Hash du User-Agent
  createdAt: Date
}
```

### Collection `refreshTokens`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  token: String,        // Refresh token (randomBytes 32)
  expiration: Date,     // Expiration (7 jours)
  fingerprint: String,  // Hash du User-Agent
  invalidated: Boolean, // Si le token a été invalidé
  parentToken: String,  // Token parent (pour suivre la chaîne)
  createdAt: Date
}
```

## Sécurité

### Mécanismes Implémentés

1. **Hachage sécurisé** : SHA256 + Salt unique + Pepper serveur
2. **Protection timing** : timingSafeCompare avec temps de réponse uniformisé
3. **Proof of Work** : Ralentit les attaques par force brute
4. **Tokens non-prédictibles** : randomBytes(32) - 256 bits d'entropie
5. **Rotation des tokens** : Refresh tokens invalidés à chaque utilisation
6. **Fingerprint** : Vérification du User-Agent pour détecter les vols
7. **Cookies sécurisés** : HttpOnly, Secure, SameSite=strict

### Limitations

Voir la documentation complète dans `DOCUMENTATION.md` pour la liste détaillée des limitations et améliorations possibles.

## Tests Manuels

Pour tester le système :

1. Démarrer MongoDB
2. Démarrer le microservice pepper
3. Démarrer le serveur principal
4. Tester l'inscription avec `/beginRegistration`
5. Tester la connexion avec `/loginWithSalt`
6. Tester l'accès protégé avec `/me`
7. Tester le refresh avec `/refresh`

## Documentation Complète

Voir `DOCUMENTATION.md` pour :
- Schémas d'architecture
- Parcours détaillés des requêtes
- Analyse complète des menaces
- Explication de chaque mécanisme de défense
- Limites et améliorations pour la production

## Auteur

TP d'autonomie - Système d'authentification web sécurisé

