//4.2 Create paymentService starting with an IIFE again ((){})()
// These are for single orders
//((name of this service, aliases)=>{function calls})(mod.exports, require)
((paymentService, paypal, mongoService, OrderID)=>{


  //4.21 Set up paypal's configuration to connect to paypal
  require('./config.js').SetConfig(paypal);


  //4.22 Object creation /scaffolding methods which scaffolds the items and returns it
//--------------------------------------------------------------------------


  paymentService.CreateItemObj = (name, price, quantity)=>{
    var itemObj = {
      name: name,
      price: price,
      currency: "USD",
      quantity: quantity
    };
    return itemObj;
  };

  paymentService.CreateTransactionObj = (tax, shipping, description, itemList)=>{
    var total = 0.0;
    for(var i = 0; i < itemList.length; i++){
      var newQuant = itemList[i].quantity;
      if(newQuant >= 1){
        total += itemList[i].price;
      } else {
          total = itemList[i].price;
      }
    }
    var transactionObj = {
      "amount": {
        "total": total,
        "currency": "USD",
        "details": {
            "tax": tax,
            "shipping": shipping
        }
      },
      "description": description,
      "item_list" : { "items" : itemList }
    }
    return transactionObj;
  };

  // 
  //-----------------------------------------------------------------------------------------------------
  // paymentService.CreatePaymentCardJSON = (cardType, cardNumber, cardExpireMonth, cardExpireYear, cardCVV2, cardFirstName,
  //                                           cardLastName, billingAddressObj, transactionsArray)=>{
  //   var card = {
  //     "intent": "sale",
  //     "payer": {
  //         "payment_method": "credit_card",
  //         "funding_instruments": [{
  //           "credit_card": {
  //             "type": cardType,
  //             "number": cardNumber,
  //             "expire_month": cardExpireMonth,
  //             "expire_year": cardExpireYear,
  //             "cvv2": cardCVV2,
  //             "first_name": cardFirstName,
  //             "last_name": cardLastName,
  //             "billing_address": billingAddressObj
  //           }
  //         }]
  //     },
  //     "transactions": transactionsArray
  //   };

  //   return card;
  // };

  //4.23  Paypal methods
  //--------------------------------------------------------
  //Single Purchases

  paymentService.CreateWithPaypal = (transactionsArray, returnUrl, cancelUrl, cb)=>{

    // Default order object
    var dbObj = {
      OrderID: "",
      CreateTime: "",
      Transactions: ""
    };

    // insert this object to mongo and redirect client to paypal
    mongoService.Create('paypal_orders', dbObj, (err, results)=>{ //(collection name, object to insert, success cb)
      var paymentObj = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": { // to redirect user to paypal
            "return_url": returnUrl + "/" + results.insertedIds[0],
            "cancel_url": cancelUrl + "/" + results.insertedIds[0]
        },
        "transactions": transactionsArray
      };

      // Create payment instance
      paypal.payment.create(paymentObj, (err, response)=>{
        if (err) {
          return cb(err);
        } else {
          dbObj = { // enter in payment information to dbObj
            OrderID: response.id,
            CreateTime: response.create_time,
            Transactions: response.transactions
          };
          mongoService.Update('paypal_orders', { _id: results.insertedIds[0] }, dbObj, (err, results)=>{
            for(var i = 0; i < response.links.length; i++){
              if(response.links[i].rel == "approval_url"){
                return cb(null, response.links[i].href); // send user to paypal
              }
            }
          });
        }
      });
    });
  };


  // Method to get the payment's information
  paymentService.GetPayment = (paymentID, cb)=>{
    paypal.payment.get(paymentID, (err, payment)=>{
      if(err) {
        console.log(err);
        return cb(err);
      } else {
        return cb(null, payment);
      }
    });
  };


  // Execute payment method
  paymentService.ExecutePayment = (payerID, orderID, cb)=>{ //(payerID, orderID, cb once payment executed)

      var payerObj = { payer_id : payerID };

      mongoService.Read('paypal_orders', { _id: new OrderID(orderID) }, (err, results)=>{ //(collection, obj, cb)
        if(results){
          // results[0].OrderID: we need to use index because read delivers array, even if only one result
          paypal.payment.execute(results[0].OrderID, payerObj, {}, (err, response)=>{
            if(err){
              return cb(err);
            }
            // if success, create update obj to update mongo with the status of the payment
            if(response){
              var updateObj = {
                OrderDetails: response
              };
              mongoService.Update('paypal_orders', { _id: new OrderID(orderID) }, updateObj, (err, update_results)=>{
                return cb(null, orderID);
              });
            }
          });
        } else {
            return cb("no order found for this id");
        }
      });
  };

  // Refund method
  paymentService.RefundPayment = (saleID, amount, cb)=>{
    var data = {
      "amount": {
        "currency": "USD",
        "total": amount
      }
    };

    paypal.sale.refund(saleID, data, (err, refund)=>{
      if(err) {
        return cb(err);
      } else {
        return cb(null, refund);
      }
    });
  };

})
(
  module.exports,
  require('paypal-rest-sdk'),
  require('./mongoService.js'),
  require('mongodb').ObjectId
);
