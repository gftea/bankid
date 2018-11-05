const passport = require("passport-strategy"),
  util = require("util"),
  opn = require("opn");

let request = require("request-promise-native");

function Strategy(options, verify) {
  if (typeof options == "function") {
    verify = options;
    options = {};
  }
  if (!verify) {
    throw new TypeError("BankIDStrategy requires a verify callback");
  }

  passport.Strategy.call(this);
  this.name = "bankid";
  this._verify = verify;
  this._ca = options.ca;
  this._pfx = options.pfx;
  this._passphrase = options.passphrase;
}

util.inherits(Strategy, passport.Strategy);

Strategy.prototype.authenticate = function(req, options) {
  options = options || {};

  if (!req.body.endUserIp) return this.error("missing end user IP address!");

  let self = this;

  function verified(err, user, info) {
    if (err) return self.error(err);
    if (!user) return self.fail(info);
    self.success(user, info);
  }

  request = request.defaults({
    baseUrl: "https://appapi2.test.bankid.com/rp/v5",
    method: "POST",
    json: true,
    ca: this._ca,
    pfx: this._pfx,
    passphrase: this._passphrase
  });

  request({ uri: "/auth", body: { endUserIp: req.body.endUserIp } })
    .then(res => {
      if (!res["autoStartToken"])
        return self.fail("invalid request to BankID service");

      const bankIdUrl = `bankid:///?autostarttoken=${
        res.autoStartToken
      }&redirect=null`;

      // simulate lauching bankid app
      opn(bankIdUrl, { wait: false });

      let timer = setInterval(() => {
        request({ uri: "/collect", body: { orderRef: res.orderRef } }).then(
          res => {
            if (res.status === "failed") {
              clearInterval(timer);
              //console.log("failed:", res);
              return self.fail("failed to authentincate to BankID service");
            }
            if (res.status === "complete") {
              clearInterval(timer);
              //console.log("complete:", res);
              this._verify(res.completionData.user, verified);
            }
          }
        );
      }, 2000);
    })
    .catch(err => self.error(err));
};

module.exports = Strategy;
