"use stric";

function getLastWeekDates() {
  let now = new Date();
  let = now.getMonth(); //0-6
  let numDay = now.getDate();

  let start = new Date(now); //copy
  start.setDate(numDay - 7);
  start.setHours(0, 0, 0, 0);

  return start;
}

module.exports = { getLastWeekDates };
