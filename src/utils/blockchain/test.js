const blockchain = require('./index.js')

// rapid tests, use formal framework pls

blockchain.giveEnergy('TNGWHSW4n8Pw4xZ9WiEFmtctkitXzUxuZd',30)
.then((res) => {
    console.log(res)
})

blockchain.getAccountTotalEnergy('TV5W598v4gXmLj9F1BPMmP7YQWfrewpNqc')
.then((res) => {
    console.log(res)
})

blockchain.takeEnergy('TV5W598v4gXmLj9F1BPMmP7YQWfrewpNqc')
.then((res) => {
    console.log(res)
})

