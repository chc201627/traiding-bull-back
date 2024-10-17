module.exports = {
  routes: [
    {
      method: "GET",
      path: "/spot/getallspots",
      handler: "spot.getAllSpostsUser",
    },
    {
      method: "GET",
      path: "/spot/delegateenergyuser",
      handler: "spot.delegateEnergyUser",
    },
    {
      method: "GET",
      path: "/spot/allspotadmin",
      handler: "spot.allSpotAdim",
    },
    {
      method: "GET",
      path: "/spots/getspotpermanence",
      handler: "spot.getSpotPermanence",
    },
    {
      method: "GET",
      path: "/spots/getdepositsavilable",
      handler: "spot.getDepositsAvilable",
    },
    {
      method: "GET",
      path: "/spots/getspotandinversorlastweek",
      handler: "spot.getSpotAndInversorLastWeek",
    },
    {
      method: "GET",
      path: "/spots/totalMonthlyAndYearlySpots",
      handler: "spot.getTotalMonthlyAndYearlySpots",
    },
  ],
};
