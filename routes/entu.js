var path    = require('path')
var debug   = require('debug')('app:' + path.basename(__filename).replace('.js', ''))
var request = require('request')
var async   = require('async')
var op      = require('object-path')
var md      = require('marked')
var random  = require('randomstring')



//Get entity from Entu
exports.get_entity = get_entity
function get_entity(id, auth_id, auth_token, callback) {
    var headers = (auth_id && auth_token) ? {'X-Auth-UserId': auth_id, 'X-Auth-Token': auth_token} : {}

    request.get({url: APP_ENTU_URL + '/entity-' + id, headers: headers, strictSSL: true, json: true}, function(error, response, body) {
        if(error) return callback(error)
        if(response.statusCode !== 200 || !body.result) return callback(new Error(op.get(body, 'error', body)))

        var properties = op.get(body, 'result.properties', {})
        var entity = {
            _id: op.get(body, 'result.id', null),
            _picture: APP_ENTU_URL + '/entity-' + op.get(body, 'result.id', null) + '/picture'
        }
        for(var p in properties) {
            if(op.has(properties, [p, 'values'])) {
                for(var v in op.get(properties, [p, 'values'])) {
                    if(op.get(properties, [p, 'datatype']) === 'file') {
                        op.push(entity, p, {
                            id: op.get(properties, [p, 'values', v, 'id']),
                            value: op.get(properties, [p, 'values', v, 'value']),
                            file: APP_ENTU_URL + '/file-' + op.get(properties, [p, 'values', v, 'db_value'])
                        })
                    } else if(op.get(properties, [p, 'datatype']) === 'text') {
                        op.push(entity, p, {
                            id: op.get(properties, [p, 'values', v, 'id']),
                            value: op.get(properties, [p, 'values', v, 'value']),
                            md: md(op.get(properties, [p, 'values', v, 'db_value']))
                        })
                    } else if(op.get(properties, [p, 'datatype']) === 'reference') {
                        op.push(entity, p, {
                            id: op.get(properties, [p, 'values', v, 'id']),
                            value: op.get(properties, [p, 'values', v, 'value']),
                            reference: op.get(properties, [p, 'values', v, 'db_value'])
                        })
                    } else {
                        op.push(entity, p, {
                            id: op.get(properties, [p, 'values', v, 'id']),
                            value: op.get(properties, [p, 'values', v, 'value']),
                        })
                    }
                }
                if(op.get(properties, [p, 'multiplicity']) === 1) op.set(entity, p, op.get(entity, [p, 0]))
            }
        }
        // debug(JSON.stringify(entity, null, '  '))

        callback(null, op(entity))
    })
}



//Get entities by parent entity id and/or by definition
exports.get_entities = function(parent_entity_id, definition, auth_id, auth_token, callback) {
    var url = parent_entity_id ? '/entity-' + parent_entity_id + '/childs' : '/entity'
    var loop = parent_entity_id ? ['result', definition, 'entities'] : 'result'
    var qs = definition ? {definition: definition} : {}
    var headers = (auth_id && auth_token) ? {'X-Auth-UserId': auth_id, 'X-Auth-Token': auth_token} : {}

    request.get({url: APP_ENTU_URL + url, qs: qs, headers: headers, strictSSL: true, json: true}, function(error, response, body) {
        if(error) return callback(error)
        if(response.statusCode !== 200 || !body.result) return callback(new Error(op.get(body, 'error', body)))

        var entities = []
        async.each(op.get(body, loop, []), function(e, callback) {
            get_entity(e.id, auth_id, auth_token, function(error, entity) {
                if(error) return callback(error)

                entities.push(entity)
                callback()
            })
        }, function(error){
            if(error) return callback(error)

            callback(null, entities)
        })
    })
}



//Add entity
exports.add = function(parent_entity_id, definition, properties, auth_id, auth_token, callback) {

    var body = {
        definition: definition
    }
    for(p in properties) {
        body[definition + '-' + p] = properties[p]
    }

    request.post({url: APP_ENTU_URL + '/entity-' + parent_entity_id, headers: {'X-Auth-UserId': auth_id, 'X-Auth-Token': auth_token}, body: body, strictSSL: true, json: true}, function(error, response, body) {
        if(error) return callback(error)
        if(response.statusCode !== 201 || !body.result) return callback(new Error(op.get(body, 'error', body)))

        callback(null, op.get(body, 'result.id', null))
    })

}



//Share entity
exports.make_public = function(id, auth_id, auth_token, callback) {
    request.post({url: APP_ENTU_URL.replace('/api2', '') + '/entity-' + id + '/rights', headers: {'X-Auth-UserId': auth_id, 'X-Auth-Token': auth_token}, body: {'sharing': 'public'}, strictSSL: true, json: true}, function(error, response, body) {
        if(error) return callback(error)
        if(response.statusCode !== 200) return callback(new Error(op.get(body, 'error', body)))

        callback(null, id)
    })

}



//Get signin url
exports.get_signin_url = function(redirect_url, provider, callback) {
    var body = {
        'state': random.generate(16),
        'redirect_url': redirect_url,
        'provider': provider
    }
    request.post({url: APP_ENTU_URL + '/user/auth', body: body, strictSSL: true, json: true}, function(error, response, body) {
        if(error) return callback(error)
        if(response.statusCode !== 200) return callback(new Error(op.get(body, 'error', body)))

        var data = {}
        data.state = op.get(body, 'result.state', null)
        data.auth_url = op.get(body, 'result.auth_url', null)

        callback(null, data)
    })
}



//Get user session
exports.get_user_session = function(auth_url, state, callback) {
    var body = {
        'state': state
    }
    request.post({url: auth_url, body: body, strictSSL: true, json: true}, function(error, response, body) {
        if(error) return callback(error)
        if(response.statusCode !== 200 || !body.result) return callback(new Error(op.get(body, 'error', body)))

        var user = {}
        user.id = op.get(body, 'result.user.id', null)
        user.token = op.get(body, 'result.user.session_key', null)

        callback(null, user)
    })
}



//Set user
exports.set_user = function(auth_id, auth_token, data, callback) {

    property = 'person-' + op.get(data, 'property')
    var body = {}
    body[op.get(data, 'id') ? property + '.' + op.get(data, 'id') : property] = op.get(data, 'value', '')

    request.put({url: APP_ENTU_URL + '/entity-' + auth_id, headers: {'X-Auth-UserId': auth_id, 'X-Auth-Token': auth_token}, body: body, strictSSL: true, json: true}, function(error, response, body) {
        if(error) return callback(error)
        if(response.statusCode !== 201 || !body.result) return callback(new Error(op.get(body, 'error', body)))

        var new_property = op.get(body, 'result.properties.' + property + '.0', null)

        callback(null, new_property)
    })

}
