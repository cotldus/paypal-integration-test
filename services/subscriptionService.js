//4.4 Create subscriptionService starting with an IIFE again ((){})()
// These are for recurring orders or subscription services
//((name of this service, aliases)=>{function calls})(mod.exports, dependencies)
((subService, paypal, mongoService)=>{

  //--------------------------------------------------------
  //4.41 Objects Creation methods

  // Billing plan required objects
  subService.CreateBillingPlanAttributesObj = (planName, description, autobill, cancelURL, returnURL, planType, setUpFee, paymentDefinitionsArray)=>{

    var billingPlanAttributes = {
      "name": planName,
      "description": description,
      "type": planType,
      "merchant_preferences": {
          "auto_bill_amount": autobill,
          "cancel_url": cancelURL,
          "return_url": returnURL,
          "initial_fail_amount_action": "CONTINUE",
          "max_fail_attempts": "1",
          "setup_fee": {
              "currency": "USD",
              "value": setUpFee
          }
      },
      "payment_definitions": paymentDefinitionsArray
    };

    return billingPlanAttributes;
  };

  subService.CreateChargeModelObj = (amount, type)=>{
    var chargeModelObj = {
      "amount": {
          "currency": "USD",
          "value": amount
      },
      "type": type
    };

    return chargeModelObj;
  };

  subService.CreatePaymentDefinitionsObj = (name, price, type, chargeModels, cycles, frequency, interval)=>{
    for(var i = 0; i < chargeModels.length; i++){
      price += chargeModels[i].amount.value;
    }
    var PaymentDefinitionObj = {
        "amount": {
            "currency": "USD",
            "value": price
        },
        "charge_models": chargeModels,
        "cycles": cycles,
        "frequency": frequency,
        "frequency_interval": interval,
        "name": name,
        "type": type
    };

    return PaymentDefinitionObj;
  };


  // Agreement required objects
  subService.CreateBillingShippingObj = (addrOne, addrTwo, city, state, postal, countryCode)=>{
    var billingObj = {
        "line1": addrOne,
        "line2": addrTwo,
        "city": city,
        "state": state,
        "postal_code": postal,
        "country_code": countryCode
    }

    return billingObj;
  };

  //requires PlanID from created Plan
  subService.CreateBillingAgreementAttributesObj = (name, description, startDate, planID, paymentMethod, shippingObj)=>{
    var billingAgreementAttributes = {
      "name": name,
      "description": description,
      "start_date": startDate,
      "plan": {
          "id": planID
      },
      "payer": {
          "payment_method": paymentMethod
      },
      "shipping_address": shippingObj
    };

    return billingAgreementAttributes;
  };

  subService.CreateAgreementUpdateAttributesObj = (name, description, shippingObj)=>{
    var UpdateAttrObj = {
        "op": "replace",
        "path": "/",
        "value": {
            "description": description,
            "name": name,
            "shipping_address": shippingObj
        }
    };

    return UpdateAttrObj;
  };

  //--------------------------------------------------------
  //4.42 Billing Plans

  //Create Plan First, then Agreement
  subService.CreatePlan = (billingPlanAttributes, cb)=>{
    paypal.billingPlan.create(billingPlanAttributes, (err, billingPlan)=>{
      return cb(err, billingPlan);
    });
  };

  subService.GetPlan = (billingPlanID, cb)=>{
    paypal.billingPlan.get(billingPlanID, (err, billingPlan)=>{
      return cb(err, billingPlan);
    });
  };

  //CREATED, ACTIVE, INACTIVE, DELETED
  subService.ListPlans = (status, pages, pageSize, cb)=>{
    var list_billing_plan = {
      'status': status,
      'page_size': pageSize,
      'page': pages,
      'total_required': 'yes'
    };

    paypal.billingPlan.list(list_billing_plan, (err, billingPlans)=>{
      return cb(err, billingPlans);
    });
  };

  subService.UpdatePlanState = (billingPlanID, status, cb)=>{
    var billing_plan_update_attributes = [{
      "op": "replace",
      "path": "/",
      "value": { "state": status }
    }];

    // paypal.billingPlan.get(billingPlanID, (err, billingPlan)=>{ //?
      paypal.billingPlan.update(billingPlanID, billing_plan_update_attributes, (err, response)=>{
        return cb(err, response);
      });
    // });
  };

  //--------------------------------------------------------
  //4.43 Billing Agreements

  subService.CreateAgreement = (billingAgreementAttributes, cb)=>{
    paypal.billingAgreement.create(billingAgreementAttributes, (err, billingAgreement)=>{
      return cb(err, billingAgreement);
    });
  };

  subService.CancelAgreement = (billingAgreementID, cancelNote, cb)=>{
    var cancel_note = {
        "note": cancelNote
    };

    paypal.billingAgreement.cancel(billingAgreementID, cancel_note, (err, response)=>{
      return cb(err, response);
    });
  };

  subService.GetAgreement = (agreementID, cb)=>{
    paypal.billingAgreement.get(agreementID, (err, billingAgreement)=>{
      return cb(err, billingAgreement);
    });
  };

  // execute so that the payment can take place
  subService.ExecuteAgreement = (paymentToken, cb)=>{
    paypal.billingAgreement.execute(paymentToken, {/* empty options obj*/}, (err, billingAgreement)=>{
      return cb(err, billingAgreement);
    });
  };

  subService.UpdateAgreement = (billingAgreementID, billing_agreement_update_attributes, cb)=>{
    paypal.billingAgreement.update(billingAgreementID, billing_agreement_update_attributes, (err, response)=>{
      return cb(err, response);
    });
  };

})
(
  module.exports,
  require('paypal-rest-sdk'),
  require('./mongoService.js')
);
