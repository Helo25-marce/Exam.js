# Système d'Authentification Web Sécurisé

TP d'autonomie - Node.js + Express + MongoDB

# Structure du Travail  
```
Exam.js/
├── documentation/          # Documentation complète     
│   ├── RESUME_FINAL_POSTMAN.md   # Guide pour tester avec Postman
│   ├── REPONSES_PHASE_10.md           # Réponses aux questions textuelles
│   └── QUESTIONS_TEXTUELLES_PHASE_10.md  # Liste des questions
├── tests/                  # Scripts de test
│   ├── tester-mongodb.js
│   ├── tester-exam-mongodb.js
│   ├── tester-serveur-complet.js
│   └── ...
├── scripts/               # Scripts utilitaires
│   └── calculer-pow.js    # Calculer la preuve de travail
├── exam.js                # Serveur principal
├── pepper-service.js      # Microservice pepper
└── package.json
```

## Installation

1. Installer les dépendances :
   npm install

2. Créer un fichier .env à la racine avec :
   PORT=3006
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/auth_db
   DB_NAME=auth_db
   PEPPER_SERVICE_URL=http://localhost:3007
   PEPPER_SERVICE_PORT=3007
   PEPPER_SECRET=votre-secret-tres-long-et-aleatoire
   NODE_ENV=development

## Démarrage

Ouvrir 2 terminaux :

Terminal 1 - Microservice pepper :
   node pepper-service.js

Terminal 2 - Serveur principal :
   node exam.js

Le serveur démarre sur le port 3006.

## Structure

- exam.js : serveur principal
- pepper-service.js : microservice pepper (port 3007)
- documentation/ : toute la doc
- tests/ : scripts de test
- scripts/ : scripts utilitaires (calculer-pow.js)

## Tests

Pour tester MongoDB :
   node tests/tester-mongodb.js

Pour tester le serveur complet :
   node tests/tester-exam-mongodb.js

## Calculer la preuve de travail (PoW)

Toutes les requêtes nécessitent un en-tête X-PoW-Proof. Pour calculer la valeur :
   node scripts/calculer-pow.js

La valeur change toutes les 10 minutes.

## Routes principales

POST /beginRegistration - Inscription
GET /getSalt?email=xxx - Récupérer le salt
POST /loginWithSalt - Connexion
GET /me - Profil utilisateur (protégé)
POST /refresh - Rafraîchir les tokens

Toutes les routes nécessitent l'en-tête X-PoW-Proof.

## Documentation

Tout est dans le dossier documentation/ :
- REPONSES_PHASE_10.md : réponses aux questions
- RESUME_FINAL_POSTMAN.md : guide Postman
- QUESTIONS_TEXTUELLES_PHASE_10.md : liste des questions

## Ports

- 3006 : serveur principal
- 3007 : microservice pepper
