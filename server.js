// 3.1. Create express server:
// wrap in iffy to rename and install node modules with require function
((express, server, bodyParser, fs, squatchPurchaseRepo)=>{

  //3.2. middleware with server.use
  // use bodyParser middleware to parse forms
  server.use(bodyParser.urlencoded({ extended: true }));
  // middleware to display public images and css files
  server.use(express.static("pub")); // pub: all public viewable files saved here

  //--------------------------------------------------------
  //Home Page route

  // 3.4.Create home route
  server.get('/', (req, res)=>{   // (path, response)
    fs.readFile('./templates/home.html', (err, results)=>{
      res.send(results.toString()); // convert buffer to string
    });
  });

  //3.5. Create rest of the placeholder routes
  //--------------------------------------------------------
  //Single Purchases

  //4.32
  server.post('/buysingle', (req, res)=>{
    var quantity = req.body.Quantity;
    var purchaseName = "Single Squatch Habitat";
    var purchasePrice = 10.00;
    var taxPrice = 0;
    var shippingPrice = 0;
    var description = "Single Habitat Sasquatch Starter Kit";
    squatchPurchaseRepo.BuySingle(purchaseName, purchasePrice, taxPrice,
      shippingPrice, quantity, description, (err, url)=>{
        if(err){
          res.json(err);
        } else {
          res.redirect(url);
        }
    });
  });

  // 4.35 redirect to homepage if user clicks on "cancel and redirect back" on paypal
  server.get('/cancel/:orderID', (req, res)=>{
    var orderID = req.params.orderID;
    squatchPurchaseRepo.CancelOrder(orderID, (err)=>{
      if(err){
        res.send("There was an error removing this order");
      } else {
        res.redirect("/");
      }
    });
  });

  //4.34
  server.get('/success/:orderID', (req, res)=>{
    var orderID = req.params.orderID;
    var payerID = req.query.PayerID;
    squatchPurchaseRepo.ExecuteOrder(payerID, orderID, (err, successID)=>{
      if(err){
        res.json(err);
      } else {
        res.send('<h1>Order Placed</h1>Please save your order confirmation number : <h3>' + successID + '</h3>');
      }
    });
  });

  // 4.39
  server.get('/refund/:orderID', (req, res)=>{
    var orderID = req.params.orderID;
    squatchPurchaseRepo.RefundOrder(orderID, (err, refund)=>{
      if(err){
        res.json(err);
      } else {
        res.json(refund);
      }
    });
  });

  // 4.37
  server.get('/orderdetails/:orderID', (req, res)=>{
    var orderID = req.params.orderID;
    squatchPurchaseRepo.GetOrder(orderID, (err, results)=>{
      if(err){
        res.json(err);
      } else {
        res.json(results);
      }
    });
  });

  //--------------------------------------------------------
  //Recurring Payments
  // 4.54 add functionality from purchase repo to server routes

  server.post('/buyrecurring', (req, res)=>{
    squatchPurchaseRepo.BuyRecurring("Squatch Plan", "Recurring Squatch Plan", 0, (err, plan)=>{
      // name, details, setup fee, success cb
      if(err){
        res.json(err);
      } else {
        res.redirect(plan); // redirect user to paypal
      }
    });
  });

  server.get('/recurring_success/:planID', (req, res)=>{
    var planID = req.params.planID;
    var token = req.query.token; // from paypal

    squatchPurchaseRepo.ExecuteRecurring(token, (err, results)=>{
      if(err){
        res.json(err);
      } else {
        res.json(results); // executed agreement
      }
    });
  });

  // when user clicks cancel on paypal's side
  server.get('/recurring_cancel/:planID', (req, res)=>{
    var planID = req.params.planID;
    //remove from mongoDB
    squatchPurchaseRepo.CancelPlan(planID, (err, cancel)=>{
        if(err){
          res.send("There was an error removing this subscription");
        } else {
          res.redirect("/");
        }
      });
    });

  //get details of agreement
  server.get('/recurring_orderdetails/:agreementID', (req, res)=>{
    var agreementID = req.params.agreementID;
    squatchPurchaseRepo.GetRecurringDetails(agreementID, (err, recurring_orderdetails)=>{
      if(err){
          res.json(err)
      } else {
          res.json(recurring_orderdetails)
      }
    });
  });

  //--------------------------------------------------------

  // 3.3. start server
  server.listen(8080, 'localhost', (err)=>{
    if(err){
      console.log('error', err); // error
    } else {
      console.log('server online'); // success
    }
  });

})
(
  require('express'),
  require('express')(),
  require('body-parser'),
  require('fs'),
  require('./repos/squatchPurchaseRepo.js')
);
