const axios = require('axios')
const qs = require('qs')
const url = 'https://fbdown.net/download.php'

const fbdown = ({data}) => {
    const request = axios.post(url, qs.stringify(data))
    return request.then(res => res.data)
}
module.exports = fbdown

