const express = require('express')
const app = express()
const httpProxy = require('http-proxy');
const morgan = require('morgan')
const { OK } = require('http-status-codes')

const knex = require('../db')

const NODE_ENV = process.env.NODE_ENV
const API_PORT = process.env.API_PORT || (NODE_ENV === 'test' ? 5432 : null) || 4000

app.use(morgan('dev'))

if (NODE_ENV === 'development') {
    // disable caching in development
    app.set('etag', false)

    // send non api requests to webpack-dev-server
    const proxy = httpProxy.createProxyServer()

    app.use((req, res, next) => {
        
        if (!req.originalUrl.startsWith('/api')) {
            return proxy.web(req, res, { target: 'http://localhost:8080' })
        }

        next()
    })
} else {
    // route static production assets
}

app.get('/api/data', (req, res) => {
    setTimeout(() => {
        return res
        .status(OK)
        .json({ data: [ 'foo', 'bar', 'baz' ] })
    }, 1000)
})


app.get('/api/system/check', (req, res) => {
    return res
    .status(OK)
    .json({
        status: 'ok'
    })
})

app.get('/api/system/dbconn', (req, res) => {
    return knex.raw('show tables')
    .then((data) => {
        res.status(OK).send()
    })
})

function initServer() {
    const server = app.listen(API_PORT, (err) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }

        console.log(`${NODE_ENV} api started at ${API_PORT}`)
    })

    server.kill = async function kill() {
        console.log('Shutting server down...')
        await knex.destroy()
        await server.close()
    }

    server.setTimeout(5000)

    return server
}

let server
if (require.main === module) {
    server = initServer()
}

process.on('SIGINT', () => {
    console.log() // newline
    server.kill()
})

process.on('unhandledRejection', (error) => {
    console.log('unhandledRejection', error.message)
    server.kill()
});

module.exports = {
    initServer,
}