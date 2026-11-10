// Where the functions run.
//
// TRIGGER_REGION must be the region of the Firestore database (australia-southeast2, Melbourne):
// a function that reacts to database changes has to live beside the database.
// REGION is for everything else (the 5-minute battle scheduler and the host's buttons). It is Sydney
// because Cloud Scheduler, which the scheduler needs, is not offered in Melbourne.
module.exports = { TRIGGER_REGION: "australia-southeast2", REGION: "australia-southeast1" };
