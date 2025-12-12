# Mise à Jour du Fichier .env pour MongoDB Atlas

## Chaîne de Connexion MongoDB Atlas

D'après MongoDB Atlas, votre chaîne de connexion est :
```
mongodb+srv://etameeddy01_db_user:<db_password>@projet.mwh5ufv.mongodb.net/?appName=Projet
```

## Instructions

1. **Remplacez `<db_password>`** par votre mot de passe MongoDB (celui que vous avez créé pour l'utilisateur `etameeddy01_db_user`)

2. **Ajoutez le nom de la base de données** à la fin de l'URI :
   - Avant : `...mongodb.net/?appName=Projet`
   - Après : `...mongodb.net/auth_db?retryWrites=true&w=majority&appName=Projet`

3. **Mettez à jour votre fichier `.env`** avec cette ligne :

```env
MONGODB_URI=mongodb+srv://etameeddy01_db_user:VOTRE_MOT_DE_PASSE@projet.mwh5ufv.mongodb.net/auth_db?retryWrites=true&w=majority&appName=Projet
```

**Exemple complet du fichier `.env` :**
```env
PORT=3006
MONGODB_URI=mongodb+srv://etameeddy01_db_user:VOTRE_MOT_DE_PASSE@projet.mwh5ufv.mongodb.net/auth_db?retryWrites=true&w=majority&appName=Projet
DB_NAME=auth_db
PEPPER_SERVICE_URL=http://localhost:3007
PEPPER_SERVICE_PORT=3007
PEPPER_SECRET=pepper-secret-tres-long-et-aleatoire-changez-moi-en-production-12345678901234567890
NODE_ENV=development
```

## Important : Autoriser Votre IP dans MongoDB Atlas

L'erreur `Network Access List` indique que votre IP n'est pas autorisée.

### Étapes pour autoriser votre IP :

1. Dans MongoDB Atlas, allez dans **"Network Access"** (menu de gauche)
2. Cliquez sur **"Add IP Address"**
3. Vous avez deux options :
   - **Option 1 (Recommandé pour développement)** : Cliquez sur **"Allow Access from Anywhere"** (0.0.0.0/0)
   - **Option 2 (Plus sécurisé)** : Ajoutez votre IP spécifique
4. Cliquez sur **"Confirm"**

**Note** : Si vous choisissez "Allow Access from Anywhere", cela autorise toutes les IPs. C'est pratique pour le développement mais moins sécurisé pour la production.

## Après la Mise à Jour

1. Sauvegardez le fichier `.env`
2. Testez la connexion :
   ```bash
   node test-mongodb.js
   ```
3. Vous devriez voir : ✅ Connexion MongoDB réussie!

