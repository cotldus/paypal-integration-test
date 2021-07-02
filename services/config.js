//4.1 Create config file to hold our paypal connection information starting with an IIFE again ((){})()
((configRepo)=>{
  configRepo.SetConfig = (paypal)=>{
    console.log("Config Hit");
    var config = {
      "host" : "api.sandbox.paypal.com",
      "port" : "",
      "client_id" : "AdctUzplqNcGtujCgCTU3LjCO8grdgAZm7C0IPEYMa5B8yjqvlb-f6zbwl3CZXLM9m_76TMe2Qq78XiZ",  // your paypal serverlication client id
      "client_secret" : "" // your paypal serverlication secret id
    }
    paypal.configure(config);
  };
})
(
  module.exports
);
