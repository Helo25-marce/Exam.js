# Guide d'Installation MongoDB

## Option 1 : MongoDB Atlas (Cloud - RECOMMANDÉ pour Windows)

MongoDB Atlas est gratuit et plus simple à configurer sur Windows.

### Étapes :

1. **Créer un compte gratuit sur MongoDB Atlas**
   - Aller sur https://www.mongodb.com/cloud/atlas/register
   - Créer un compte (gratuit)

2. **Créer un cluster gratuit**
   - Choisir "Free" (M0)
   - Choisir une région proche
   - Cliquer sur "Create Cluster"

3. **Créer un utilisateur de base de données**
   - Dans "Database Access", cliquer sur "Add New Database User"
   - Créer un utilisateur avec un mot de passe
   - Rôle : "Atlas admin" ou "Read and write to any database"

4. **Autoriser l'accès réseau**
   - Dans "Network Access", cliquer sur "Add IP Address"
   - Cliquer sur "Allow Access from Anywhere" (0.0.0.0/0) pour le développement
   - Ou ajouter votre IP spécifique

5. **Obtenir la chaîne de connexion**
   - Dans "Database", cliquer sur "Connect"
   - Choisir "Connect your application"
   - Copier la chaîne de connexion (elle ressemble à : `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)

6. **Configurer dans votre projet**
   - Créer un fichier `.env` dans le dossier `Exam.js`
   - Ajouter :
   ```
   PORT=3006
   MONGODB_URI=mongodb+srv://votre-username:votre-password@cluster0.xxxxx.mongodb.net/auth_db?retryWrites=true&w=majority
   DB_NAME=auth_db
   PEPPER_SERVICE_URL=http://localhost:3007
   PEPPER_SERVICE_PORT=3007
   PEPPER_SECRET=votre-pepper-secret-tres-long-et-aleatoire-changez-moi
   NODE_ENV=development
   ```
   - Remplacer `votre-username`, `votre-password`, et `cluster0.xxxxx` par vos valeurs

---

## Option 2 : MongoDB Community Server (Local)

### Installation sur Windows :

1. **Télécharger MongoDB**
   - Aller sur https://www.mongodb.com/try/download/community
   - Version : MongoDB Community Server
   - Platform : Windows
   - Package : MSI
   - Télécharger et installer

2. **Pendant l'installation**
   - Cocher "Install MongoDB as a Service"
   - Cocher "Install MongoDB Compass" (interface graphique - optionnel mais recommandé)
   - Laisser les options par défaut

3. **Vérifier l'installation**
   - Ouvrir PowerShell en tant qu'administrateur
   - Exécuter : `mongod --version`
   - Si ça fonctionne, MongoDB est installé

4. **Démarrer MongoDB**
   - Si installé comme service, il démarre automatiquement
   - Sinon, exécuter : `mongod` dans un terminal séparé

5. **Vérifier que MongoDB fonctionne**
   - Ouvrir un nouveau terminal
   - Exécuter : `mongo` ou `mongosh` (selon la version)
   - Vous devriez voir le prompt MongoDB

6. **Configurer dans votre projet**
   - Créer un fichier `.env` dans le dossier `Exam.js`
   - Ajouter :
   ```
   PORT=3006
   MONGODB_URI=mongodb://localhost:27017
   DB_NAME=auth_db
   PEPPER_SERVICE_URL=http://localhost:3007
   PEPPER_SERVICE_PORT=3007
   PEPPER_SECRET=votre-pepper-secret-tres-long-et-aleatoire-changez-moi
   NODE_ENV=development
   ```

---

## Option 3 : MongoDB via Docker (Si Docker est installé)

1. **Démarrer MongoDB dans un conteneur Docker**
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **Vérifier que le conteneur fonctionne**
   ```bash
   docker ps
   ```

3. **Configurer dans votre projet**
   - Créer un fichier `.env` dans le dossier `Exam.js`
   - Utiliser la même configuration que l'Option 2

---

## Test de Connexion

Après avoir configuré MongoDB, tester la connexion :

1. **Démarrer le microservice pepper**
   ```bash
   node pepper-service.js
   ```

2. **Démarrer le serveur principal**
   ```bash
   node exam.js
   ```

3. **Vérifier les messages**
   - Vous devriez voir : "Connecté à MongoDB"
   - Vous devriez voir : "Pepper récupéré avec succès depuis le microservice"
   - Vous devriez voir : "Serveur démarré sur le port 3006"

Si vous voyez des erreurs de connexion MongoDB, vérifiez :
- Que MongoDB est bien démarré
- Que l'URI dans le fichier `.env` est correcte
- Que le port 27017 n'est pas utilisé par un autre service
- Pour MongoDB Atlas : que votre IP est autorisée

---

## Dépannage

### Erreur : "MongoServerError: Authentication failed"
- Vérifier le nom d'utilisateur et le mot de passe dans l'URI MongoDB
- Pour MongoDB Atlas : vérifier que l'utilisateur existe et a les bonnes permissions

### Erreur : "MongoNetworkError: connect ECONNREFUSED"
- MongoDB n'est pas démarré
- Vérifier que le service MongoDB est actif
- Pour MongoDB local : exécuter `mongod` manuellement

### Erreur : "MongoServerSelectionError: getaddrinfo ENOTFOUND"
- L'URI MongoDB est incorrecte
- Vérifier l'URI dans le fichier `.env`
- Pour MongoDB Atlas : vérifier que le cluster est actif

---

## Recommandation

Pour Windows, **MongoDB Atlas (Option 1)** est la solution la plus simple et la plus rapide à configurer. C'est gratuit et ne nécessite pas d'installation locale.

