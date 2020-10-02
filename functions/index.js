const functions = require('firebase-functions');
const admin = require('firebase-admin')

const express = require('express'); // express application 
const cors = require('cors')
const bodyParser = require('body-parser');

const fbdown = require('./service/fbdown');
const { default: Axios } = require('axios');
const qs = require('qs')
const htmlParser = require('node-html-parser')
//const validator = require('email-validator') // to validate email  
const PORT = 3001;
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://nodemcu-thesis-db.firebaseio.com'
})

// gettin the db from database 
const db = admin.database()
const ref = db.ref()
const movieRef = db.ref('/movies')
const catRef = db.ref('/categories')
const seriesRef = db.ref('/series')

app.get('/hello', (req, res, next) => {
    console.info('GET /hello success')
    res.send("Welcome")
})

app.post('/adminLogin', (req, res, next) => {
    console.info('POST /adminLogin')
    //fake user for admin log in test
    const adminUser = {
        email: 'admin@test.com',
        password: 'test'
    }

    const { email, password } = req.body
    // post data if not feed 
    if (!email || !password) return res.status(400).send('Missing email or password')
    if (email !== admin.email) return res.status(403).send('Admin email does not exist')

    if (email === adminUser.email && password === adminUser.password) {
        console.info('/emialValidate call success');
        // res.json({postData,
        //     'success': validator.validate(postData.email)})
        return res.status(200).send()
    }

}) // end of the admin log in auth server

// get method for getting movie data READ
app.get('/moviesapi', (req, res, nex) => {
    console.info('GET /moviesapi')
    // Attach an asynchronous callback to read the data & ref is globle declaration
    ref.on("value", snapshot => {
        const result = []
        const movies = []
        const series = []
        snapshot.forEach(childNodes => {
            const key = childNodes.key
            const values = childNodes.val()
            if (key === 'movies') {
                for (let [key, value] of Object.entries(values)) {
                    movies.push({ key, ...value })
                }
                result.push({ [key]: movies.reverse() })
            } else if (key === 'categories') {
                result.push({ [key]: childNodes.val() })
            } else if (key === 'series') {
                for (let [key, value] of Object.entries(values)) {
                    series.push(value)
                }
                result.push({ [key]: series })
            }
        })

        return res.status(200).json(result)
    }, err => res.status(500).json({ error: err.code }))

}, err => res.status(500).json({ error: err.code }))

// start of admin log in auth server

// post data to firebase real time database //session
app.post('/movies', (req, res, next) => {
    console.info('POST /movies')
    //const {title, image} = req.body // creating the post data 
    const postData = req.body
    if (!postData.title || !postData.image || !postData.movie_id) return res.status(400).json({ message: 'Missing data' })

    const rawCategories = []

    if (postData.type === 'movie') {
        movieRef.push(postData)
            .then(snap => {
                movieRef.once("value", snapshot => {
                    snapshot.forEach(childNodes => {
                        rawCategories.push(childNodes.val().category)
                    })

                    const categories = rawCategories.filter((item, index) => rawCategories.indexOf(item) === index)
                    catRef.set(categories) // setting new categories ref in database 
                })
                //return res.json(categories)
                return res.status(200).json({ message: 'Add Successfully', key: snap.key })
            })
            .catch(err => {
                return res.status(500).json({ message: err })
            })
    } else {
        seriesRef.push(postData)
            .then(snap => {
                return res.status(200).json({ messagge: 'Add Successfully', key: snap.key })
            })
            .catch(err => {
                return res.status(500).json({ message: err })
            })

    }
})

//updatae and fix data
app.put('/update', (req, res, next) => {
    console.log('PUT /update')
    const putData = req.body
    if (!putData.title || !putData.movie_id) return res.status(400).json({ message: 'Missing data' })

    // ref is a global 
    const updateMovieId = []
    const rawData = []
    let key;

    if (putData.series) {
        seriesRef.once('value', snapshot => {
            // const values = snapshot.val()
            // return res.status(200).send(values)
            snapshot.forEach(childNodes => {
                if (childNodes.val().title === putData.title) {
                    key = childNodes.key
                    rawData.push(...childNodes.val().movie_id)
                }
                // updateData.push(...childNodes.val().image, ...putData.image)
            })
            updateMovieId.push(...rawData, ...putData.movie_id)
            if (!putData.image) {
                seriesRef.child(key).update({
                    "image": putData.image,
                    "movie_id": updateMovieId
                })
                return res.status(200).json({ message: "Update Successully", data: updateMovieId })
            } else {
                seriesRef.child(key).update({
                    "movie_id": updateMovieId
                })
                return res.status(200).json({ message: "Update Successully", data: updateMovieId })
            }
        })
    } else if (putData.movies) {
        // TO DO
    } else return res.status(400).json({ message: 'Something wrong' })
})

//facebook video extract
app.get('/para', (req, res, next) => {
    const para = req.query.URLz
    return res.status(200).send(para)
})
app.get('/fbdown', (req, res, next) => {
   // const data = req.body
   const URLz = req.query.URLz
    Axios.post('https://fbdown.net/download.php', qs.stringify({URLz}))
        .then(response => {
            const result = response.data
            const root = htmlParser.parse(result)
            const sdQuery = root.querySelector('#sdlink')
            const hdQuery = root.querySelector('#hdlink')
            const rawVideoData = []
            sdQuery !== null &&
                rawVideoData.push(...sdQuery.toString().split(' '))
            hdQuery !== null &&
                rawVideoData.push(...hdQuery.toString().split(' '))
            if (rawVideoData.length === 0) return res.status(200).json({ message: 'Video link not found' })

            const regex = /&amp;/gi // this is important

            let hdlink = null
            const sdlink = rawVideoData[2].substring(6, rawVideoData[2].length - 1).replace(regex, '&')
            if (rawVideoData.length > 13)
                hdlink = rawVideoData[15].substring(6, rawVideoData[15].length - 1).replace(regex, '&')
            console.log(rawVideoData.length)
            return res.status(200).json({sdlink, hdlink})
        })
        .catch(err => console.log(err))
})

//catch 404
app.use((req, res, next) => {
    const err = new Error('Not Found')
    err.status = 404
    next(err)
})

app.use((err, req, res, next) => res.status(err.status || 500).send(err.message || 'There was a problem'))

app.listen(PORT, () => {
    console.log(`server is running at port: ${PORT}`)
})
exports.app = functions.https.onRequest(app);