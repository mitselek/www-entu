var fs      = require('fs')
var express = require('express')
var router  = express.Router()
var path    = require('path')
var debug   = require('debug')('app:' + path.basename(__filename).replace('.js', ''))
var async   = require('async')

var entu    = require('./entu')



// GET home page
router.get('/', function(req, res, next) {
    debug('Loading "' + req.url + '"')

    async.parallel({
        root_entity: function(callback) {
            entu.get_entity(WWW_ROOT_EID, null, null, function(error, page_entity) {
                if(error) return next(error)
                if(page_entity.get('jade.value')) {
                    fs.createWriteStream('./views/e_' + WWW_ROOT_EID + '.jade').write(page_entity.get('jade.value'))
                }
                callback(null, page_entity)
            })
        },
        childs: function(callback) {
            entu.get_childs(WWW_ROOT_EID, null, null, null, function(error, childs) {
                if(error) return next(error)

                callback(null, childs)
            })
        }
    },
    function results(error, results) {
        debug('results:', results)
        if(error) return next(error)

        var template = 'index'
        if(results.root_entity.get('jade.value')){
            template = 'e_' + WWW_ROOT_EID
        }

        res.render(template, {
            entity: results.root_entity,
            childs: results.childs
        })
    })

    // res.render('index')
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
