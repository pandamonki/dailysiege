// Where the functions run. Firestore triggers must run in the same region as the Firestore database,
// so this has to match the location chosen when Firestore was created in the Firebase console
// (Firestore Database -> the location shown at the top, e.g. "nam5" -> us-central1,
// "australia-southeast1" -> australia-southeast1, "eur3" -> europe-west1).
module.exports = { REGION: "us-central1" };
