// 4.3 Create a repo as a module to use all the services we created
// We will also plug it into our routes
//starting with an IIFE again ((){})()
((squatchPurchaseRepo, paypal, ObjectID, mongoService, paymentService, subService)=>{

  // Create Payment
  //-----------------------------------------------------------------------
  // 4.31 Single Purchases
  squatchPurchaseRepo.BuySingle = (purchaseName, purchasePrice, taxPrice,
      shippingPrice, itemCount, description, cb)=>{

    var transactionArray = [];

    for(var i = 0; i < itemCount; i++){
      var itemObj = paymentService.CreateItemObj(purchaseName, purchasePrice, 1);
      transactionArray.push(itemObj);
    }

    var transactionItemObj = [paymentService.CreateTransactionObj(taxPrice, shippingPrice, description, transactionArray)];

    paymentService.CreateWithPaypal(
      transactionItemObj, 
      "http://localhost:8080/success", "http://localhost:8080/cancel", 
      (err, results)=>{
        if(err){
          return cb(err);
        } else {
          return cb(null, results);
      }
    });

  };

    //-----------------------------------------------------------------------
  // 4.52 Subscription plans

  squatchPurchaseRepo.BuyRecurring = (planName, description, setUpFee, cb)=>{
    var planObj = {
      PlanID: ""
    };

    // 1. Create plan in mongo
    mongoService.Create('paypal_plans', planObj, (err, results)=>{ // (collection name, obj to be inserted, success/err)

      //1.1 success and cancel url
      var returnURL = "http://localhost:8080/recurring_success/" + results.insertedIds[0]; // success url/agreement ID
      var cancelURL = "http://localhost:8080/recurring_cancel/" + results.insertedIds[0];


      // 1.2 Create Paypal required objects for Billing Plan
      var chargeModels = [
        subService.CreateChargeModelObj(0, "TAX"), //(price, charge model type)
        subService.CreateChargeModelObj(0, "SHIPPING") //(price, charge model type)
      ];

      var paymentDefinitionsArray = [subService.CreatePaymentDefinitionsObj("Squatch Maintained Habitat Rental",
        10, "REGULAR", chargeModels, 12, "MONTH", 1)];
        // (description, price, type, chargeModels, cycles, frequency, frequency intervals)

      var billingPlanAttributes = subService.CreateBillingPlanAttributesObj(planName,
        description, "YES", cancelURL, returnURL, "fixed", 0, paymentDefinitionsArray);
        // (planName, description, "YES" for autobill, cancelURL, returnURL, "fixed" type, set up fee, paymentDefinitionsArray)


      // 2. CreatePlan in Paypal
      subService.CreatePlan(billingPlanAttributes, (err, newPlan)=>{

        // 3. Update paypal planId in mongo
        mongoService.Update('paypal_plans', { _id: results.insertedIds[0] }, { PlanID: newPlan.id }, (err, results)=>{
          // collection, find object, update object , success/err

          // 4. Update plan status to active before we can create agreement with the plan
          subService.UpdatePlanState(newPlan.id, "ACTIVE", (err, u_results)=>{

            // 4.1 Billing Address object
            var shippingObj = subService.CreateBillingShippingObj(
              "1 Boulder", "", "Boulder", "CO", 80301, "US"
            ); // Address line 1, empty line 2, city, state code, zip, country code


            //4.2 Agreement object
            var agreementObj = subService.CreateBillingAgreementAttributesObj(
              "Squatch Maintained Agreement", // Agreement name
              "Maintained Squatch Habitat Description", // Description
              new Date(Date.now() + 5000 * 60), // 5 mins into the future for the creation time
              newPlan.id, // Plan id we want to create the agreement from
              "PAYPAL", // Payment method
              shippingObj // Shipping address
            );

            // 4.3 Create agreement
            subService.CreateAgreement(agreementObj, (err, response)=>{
              //paypal will provide links to reroute users to, we need to find the correct one
              for(var i = 0; i < response.links.length; i++){
                if(response.links[i].rel == "approval_url"){
                  return cb(err, response.links[i].href);
                }
              }
            });

          });
        });
      });
    });
  };

    // Cancelled Payments
    //-----------------------------------------------------------------------
  // 4.35 If the user cancels payment when on paypal's website, this deletes the order on mongo

  squatchPurchaseRepo.CancelOrder = (orderID, cb)=>{
    mongoService.Delete("paypal_orders", { _id: new ObjectID(orderID) }, (err)=>{
      return cb(err);
    });
  };

    // Execute Payments
    //-----------------------------------------------------------------------
  // 4.33 Single Purchases

  squatchPurchaseRepo.ExecuteOrder = (payerID, orderID, cb)=>{
    paymentService.ExecutePayment(payerID, orderID, (err, response)=>{
        return cb(err, response);
    });
  };

  //-----------------------------------------------------------------------
  // 4.52 Subscription plans

  // 4.52.5 Execute Agreement
  squatchPurchaseRepo.ExecuteRecurring = (token, cb)=>{
    subService.ExecuteAgreement(token, (err, results)=>{
      return cb(err, results);
    });
  };


  // Get Order/ Plans to cancel or delete them
  //-----------------------------------------------------------------------
  // Single Purchases

    // 4.36 /orderdetails/:orderID
  squatchPurchaseRepo.GetOrder = (orderID, cb)=>{
    mongoService.Read("paypal_orders", { _id: new OrderID(orderID) }, (order_err, paymentObj)=>{
      if(order_err){
        return cb(order_err);
      } else {
        paymentService.GetPayment(paymentObj[0].OrderDetails.id, (err, results)=>{
          return cb(err, results);
        });
      }
    });
  };

    // 4.38 /refund/:orderID
  squatchPurchaseRepo.RefundOrder = (orderID, cb)=>{
    squatchPurchaseRepo.GetOrder(orderID, (order_err, order)=>{
      if(order_err){
        return cb(order_err);
      }

      // saleID is Paypal's unique id while OrderId is MongoDB's ObjectID
      var saleID = order.transactions[0].related_resources[0].sale.id;
      var refundPrice = Number(order.transactions[0].amount.total);
      paymentService.RefundPayment(saleID, refundPrice, (err, refund)=>{
        cb(err, refund);
      });
    });
  };

  //-----------------------------------------------------------------------
  // 4.53  Get details of Subscription plans

  squatchPurchaseRepo.GetPlans = (cb)=>{
    subService.ListPlans("ACTIVE", 10, 10, (err, plans)=>{
      return cb(err, plans);
    });
  };

  squatchPurchaseRepo.GetRecurringDetails = (agreementID, cb)=>{
    subService.GetAgreement(agreementID, (err, results)=>{
      return cb(err, results);
    });
  };

  squatchPurchaseRepo.CancelPlan = (planID, cb)=>{
    mongoService.Delete('paypal_plans', { _id: planID }, (err, results)=>{
      return cb(err, results);
    });
  };
})
(
  module.exports,
  require('paypal-rest-sdk'),
  require('mongodb').ObjectId,
  require('../services/mongoService.js'),
  require('../services/paymentService.js'),
  require('../services/subscriptionService.js') // 4.51
);
