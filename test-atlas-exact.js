const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// Utiliser l'URI exacte de l'exemple MongoDB Atlas (sans nom de base de données)
const uri = "mongodb+srv://etameeddy01_db_user:ZO15Z60kSXyoPvaH@projet.mwh5ufv.mongodb.net/?appName=Projet";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    console.log('🔌 Connexion à MongoDB Atlas...');
    console.log('URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
    
    // Tester la base de données auth_db
    const db = client.db("auth_db");
    const collections = await db.listCollections().toArray();
    console.log(`\n📊 Base de données: auth_db`);
    console.log(`📁 Collections: ${collections.length}`);
    if (collections.length > 0) {
      collections.forEach(col => console.log(`   - ${col.name}`));
    } else {
      console.log('   (Aucune collection - elles seront créées automatiquement)');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
    console.log('\n🔌 Connexion fermée');
  }
}

run().catch(console.dir);

