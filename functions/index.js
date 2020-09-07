const functions = require('firebase-functions');
const admin = require('firebase-admin')

const express = require('express'); // express application 
const cors = require('cors')
const bodyParser = require('body-parser');
//const validator = require('email-validator') // to validate email  
const PORT = 3001;
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

// Fetch the service account key JSON file contents
//const serviceAccount = require('C:/Users/Lenovo/Project/node-express-firebase/functions/nodemcu-thesis-db-firebase-adminsdk-lm0hh-4ddac5316d.json')
// admin.initializeApp({
//     credential : admin.credential.cert(serviceAccount),
//     databaseURL : 'https://nodemcu-thesis-db.firebaseio.com'
// })

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://nodemcu-thesis-db.firebaseio.com'
})

// gettin the db from database 
const db = admin.database()

app.get('/hello', (req, res, next) => {
    console.info('GET /hello success')
    res.send("Welcome")
})

// get method for getting movie data 

app.get('/moviesapi', (req, res, nex) => {
    console.info('GET /moviesapi')
    let ref = db.ref()
    // Attach an asynchronous callback to read the data
    ref.on("value", snapshot => {
        const result = []
        const movies = []
        let values;

        snapshot.forEach(childNodes => {
            if (childNodes.key === 'movies') {
                values = childNodes.val()
                for (let [key, value] of Object.entries(values)) {
                    movies.push(
                        value
                    )
                }
                result.push({ [childNodes.key]: movies.reverse() })
            } else
                if (childNodes.key === 'categories') {
                    result.push({ [childNodes.key]: childNodes.val() })
                }
        })
        // for (let [key, value] of Object.entries(values)) {
        //     result.push(
        //         key,
        //         ...value
        //     )
        // }

        return res.status(200).json(result)
    }, err => res.status(500).json({ error: err.code }))

}, err => res.status(500).json({ error: err.code }))

// start of admin log in auth server
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

// post data to firebase real time database //session

app.post('/movies', (req, res, next) => {
    console.info('POST /movies')
    //const {title, image} = req.body // creating the post data 
    const postData = req.body
    if (!postData.title || !postData.image) return res.status(400).send('Missing data')

    const rawCategories = []
    let ref = db.ref('/movies')
    let catRef = db.ref('/categories')
    ref.push(postData)
        .then(snap => {
            ref.once("value", snapshot => {
                snapshot.forEach(childNodes => {
                    rawCategories.push(childNodes.val().title)
                })
                let categories = []
                categories = rawCategories.filter((item, index) => rawCategories.indexOf(item) === index)

                catRef.set(categories) // setting new categories ref in database 
            })

            return res.json({ message: 'Add Successfully', key: snap.key })
        })
        .catch(err => {
            return res.status(500).json({ error: err })
        })


})

//catch 404
app.use((req, res, next) => {
    const err = new Error('Not Fount')
    err.status = 404
    next(err)
})

app.use((err, req, res, next) => res.status(err.status || 500).send(err.message || 'There was a problem'))

app.listen(PORT, () => {
    console.log(`server is running at port: ${PORT}`)
})

exports.app = functions.https.onRequest(app);