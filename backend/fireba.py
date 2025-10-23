import firebase_admin
from firebase_admin import credentials, firestore

def init_firebase():
    """Initialize Firebase Admin SDK and print full Firestore schema"""
    try:
        print("⚙️ Initializing Firebase...")

        if not firebase_admin._apps:
            cred = credentials.Certificate("remo-6afe2-firebase-adminsdk-fbsvc-0e331a5e1e.json")
            firebase_admin.initialize_app(cred)
            print("🔥 Firebase initialized successfully!")
        else:
            print("🔥 Firebase already initialized!")

        db = firestore.client()

        print("📂 Fetching Firestore schema...\n")

        def explore_collection(collection_ref, indent=0):
            docs = list(collection_ref.stream())
            if not docs:
                print(" " * indent + f"📁 {collection_ref.id} (empty)")
                return

            print(" " * indent + f"📁 Collection: {collection_ref.id}")
            for doc in docs:
                print(" " * (indent + 2) + f"📄 Document ID: {doc.id}")
                data = doc.to_dict()
                if data:
                    for key, value in data.items():
                        print(" " * (indent + 4) + f"- {key}: {type(value).__name__}")

                # Recurse into subcollections
                subcollections = list(doc.reference.collections())
                for subcol in subcollections:
                    explore_collection(subcol, indent + 6)
            print()

        # Explore all top-level collections
        collections = list(db.collections())
        if not collections:
            print("🚫 No collections found.")
        else:
            for collection in collections:
                explore_collection(collection)

        print("\n✅ Firestore schema detection complete!")
        return db

    except Exception as e:
        print(f"❌ Firebase initialization error: {e}")
        print("💡 Check your service account key path and Firestore permissions.")
        return None


if __name__ == "__main__":
    init_firebase()
