"use strict";

var contractAddress = "n1jFFpgMsLXSEBhSAvo9JgL1M19QT3rLqyN";

var nebulas = require("nebulas"),
    Account = nebulas.Account,
    Utils = nebulas.Utils,
    neb = new nebulas.Neb();
// https://github.com/nebulasio/nebPay
// var NebPay = require("./lib/nebpay.js"), nebPay = new NebPay();
neb.setRequest(new nebulas.HttpRequest("https://testnet.nebulas.io"));

var globalParams = {
    chainId: 1001,
    account: ''
};
var g_params = {
    from: 'n1Vy87bKQk8eFzpQvdXDZJxwvyBgAyV3kya',
    to: contractAddress,
    value: nebulas.Unit.toBasic(Utils.toBigNumber(0), "nas"),
    gasPrice: Utils.toBigNumber(1000000),
    gasLimit: Utils.toBigNumber(200000),
    contract: {}
};

var fromGParam = function() {
    var ret = {};
    ret.from = g_params.from;ret.to = g_params.to;
    ret.value = g_params.value;ret.gasLimit = g_params.gasLimit;
    ret.gasPrice = g_params.gasPrice;
    return ret;
}

var g_filejson = {"version":4,"id":"330eb78f-02d9-44ba-8b25-3c3412eeac5f","address":"n1Vy87bKQk8eFzpQvdXDZJxwvyBgAyV3kya","crypto":{"ciphertext":"05fc1483b39b37f86f6ef46cc14025f6780ea9692241eddc90ed8f50201425ec","cipherparams":{"iv":"eceb179376509c6f5ba1961e2540b230"},"cipher":"aes-128-ctr","kdf":"scrypt","kdfparams":{"dklen":32,"salt":"788bb3c94c2db544d9169ee4bfab0ac18927ca8ff6b58c6b54664770f20c7a51","n":4096,"r":8,"p":1},"mac":"0f5ce8f02a8da4d48c70e2b029888955fd3569b5e5aec08bf97fd1fad7c16bfd","machash":"sha3256"}};
var g_account = Account.fromAddress(g_filejson.address);

var callContract = function(params) {
    neb.api.getAccountState(params.from).then(function (resp) {
        params.nonce = parseInt(resp.nonce) + 1;
        var gTx = new nebulas.Transaction(globalParams.chainId,
        globalParams.account,params.to, params.value, params.nonce, params.gasPrice, params.gasLimit, params.contract);

        gTx.signTransaction();
        var rawTx = gTx.toProtoString();

        neb.api.sendRawTransaction(rawTx).then(function (resp) {
            console.log(JSON.stringify(resp));
        })
        .catch(function (err) {
            console.log(err);
        });
    });
};

var onUnlockFile = function(fileJson, account, password, callback) {
    try {
        var balance_nas, state,
        fromAddr = account.getAddressString();
        account.fromKey(fileJson, password);
        globalParams.account = account;

        neb.api.gasPrice()
            .then(function (resp) {
                console.log(resp);
                return neb.api.getAccountState(fromAddr);
            })
            .then(function (resp) {
                console.log(resp);
                var balance = nebulas.Unit.fromBasic(resp.balance, "nas");
                return balance;
            })
            .then(function(balance) {
                callback();
            })
            .catch(function (e) {
                console.log(e.message);
            });
    } catch (e) {
        console.log("文件错误或者密码错误!");
    }
};

var httpserver = require("nodejs_http_server");
var querystring = require("querystring");
var handle = httpserver.handle;

var bzHandle = {
    createGame: function(arg) {
        var funcArgs = [arg.id, arg.start, arg.end];
        var contract = {function: "createGame", args: JSON.stringify(funcArgs)};
        var params = fromGParam();
        params.contract = contract;
        params.to = arg.to || params.to;
        callContract(params);
    },
    gameStart: function(arg) {
        var funcArgs = [arg.id, arg.index];
        var contract = {function: "gameStart", args: JSON.stringify(funcArgs)};
        var params = fromGParam();
        params.to = arg.to || params.to;
        params.contract = contract;
        callContract(params);

    },
    gameEnd: function(arg) {
        var funcArgs = [arg.id, arg.index];
        var contract = {function: "gameEnd", args: JSON.stringify(funcArgs)};
        var params = fromGParam();
        params.to = arg.to || params.to;
        params.contract = contract;
        callContract(params);
    },
    balanceOf: function(arg) {
        var contract = {function: "balanceOf", args: ""};
        var params = fromGParam();
        params.to = arg.to || params.to;
        params.contract = contract;
        callContract(params);
    },
    createRewardInfo: function(arg) {
        var funcArgs = [arg.from,arg.value, arg.type,arg.desc];
        var contract = {function: "createRewardInfo", args: JSON.stringify(funcArgs)};
        var params = fromGParam();
        params.to = arg.to || params.to;
        params.contract = contract;
        callContract(params);
    }
};

handle["/callFunc"] = function (query, response) {
    console.log("query: " + query); 
    var queryObj = querystring.parse(query); 
    var func = queryObj["func"];
    var arg = queryObj["arg"];

    var text = "success";
    try {
        arg = JSON.parse(arg);
        bzHandle[func](arg);
    } catch(e) {
        text = e.message;
    }
    console.log(text); 
    response.writeHead(200, {"Content-Type": "text/plain"}); 
    response.write(text); 
    response.end(); 
};

var startHttpServer = function() {
    httpserver.server.start(httpserver.router.route, handle, 8888);
}

onUnlockFile(g_filejson, g_account, "321321321", startHttpServer);
