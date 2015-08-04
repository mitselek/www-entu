var express = require('express')
var router  = express.Router()
var path    = require('path')
var debug   = require('debug')('app:' + path.basename(__filename).replace('.js', ''))

var entu    = require('./entu')



// GET home page
router.get('/', function(req, res, next) {
    res.render('index')
})



// GET partners page
router.get('/partners', function(req, res, next) {
    entu.get_entities(null, 'partner', null, null, function(error, partners) {
        if(error) return next(error)

        res.render('partners', {
            partners: partners
        })
    })
})



// GET team page
router.get('/team', function(req, res, next) {
    entu.get_entities(612, 'person', null, null, function(error, team) {
        if(error) return next(error)

        res.render('team', {
            team: team
        })
    })
})



// GET terms of service page
router.get('/tos', function(req, res, next) {
    res.render('tos')
})



module.exports = router
