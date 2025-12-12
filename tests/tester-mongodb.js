const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env' });

async function testerMongoDB() {
  let client = null;
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const nomBase = process.env.DB_NAME || 'auth_db';
    
    console.log('🔌 Tentative de connexion à MongoDB...');
    console.log('URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Masquer le mot de passe
    
    client = new MongoClient(uri);
    await client.connect();
    
    console.log('✅ Connexion MongoDB réussie!');
    
    const db = client.db(nomBase);
    console.log(`📊 Base de données: ${nomBase}`);
    
    // Lister les collections existantes
    const collections = await db.listCollections().toArray();
    console.log('\n📁 Collections existantes:');
    if (collections.length === 0) {
      console.log('   (Aucune collection - elles seront créées automatiquement lors de la première utilisation)');
    } else {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    // Vérifier les collections nécessaires
    const collectionsNecessaires = ['users', 'sessions', 'refreshTokens'];
    console.log('\n📋 Collections nécessaires pour le système:');
    collectionsNecessaires.forEach(nom => {
      const existe = collections.some(c => c.name === nom);
      console.log(`   ${existe ? '✅' : '⏳'} ${nom} ${existe ? '(existe)' : '(sera créée automatiquement)'}`);
    });
    
    console.log('\n✨ MongoDB est prêt à être utilisé!');
    console.log('💡 Les collections seront créées automatiquement lors de la première utilisation.');
    
  } catch (erreur) {
    console.error('❌ Erreur de connexion MongoDB:');
    console.error('   Message:', erreur.message);
    
    if (erreur.message.includes('Authentication failed')) {
      console.error('\n💡 Solution: Vérifiez le nom d\'utilisateur et le mot de passe dans MONGODB_URI');
    } else if (erreur.message.includes('ENOTFOUND') || erreur.message.includes('getaddrinfo')) {
      console.error('\n💡 Solution: Vérifiez que l\'URI MongoDB est correcte dans le fichier .env');
    } else if (erreur.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Solution: Vérifiez que votre IP est autorisée dans MongoDB Atlas (Network Access)');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

testerMongoDB();

