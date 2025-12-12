require('dotenv').config();
const express = require('express');
const { getUsersCollection } = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Pour parser le body JSON

// Route POST /register
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et password requis' });
  }

  try {
    const users = await getUsersCollection();

    // Vérifier si l'email existe déjà
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Stocker en clair (seulement pour la phase 1 !)
    const newUser = { email, password };
    const result = await users.insertOne(newUser);

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      userId: result.insertedId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route POST /login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et password requis' });
  }

  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Comparaison en clair (phase 1 seulement)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    res.json({ message: 'Connexion réussie', user: { email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de test simple
app.get('/', (req, res) => {
  res.json({ message: 'Serveur TP Authentification - Phase 1 OK' });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});