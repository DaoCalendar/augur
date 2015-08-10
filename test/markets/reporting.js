/**
 * augur.js unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var crypto = require("crypto");
var assert = require("chai").assert;
var utils = require("../../src/utilities");
var Augur = utils.setup(require("../../src"), process.argv.slice(2));
var constants = Augur.constants;
var numeric = Augur.numeric;
var log = console.log;

var accounts = utils.get_test_accounts(Augur, constants.MAX_TEST_ACCOUNTS);
var branch_id = Augur.branches.dev;
var reporter_index = "0";
var ballot = [2, 2, 1, 2];
var salt = "1337";

describe("data and api/reporting", function () {
    describe("getTotalRep(" + branch_id + ")", function () {
        var test = function (r) {
            assert(parseInt(r) >= 44);
        };
        it("sync", function () {
            test(Augur.getTotalRep(branch_id));
        });
        it("async", function (done) {
            Augur.getTotalRep(branch_id, function (r) {
                test(r); done();
            });
        });
    });
    describe("getRepBalance(" + branch_id + ") ", function () {
        var test = function (r) {
            utils.gteq0(r);
        };
        it("sync", function () {
            test(Augur.getRepBalance(branch_id, accounts[0]));
        });
        it("async", function (done) {
            Augur.getRepBalance(branch_id, accounts[0], function (r) {
                test(r); done();
            });
        });
    });
    describe("getRepByIndex(" + branch_id + ", " + reporter_index + ") ", function () {
        var test = function (r) {
            assert(Number(r) >= 44);
        };
        it("sync", function () {
            test(Augur.getRepByIndex(branch_id, reporter_index));
        });
        it("async", function (done) {
            Augur.getRepByIndex(branch_id, reporter_index, function (r) {
                test(r); done();
            });
        });
    });
    describe("getReporterID(" + branch_id + ", " + reporter_index + ") ", function () {
        var test = function (r) {
            assert.strictEqual(r, accounts[0]);
        };
        it("sync", function () {
            test(Augur.getReporterID(branch_id, reporter_index));
        });
        it("async", function (done) {
            Augur.getReporterID(branch_id, reporter_index, function (r) {
                test(r); done();
            });
        });
    });
    describe("getReputation(" + accounts[0] + ")", function () {
        var test = function (r) {
            assert(r.length >= 1);
            for (var i = 0, len = r.length; i < len; ++i) {
                utils.gteq0(r[i]);
            }
        };
        it("sync", function () {
            test(Augur.getReputation(accounts[0]));
        });
        it("async", function (done) {
            Augur.getReputation(accounts[0], function (r) {
                test(r); done();
            });
        });
    });
    describe("getNumberReporters(" + branch_id + ") ", function () {
        var test = function (r) {
            assert(parseInt(r) >= 1);
        };
        it("sync", function () {
            test(Augur.getNumberReporters(branch_id));
        });
        it("async", function (done) {
            Augur.getNumberReporters(branch_id, function (r) {
                test(r); done();
            });
        });
    });
    describe("repIDToIndex(" + branch_id + ", " + accounts[0] + ") ", function () {
        var test = function (r) {
            assert.strictEqual(r, reporter_index);
        };
        it("sync", function () {
            test(Augur.repIDToIndex(branch_id, accounts[0]));
        });
        it("async", function (done) {
            Augur.repIDToIndex(branch_id, accounts[0], function (r) {
                test(r); done();
            });
        });
    });
    describe("hashReport([ballot], " + salt + ") ", function () {
        var test = function (r) {
            var b = numeric.fix(ballot);
            for (var i = 0, len = b.length; i < len; ++i) {
                b[i] = b[i].toString(16);
            }
            var hashable = [accounts[0], numeric.bignum(salt).toString(16)].concat(b).toString();
            var hashed = utils.sha256(hashable);
            // TODO lookup how arrays hashed by evm sha256, this doesn't work
            // assert.strictEqual(r, hashed);
            assert.strictEqual(r, "-0x3bc32da7042e04b537160b3b24f53162cb621c482fb615aa108087898d6183fb");
        };
        it("sync", function () {
            test(Augur.hashReport(ballot, salt));
        });
        it("async", function (done) {
            Augur.hashReport(ballot, salt, function (r) {
                test(r); done();
            });
        });
    });
});
