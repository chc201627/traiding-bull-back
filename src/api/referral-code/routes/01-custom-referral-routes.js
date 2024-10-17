module.exports = {
  routes: [
    {
      method: "GET",
      path: "/referral-codes/countreferrals",
      handler: "referral-code.getTotalReferral",
    },
    {
      method: "GET",
      path: "/referral-codes/gettotalreturnrefers",
      handler: "referral-code.getTotalReturnRefers",
    },
  ],
};
