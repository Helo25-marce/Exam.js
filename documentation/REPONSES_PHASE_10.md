# Réponses aux Questions - Phase 10

## 1. Architecture

### Q1.1 : Expliquez l'architecture de votre système

Le système a 3 composants principaux :
- **Serveur principal** (port 3006) : gère toutes les routes d'authentification avec Express.js
- **Microservice pepper** (port 3007) : service séparé qui fournit le secret pepper
- **MongoDB Atlas** : stocke les utilisateurs, sessions et refresh tokens

Le client communique avec le serveur principal qui récupère le pepper depuis le microservice et stocke les données dans MongoDB.

### Q1.2 : Décrivez les composants et leurs interactions

**Composants** :
1. Serveur Express.js : routes d'authentification, middleware PoW, gestion des sessions
2. Microservice pepper : API simple qui retourne le pepper secret
3. MongoDB : collections `users`, `sessions`, `refreshTokens`

**Interactions** :
- Client → Serveur : requêtes HTTP avec PoW
- Serveur → Microservice : récupération du pepper (mise en cache 1h)
- Serveur → MongoDB : lecture/écriture des données utilisateurs et tokens

### Q1.3 : Schéma d'architecture

```
Client (Postman)
    ↓
Serveur Principal (3006) ←→ MongoDB Atlas
    ↓
Microservice Pepper (3007)
```

## 2. Parcours des Requêtes

### Q2.1 : Parcours d'une requête d'inscription

1. Client envoie `POST /beginRegistration` avec email/password + en-tête `X-PoW-Proof`
2. Middleware vérifie la preuve de travail
3. Serveur génère un salt unique (32 bytes aléatoires)
4. Serveur récupère le pepper (depuis cache ou microservice)
5. Serveur calcule : `sha256(password + salt + pepper)`
6. Serveur stocke dans MongoDB : `{email, password: hash, salt}`
7. Réponse avec temps uniformisé (min 200ms)

### Q2.2 : Parcours d'une requête de connexion

1. Client demande le salt : `GET /getSalt?email=xxx`
2. Serveur retourne le salt de l'utilisateur
3. Client envoie `POST /loginWithSalt` avec email, password, salt
4. Middleware vérifie PoW
5. Serveur récupère l'utilisateur depuis MongoDB
6. Serveur calcule le hash et compare avec `timingSafeCompare`
7. Si valide :
   - Génère sessionToken et refreshToken (randomBytes 32)
   - Calcule fingerprint (hash du User-Agent)
   - Stocke dans MongoDB
   - Définit cookies HttpOnly, Secure, SameSite=strict
8. Réponse avec cookies

### Q2.3 : Authentification pour route protégée

1. Client envoie `GET /me` avec cookie `sessionToken` + PoW
2. Middleware PoW vérifie la preuve
3. Middleware d'authentification :
   - Parse le cookie sessionToken
   - Cherche la session dans MongoDB
   - Vérifie expiration (1h)
   - Vérifie fingerprint (User-Agent doit correspondre)
4. Si valide : retourne données utilisateur
5. Si invalide : 401 Unauthorized

## 3. Menaces et Sécurité

### Q3.1 : Principales menaces

1. **Force brute** : tentatives répétées pour deviner un mot de passe
2. **Dictionnaire/Arc-en-ciel** : utilisation de tables pré-calculées
3. **Timing attacks** : mesure du temps de réponse pour deviner
4. **Vol de session** : vol et réutilisation de tokens
5. **Injection** : injection de code malveillant

### Q3.2 : Analyse des risques

**Risques élevés** :
- Force brute si pas de protection → mitigé par PoW
- Vol de tokens → mitigé par fingerprint et rotation

**Risques moyens** :
- Tables arc-en-ciel → mitigé par salt unique
- Timing attacks → mitigé par timingSafeCompare

**Risques faibles** :
- Injection → mitigé par validation et requêtes paramétrées

### Q3.3 : Protection contre force brute

**Proof of Work (PoW)** :
- Force le client à calculer `sha256(IP + seed + preuve)` avec 4 zéros
- Prend 10-50ms par requête → ralentit les tentatives
- Seed change toutes les 10 minutes

**Temps uniformisé** :
- Toutes les réponses prennent minimum 200ms
- Empêche de distinguer succès/échec par timing

### Q3.4 : Protection contre dictionnaire/arc-en-ciel

**Salt unique par utilisateur** :
- Chaque utilisateur a un salt différent (32 bytes aléatoires)
- Même mot de passe = hash différent
- Rend les tables arc-en-ciel inutiles

**Pepper serveur** :
- Secret ajouté au hash : `sha256(password + salt + pepper)`
- Même avec le salt, impossible sans le pepper
- Stocké dans microservice séparé

### Q3.5 : Protection contre timing attacks

**timingSafeCompare** :
- Utilise `crypto.timingSafeEqual()` de Node.js
- Comparaison constante en temps (byte par byte)
- Temps indépendant de la position de différence

**Temps uniformisé** :
- Minimum 200ms pour toutes les réponses
- Même si email inexistant, attend 200ms

### Q3.6 : Détection et prévention du vol de session

**Fingerprint User-Agent** :
- Hash du User-Agent stocké avec la session
- Si User-Agent change → session rejetée
- Détecte utilisation depuis autre navigateur

**Cookies sécurisés** :
- HttpOnly : pas accessible via JavaScript (anti-XSS)
- Secure : HTTPS uniquement en production
- SameSite=strict : anti-CSRF

**Rotation des tokens** :
- Refresh token invalidé à chaque utilisation
- Nouveau token généré à chaque refresh
- Détecte réutilisation de token volé

## 4. Mécanismes de Défense

### Q4.1 : Proof of Work (PoW)

**Rôle** : Ralentir les attaques automatisées en forçant un calcul coûteux.

**Fonctionnement** :
- Client doit trouver `preuve` tel que `sha256(IP + seed + preuve)` commence par 4 zéros
- Difficulté : 4 zéros (configurable)
- Seed change toutes les 10 minutes
- Prend généralement 10-50ms

**Avantages** : Ralentit les bots, coût négligeable pour utilisateur légitime.

**Limitations** : Peut être automatisé, nécessite implémentation côté client.

### Q4.2 : Utilisation des salts

**Importance** : Rendre chaque hash unique même pour le même mot de passe.

**Implémentation** :
- Génération : `crypto.randomBytes(32)` → 256 bits
- Stockage : en clair dans MongoDB (nécessaire pour vérification)
- Utilisation : `sha256(password + salt + pepper)`

**Avantages** : Tables arc-en-ciel inutiles, protection même si 2 utilisateurs ont même mot de passe.

### Q4.3 : Rôle du pepper et microservice séparé

**Rôle** : Secret supplémentaire connu uniquement du serveur.

**Pourquoi microservice séparé** :
- Isolation : pepper jamais dans le code du serveur principal
- Rotation facile : changer le pepper sans redémarrer le serveur
- Sécurité : si serveur compromis, pepper reste protégé

**Implémentation** :
- Récupéré au démarrage et mis en cache (1h)
- Ajouté au hash : `sha256(password + salt + pepper)`

### Q4.4 : timingSafeCompare

**Importance** : Empêcher les attaques par timing en rendant la comparaison constante.

**Fonctionnement** :
- Utilise `crypto.timingSafeEqual()` de Node.js
- Compare byte par byte de manière constante
- Temps de comparaison indépendant de la position

**Pourquoi important** : Sans ça, attaquant peut mesurer le temps pour deviner si email existe ou si mot de passe est correct.

### Q4.5 : Génération et gestion des tokens

**Génération** :
- `crypto.randomBytes(32)` → 256 bits d'entropie
- Pratiquement impossible à deviner (2^256 possibilités)

**Gestion** :
- Stockés dans MongoDB avec expiration
- Session tokens : 1 heure
- Refresh tokens : 7 jours
- Vérification en base à chaque requête

**Sécurité** : Tokens uniques, expiration automatique, vérification systématique.

### Q4.6 : Rotation des refresh tokens

**Mécanisme** :
- À chaque utilisation, nouveau token généré
- Ancien token marqué `invalidated: true`
- Chaîne de tokens : chaque nouveau référence son parent

**Avantages** :
- Détecte réutilisation de token volé
- Limite fenêtre d'exploitation
- Permet de suivre la chaîne d'utilisation

**Limitation** : Si token volé utilisé avant propriétaire légitime, ce dernier est bloqué.

### Q4.7 : Fingerprint User-Agent

**Utilisation** : Détecter si session utilisée depuis autre navigateur/appareil.

**Implémentation** :
- Hash du User-Agent stocké avec session : `sha256(User-Agent)`
- Vérifié à chaque requête protégée
- Si différent → session rejetée

**Avantages** : Détecte vol de session, utilisation depuis autre appareil.

**Limitations** : User-Agent peut être falsifié, mais ajoute une couche de sécurité.

## 5. Limitations et Améliorations

### Q5.1 : Limitations actuelles

1. **SHA256 rapide** : vulnérable à force brute (mais interdit d'utiliser bcrypt/argon2)
2. **Pas de rate limiting** : aucune limite sur tentatives
3. **PoW peut être automatisé** : bot peut calculer la preuve
4. **Fingerprint falsifiable** : User-Agent peut être changé
5. **Pas de 2FA** : aucune authentification à deux facteurs
6. **Logs non sécurisés** : peuvent contenir infos sensibles
7. **Pas de monitoring** : aucune détection d'anomalies

### Q5.2 : Améliorations pour production

1. **Rate limiting** : 5 tentatives/minute par IP
2. **Monitoring** : détecter patterns d'attaque, alertes
3. **Chiffrement** : chiffrer tokens dans la base
4. **Backup** : sauvegardes régulières
5. **Audit** : logs d'audit pour actions sensibles
6. **Tests sécurité** : tests de pénétration réguliers

### Q5.3 : Pourquoi SHA256 seul n'est pas suffisant

**Problèmes** :
1. **Rapide** : permet millions de tentatives/seconde
2. **Tables arc-en-ciel** : hashs pré-calculés de mots de passe courants
3. **Pas de salt** : même mot de passe = même hash
4. **Pas de protection** : aucune défense contre force brute

**Solution** : Salt unique + pepper + PoW + timingSafeCompare

### Q5.4 : Points faibles de l'implémentation

1. **SHA256** : devrait être bcrypt/argon2 (mais interdit)
2. **Pas de rate limiting** : attaquant peut essayer indéfiniment
3. **PoW faible** : peut être calculé rapidement avec GPU
4. **Fingerprint simple** : User-Agent seul n'est pas fiable
5. **Pas de 2FA** : un seul facteur d'authentification
6. **Gestion erreurs** : messages peuvent révéler infos

## 6. Questions Générales

### Q6.1 : Choix de conception et justifications

**Microservice pepper** :
- Justification : isolation du secret, rotation facile
- Alternative : variable d'environnement (moins sécurisé)

**PoW au lieu de CAPTCHA** :
- Justification : plus transparent pour utilisateur, automatisable côté client
- Alternative : CAPTCHA (plus fiable mais moins UX)

**Tokens en base au lieu de JWT** :
- Justification : révocables facilement, contrôle total
- Alternative : JWT (plus performant mais moins de contrôle)

**Temps uniformisé** :
- Justification : protection timing attacks
- Alternative : réponse immédiate (plus rapide mais vulnérable)

### Q6.2 : Mécanismes de sécurité en profondeur

**Couche 1 - PoW** : Ralentit attaques automatisées
**Couche 2 - Salt** : Rend hashs uniques
**Couche 3 - Pepper** : Secret supplémentaire
**Couche 4 - timingSafeCompare** : Protection timing
**Couche 5 - Fingerprint** : Détection vol session
**Couche 6 - Rotation tokens** : Détection réutilisation
**Couche 7 - Cookies sécurisés** : Protection XSS/CSRF

Chaque couche protège même si les autres échouent.

### Q6.3 : Compromis sécurité/performance

**Sécurité > Performance** :
- PoW : ajoute 10-50ms par requête
- Temps uniformisé : minimum 200ms même si réponse rapide
- Vérification tokens en base : requête MongoDB à chaque requête protégée

**Justification** : Pour authentification, sécurité prime sur performance. 200ms est acceptable pour utilisateur.

**Améliorations possibles** :
- Cache des sessions en mémoire (Redis)
- Réduire temps uniformisé à 100ms
- PoW optionnel pour utilisateurs authentifiés
