//7. Make Mongo Crud service
//wrap in iffy again ((name of this service, aliases)=>{function calls})(mod.exports, require)
((mongoService, mongodb)=>{

  // connecting to db instance
  // MongoConnectionString: Contains passwords - Can save this in config file or under config var on mongoDB
  var connectionString = process.env.MongoConnectionString || "mongodb://localhost:27017/test";

  var Connect = (cb)=>{
    mongodb.connect(connectionString, (err, db)=>{
      cb(err, db, ()=>{
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log("Connected to db");}
        db.close(); // close the connection once done otherwise it will eat all of your db resources
      });
    });
  };

  // module we will use to insert into database
  mongoService.Create = (colName, createObj, cb)=>{ //(collection name, object to be inserted, callback after done)
    Connect((err, db, close)=>{ // connect
      db.collection(colName).insert(createObj, (err, results)=>{ // do something to collection
        cb(err, results); // success/error
        return close(); // close
      });
    });
  };

  // module to search db
  mongoService.Read = (colName, readObj, cb)=>{ //(collection name, findobject, callback when done)
    Connect((err, db, close)=>{
      db.collection(colName).find(readObj).toArray((err, results)=>{
        cb(err, results);
        return close();
      });
    });
  };

  // module to edit existing object
  mongoService.Update = (colName, findObj, updateObj, cb)=>{ //(collection name, findobject, updates object, callback when done)
    Connect((err, db, close)=>{
      db.collection(colName).update(findObj, {$set: updateObj}, (err, results)=>{ // $set to tell mongo to only change the updated information
        cb(err, results);
        return close();
      });
    });
  };

  // module to delete existing object
  mongoService.Delete = (colName, findObj, cb)=>{ //(collection name, findobject, callback when done)
    Connect((err, db, close)=>{
      db.collection(colName).remove(findObj, (err)=>{
        cb(err);
        return close();
      });
    });
  };

})
(
  module.exports,
  require('mongodb')
);
