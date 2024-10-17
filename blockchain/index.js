

var today = new Date();
var endYear = new Date(today); // Establece día y mes
// endYear.setFullYear(today.getFullYear()-1);
// endYear.setMonth(today.getMonth());
// endYear // Establece año a este año
console.log(today.getDay());
if (today.getDay() == 4){
    endYear.setDate(today.getDate()+3);
    console.log(endYear);
}



const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::spot.spot',({strapi})=>({
    async activeDate(){
        let date = new Date();
        let activateDate = new Date(date);
        if(date.getDate==0){
            activateDate.setDate(today.getDate()+4);
            return activateDate;
        }
            else if(date.getDate==3 ||  date.getDate==4 ||  date.getDate==5){
            activateDate.setDate(today.getDate()+5);
            return activateDate;
        } else{
            activateDate.setDate(today.getDate()+5);
            return activateDate;
        }
    }

}));
