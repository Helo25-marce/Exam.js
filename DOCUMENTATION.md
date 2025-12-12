# Documentation - Système d'Authentification Web Sécurisé

## Table des matières
1. [Architecture et Schémas](#architecture-et-schémas)
2. [Parcours des Requêtes](#parcours-des-requêtes)
3. [Analyse des Menaces](#analyse-des-menaces)
4. [Mécanismes de Défense](#mécanismes-de-défense)
5. [Limites et Améliorations](#limites-et-améliorations)

---

## Architecture et Schémas

### Schéma des Interactions entre Services

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │────────▶│ Serveur      │────────▶│  MongoDB    │
│  (Browser)  │         │ Principal    │         │  Database   │
│             │         │  (Port 3000) │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                                │
                                │ GET /pepper
                                ▼
                         ┌──────────────┐
                         │ Microservice │
                         │   Pepper     │
                         │ (Port 3001)  │
                         └──────────────┘
```

**Flux d'initialisation :**
1. Le serveur principal démarre
2. Le serveur principal se connecte à MongoDB
3. Le serveur principal récupère le pepper depuis le microservice pepper (avec retry automatique)
4. Le serveur principal met le pepper en cache (1 heure)
5. Le serveur principal est prêt à accepter les requêtes

**Flux d'authentification :**
1. Client → Serveur Principal : Requête avec preuve de travail (PoW)
2. Serveur Principal vérifie la PoW
3. Serveur Principal → MongoDB : Vérification des identifiants
4. Serveur Principal génère les tokens de session
5. Serveur Principal → MongoDB : Stockage des sessions
6. Serveur Principal → Client : Cookies avec tokens

---

## Parcours des Requêtes

### Parcours d'une Requête Login

```
1. Client prépare la requête
   ├─ Calcule la preuve de travail (PoW)
   │  └─ Hash(IP + seed_temps + preuve) commence par N zéros
   └─ Inclut l'en-tête X-PoW-Proof

2. Client → Serveur : POST /loginWithSalt
   ├─ Headers: X-PoW-Proof, User-Agent, Cookie (si refresh)
   └─ Body: { email, password, salt }

3. Middleware PoW (Phase 6)
   ├─ Vérifie l'en-tête X-PoW-Proof
   ├─ Calcule: hash(IP_client + seed_10min + preuve)
   ├─ Vérifie que le hash commence par N zéros
   └─ Si invalide → 403 Forbidden

4. Route /loginWithSalt
   ├─ Récupère l'utilisateur depuis MongoDB (ou crée des valeurs factices)
   ├─ Compare le salt avec timingSafeCompare (Phase 5)
   ├─ Hash le mot de passe: sha256(password + salt + pepper)
   ├─ Compare les hashs avec timingSafeCompare (Phase 5)
   ├─ Uniformise le temps de réponse (Phase 5)
   └─ Si succès:
      ├─ Génère token de session (randomBytes 32)
      ├─ Génère refresh token (randomBytes 32)
      ├─ Hash le fingerprint (User-Agent)
      ├─ Stocke la session en MongoDB
      ├─ Stocke le refresh token en MongoDB
      └─ Envoie les cookies (HttpOnly, Secure, SameSite=strict)

5. Réponse au Client
   └─ 200 OK avec cookies sessionToken et refreshToken
```

### Parcours d'une Requête Protégée (GET /me)

```
1. Client → Serveur : GET /me
   ├─ Headers: Cookie (sessionToken), User-Agent
   └─ Inclut la preuve de travail (PoW)

2. Middleware PoW (Phase 6)
   └─ Vérifie la preuve de travail

3. Middleware d'Authentification (Phase 7)
   ├─ Parse les cookies pour extraire sessionToken
   ├─ Recherche la session en MongoDB
   ├─ Vérifie l'expiration de la session
   ├─ Vérifie le fingerprint (User-Agent haché)
   ├─ Récupère l'utilisateur depuis MongoDB
   └─ Ajoute req.user et req.session

4. Route GET /me
   ├─ Accède à req.user (défini par le middleware)
   └─ Retourne le profil (sans mot de passe)

5. Réponse au Client
   └─ 200 OK avec { email, createdAt }
```

### Parcours d'un Refresh Token

```
1. Client → Serveur : POST /refresh
   ├─ Headers: Cookie (refreshToken), User-Agent
   └─ Inclut la preuve de travail (PoW)

2. Middleware PoW
   └─ Vérifie la preuve de travail

3. Route /refresh
   ├─ Récupère le refreshToken depuis les cookies
   ├─ Recherche le refreshToken en MongoDB
   ├─ Vérifie si invalidated = false
   ├─ Vérifie l'expiration (7 jours)
   ├─ Vérifie le fingerprint
   └─ Si valide:
      ├─ Invalide l'ancien refreshToken (rotation)
      ├─ Génère un nouveau token de session
      ├─ Génère un nouveau refreshToken
      ├─ Stocke les nouveaux tokens en MongoDB
      └─ Envoie les nouveaux cookies

4. Réponse au Client
   └─ 200 OK avec nouveaux cookies
```

---

## Analyse des Menaces

### Tableau Complet des Menaces

| Menace | Description | Impact | Protection Implémentée |
|--------|-------------|--------|------------------------|
| **MITM (Man-in-the-Middle)** | Interception des communications entre client et serveur | Vol de tokens, modification des requêtes | Cookies Secure (HTTPS requis), SameSite=strict |
| **Bruteforce** | Tentatives massives de connexion avec différents mots de passe | Découverte de mots de passe faibles | Proof of Work (PoW) - ralentit les attaques |
| **Attaques Temporelles** | Mesure du temps de réponse pour déduire l'existence d'utilisateurs | Découverte d'emails valides, fuite d'informations | timingSafeCompare, temps de réponse uniformisé |
| **Vol de Cookie** | Vol du cookie de session via XSS ou accès physique | Accès non autorisé au compte | HttpOnly (protège contre XSS), SameSite=strict |
| **Prédictibilité des Tokens** | Génération de tokens prévisibles ou réutilisables | Accès non autorisé | randomBytes(32) - 256 bits d'entropie |
| **Attaques sur les Salages** | Utilisation de rainbow tables ou attaques par dictionnaire | Découverte de mots de passe | Salt unique par utilisateur (32 bytes aléatoires) |
| **Attaques sur Refresh Tokens** | Réutilisation de refresh tokens volés ou expirés | Accès prolongé non autorisé | Rotation obligatoire, invalidation en chaîne, vérification du fingerprint |
| **Attaques par Dictionnaire** | Tentatives avec des mots de passe courants | Découverte de mots de passe faibles | SHA256 + Salt + Pepper (rend les rainbow tables inutiles) |
| **Fuites de Données** | Accès non autorisé à la base de données | Exposition des mots de passe | Aucun mot de passe en clair, hashs avec salt et pepper |
| **Attaques de Rejeu** | Réutilisation de tokens expirés ou volés | Accès non autorisé | Vérification d'expiration, rotation des tokens |

---

## Mécanismes de Défense

### 1. Salts (Phase 3)

**Principe :**
- Un salt unique de 32 bytes (256 bits) est généré pour chaque utilisateur
- Le salt est stocké en clair dans la base de données
- Le hash final est : `sha256(password + salt + pepper)`

**Protection :**
- Empêche l'utilisation de rainbow tables (chaque utilisateur a un hash différent même avec le même mot de passe)
- Rend les attaques par dictionnaire plus difficiles (nécessite de tester chaque salt)
- Même si deux utilisateurs ont le même mot de passe, leurs hashs sont différents

**Implémentation :**
```javascript
function genererSalt() {
  return crypto.randomBytes(32).toString('hex');
}
```

### 2. Peppers (Phase 4 et 9)

**Principe :**
- Le pepper est un secret serveur stocké dans le microservice pepper
- Le pepper n'est jamais stocké dans la base de données
- Le pepper est mis en cache côté serveur principal (1 heure)
- Le hash final inclut le pepper : `sha256(password + salt + pepper)`

**Protection :**
- Même si la base de données est compromise, les hashs sont inutilisables sans le pepper
- Le pepper est séparé du serveur principal (microservice)
- Le pepper peut être changé sans affecter les utilisateurs existants (nécessite un re-hash)

**Implémentation :**
- Microservice séparé sur le port 3001
- Récupération avec retry automatique au démarrage
- Cache avec expiration

### 3. Proof of Work (PoW) - Phase 6

**Principe :**
- Le client doit fournir une preuve de travail dans l'en-tête `X-PoW-Proof`
- Le serveur calcule : `sha256(IP_client + seed_temps + preuve)`
- Le hash doit commencer par N zéros (difficulté configurable)
- La seed change toutes les 10 minutes

**Protection :**
- Ralentit considérablement les attaques par force brute
- Chaque requête nécessite un calcul coûteux côté client
- La seed basée sur le temps empêche la pré-calcul des preuves
- L'IP dans le calcul empêche la réutilisation des preuves

**Implémentation :**
```javascript
function powMiddleware(difficulte = 4) {
  // Vérifie que hash(IP + seed + preuve) commence par N zéros
}
```

### 4. Tokens Rotatifs (Phase 8)

**Principe :**
- Le refresh token est invalidé à chaque utilisation
- Un nouveau refresh token est généré à chaque refresh
- La chaîne d'invalidation permet de détecter les tokens volés
- Chaque refresh token a un `parentToken` pour suivre la chaîne

**Protection :**
- Limite la fenêtre d'exploitation d'un token volé
- Détection de réutilisation suspecte (invalidation en chaîne)
- Rotation obligatoire empêche la réutilisation

**Implémentation :**
- Champ `invalidated` dans la collection `refreshTokens`
- Champ `parentToken` pour suivre la chaîne
- Fonction `invaliderChaineRefreshTokens()` pour invalider toute la chaîne

### 5. timingSafeCompare (Phase 5)

**Principe :**
- Comparaison byte par byte avec temps constant
- Utilise XOR pour comparer sans révéler où la différence se trouve
- Seuil minimal de 50ms pour éviter les attaques par timing

**Protection :**
- Empêche les attaques par timing qui pourraient révéler :
  - Si un utilisateur existe (temps de réponse différent)
  - Où se trouve la différence dans les chaînes comparées
- Uniformise les temps de réponse entre succès et échec

**Implémentation :**
```javascript
async function timingSafeCompare(a, b) {
  // Comparaison avec temps constant
  // Seuil minimal de 50ms
}
```

### 6. Uniformisation des Temps de Réponse (Phase 5)

**Principe :**
- Toutes les requêtes d'authentification prennent le même temps
- Délai artificiel si la requête est trop rapide
- Même temps de réponse pour succès et échec

**Protection :**
- Empêche la déduction de l'existence d'un utilisateur par mesure du temps
- Empêche la déduction de la validité d'un mot de passe par timing
- Rend les attaques par timing inefficaces

**Implémentation :**
- Temps de réponse uniforme de 200ms minimum
- Délai ajouté si nécessaire pour atteindre ce seuil

### 7. Fingerprint (Phase 7)

**Principe :**
- Le User-Agent est haché et stocké avec la session
- Vérification du fingerprint à chaque requête authentifiée
- Détection de changement d'environnement

**Protection :**
- Détecte si un token est utilisé depuis un navigateur différent
- Protection contre le vol de cookie (utilisation depuis autre machine)
- Invalidation automatique si le fingerprint ne correspond pas

**Implémentation :**
```javascript
function hasherFingerprint(userAgent) {
  return crypto.createHash('sha256').update(userAgent || '').digest('hex');
}
```

### 8. Tokens Non-Prédictibles (Phase 7)

**Principe :**
- Utilisation de `crypto.randomBytes(32)` pour générer les tokens
- 256 bits d'entropie (32 bytes)
- Tokens stockés en base, jamais régénérés

**Protection :**
- Impossible de deviner ou prédire un token
- Chaque token est unique
- Espace de recherche énorme (2^256 possibilités)

**Implémentation :**
```javascript
function genererTokenSession() {
  return crypto.randomBytes(32).toString('hex');
}
```

---

## Limites et Améliorations

### Limites de l'Approche Actuelle

1. **Pas de Rate Limiting par IP**
   - Le PoW ralentit mais ne bloque pas complètement
   - Un attaquant déterminé peut toujours faire de nombreuses requêtes
   - **Amélioration :** Ajouter un rate limiting par IP (ex: 5 tentatives par minute)

2. **Pas de Verrouillage de Compte**
   - Aucune protection contre les attaques ciblées sur un compte spécifique
   - **Amélioration :** Verrouiller temporairement un compte après N échecs

3. **Pas de Logging des Tentatives Échouées**
   - Difficile de détecter les attaques en cours
   - **Amélioration :** Logger toutes les tentatives d'authentification (succès et échecs)

4. **Pas de 2FA (Authentification à Deux Facteurs)**
   - Un mot de passe volé donne accès complet
   - **Amélioration :** Ajouter TOTP (Time-based One-Time Password) ou SMS

5. **Pas de Rotation Automatique des Peppers**
   - Le pepper reste le même indéfiniment
   - **Amélioration :** Rotation périodique du pepper avec re-hash des mots de passe

6. **Pas de Protection CSRF Explicite**
   - SameSite=strict aide mais pas suffisant dans tous les cas
   - **Amélioration :** Tokens CSRF pour les requêtes mutantes

7. **Pas de Chiffrement des Données Sensibles en Transit**
   - Nécessite HTTPS (non géré par l'application)
   - **Amélioration :** Forcer HTTPS, HSTS headers

8. **Pas de Protection contre les Attaques par Enumération**
   - La route `/getSalt` pourrait révéler l'existence d'utilisateurs
   - **Amélioration :** Toujours retourner un salt (déjà implémenté mais peut être amélioré)

9. **Pas de Nettoyage Automatique des Sessions Expirées**
   - Les sessions expirées restent en base
   - **Amélioration :** Job de nettoyage périodique

10. **Pas de Monitoring et Alertes**
    - Pas de détection d'anomalies
    - **Amélioration :** Système de monitoring avec alertes sur activités suspectes

### Améliorations pour un Système de Production

1. **Sécurité Infrastructure**
   - HTTPS obligatoire avec certificats valides
   - WAF (Web Application Firewall)
   - DDoS protection
   - Firewall et isolation réseau

2. **Monitoring et Logging**
   - Centralisation des logs (ELK, Splunk)
   - Alertes en temps réel sur activités suspectes
   - Métriques de performance et sécurité
   - Audit trail complet

3. **Gestion des Secrets**
   - Utilisation d'un gestionnaire de secrets (Vault, AWS Secrets Manager)
   - Rotation automatique des secrets
   - Pas de secrets en clair dans le code

4. **Backup et Récupération**
   - Backups réguliers de la base de données
   - Plan de reprise après sinistre
   - Tests de restauration

5. **Conformité**
   - RGPD (anonymisation, droit à l'oubli)
   - Audit de sécurité régulier
   - Tests de pénétration

6. **Performance**
   - Cache Redis pour les sessions actives
   - Load balancing
   - Mise en cache des requêtes fréquentes

7. **Authentification Avancée**
   - OAuth2 / OpenID Connect
   - Authentification biométrique
   - Clés de sécurité (WebAuthn)

8. **Gestion des Erreurs**
   - Messages d'erreur génériques (pas de fuite d'information)
   - Gestion gracieuse des erreurs
   - Retry logic avec backoff exponentiel

---

## Conclusion

Ce système d'authentification implémente plusieurs couches de sécurité fondamentales :
- Hachage sécurisé avec salt et pepper
- Protection contre les attaques par timing
- Proof of Work pour ralentir les attaques
- Tokens non-prédictibles avec rotation
- Protection contre le vol de cookies

Cependant, pour un déploiement en production, il serait nécessaire d'ajouter :
- Rate limiting
- Monitoring et alertes
- 2FA
- Gestion avancée des secrets
- Conformité réglementaire

Le système actuel constitue une base solide mais nécessite des améliorations supplémentaires pour être prêt pour la production.

