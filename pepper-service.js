const express = require('express');
require('dotenv').config();

const app = express();

const PEPPER_SERVICE_PORT = process.env.PEPPER_SERVICE_PORT || 3007;
const PEPPER_SECRET = process.env.PEPPER_SECRET || 'pepper-secret-par-defaut-changez-moi';

// Phase 9: GET /pepper - Renvoyer le pepper du serveur secondaire
app.get('/pepper', (req, res) => {
  try {
    res.status(200).json({ pepper: PEPPER_SECRET });
  } catch (error) {
    console.error('Erreur pepper service:', error);
    res.status(500).json({ error: 'Erreur interne du serveur pepper' });
  }
});

// Démarrer le microservice pepper
app.listen(PEPPER_SERVICE_PORT, () => {
  console.log(`Microservice pepper démarré sur le port ${PEPPER_SERVICE_PORT}`);
});

