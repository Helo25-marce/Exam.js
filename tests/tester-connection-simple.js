const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env' });

async function testerConnexionSimple() {
  let client = null;
  try {
    // Essayer différentes variantes de l'URI
    const uris = [
      // URI complète
      process.env.MONGODB_URI,
      // URI sans appName
      process.env.MONGODB_URI?.replace('&appName=Projet', ''),
      // URI simplifiée
      'mongodb+srv://etameeddy01_db_user:ZO15Z60kSXyoPvaH@projet.mwh5ufv.mongodb.net/auth_db?retryWrites=true&w=majority'
    ];

    for (let i = 0; i < uris.length; i++) {
      const uri = uris[i];
      if (!uri) continue;
      
      console.log(`\n🔌 Test ${i + 1}/${uris.length}: Connexion avec URI simplifiée...`);
      console.log('URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
      
      try {
        client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 10000, // 10 secondes
          connectTimeoutMS: 10000,
        });
        
        await client.connect();
        console.log('✅ Connexion réussie!');
        
        const db = client.db('auth_db');
        const collections = await db.listCollections().toArray();
        console.log(`📊 Base de données: auth_db`);
        console.log(`📁 Collections: ${collections.length}`);
        
        await client.close();
        console.log('✨ MongoDB est opérationnel!');
        return true;
      } catch (err) {
        console.log(`❌ Échec: ${err.message}`);
        if (client) {
          await client.close().catch(() => {});
          client = null;
        }
        if (i < uris.length - 1) {
          console.log('   → Essai de la variante suivante...');
        }
      }
    }
    
    console.log('\n❌ Toutes les tentatives de connexion ont échoué.');
    console.log('\n💡 Solutions possibles:');
    console.log('   1. Attendez 2-3 minutes après avoir ajouté l\'IP dans Network Access');
    console.log('   2. Vérifiez que le cluster MongoDB Atlas est actif (pas en pause)');
    console.log('   3. Vérifiez votre connexion internet');
    console.log('   4. Essayez de supprimer et ré-ajouter l\'IP dans Network Access');
    console.log('   5. Vérifiez que le mot de passe est correct');
    
    return false;
  } catch (erreur) {
    console.error('❌ Erreur:', erreur.message);
    return false;
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}

testerConnexionSimple();

