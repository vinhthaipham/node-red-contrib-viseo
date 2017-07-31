const request = require('request');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.key = RED.nodes.getNode(config.key);
        
        start(RED, node, config);
        this.on('input', (data)  => { input(node, data, config)  });
        this.on('close', (done)  => { stop(done) });
    }
    RED.nodes.registerType("trello-in", register, {});

    // Register for button callback
    RED.httpAdmin.post("/trello-in/:id", RED.auth.needsPermission("trello-in.write"), function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            try {
                node.receive();
                res.sendStatus(200);
            } catch(err) {
                res.sendStatus(500);
                node.error(RED._("inject.failed",{error:err.toString()}));
            }
        } else { res.sendStatus(404); }
    });
}

const route = (node) => {
    return (req, res, next) => { node.send({'payload' : req.body}); }
}

const stop  = (done) => { done(); }
const start = (RED, node, config) => {
    RED.httpNode.get ('/trello-callback/'+config.model+'/', route(node));
    RED.httpNode.post('/trello-callback/'+config.model+'/', route(node));
}

const input = (node, data, config) => {
    let url  = 'https://api.trello.com/1/tokens/'+node.key.token+'/webhooks/?key='+node.key.key; 
    let json = {
        description: "Trello Webhook " + (config.name || node.id),
        callbackURL: CONFIG.server.host + 'trello-callback/'+config.model+'/',
        idModel: config.model,
    }
    let req  = {
        url: url,
        method: 'POST',
        headers: {'ContentType': 'application/json'},
        body: JSON.stringify(json)
    };

    console.log(req);
    let n = node;
    request(req, (err, response, body) => {
        if (err) { return n.error(err); }
        n.warn(body);
    });
}

