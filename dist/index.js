(function(e, a) { for(var i in a) e[i] = a[i]; }(exports, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading wasm modules
/******/ 	var installedWasmModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// object with all compiled WebAssembly.Modules
/******/ 	__webpack_require__.w = {};
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const aws_cfn_wait_1 = __webpack_require__(1);
const acm_certificate_1 = __webpack_require__(9);
exports.handler = (event, context, callback) => {
    aws_cfn_wait_1.AwsCfnWait.create({ CustomResource: acm_certificate_1.AcmCertificate, event, context, callback })
        .catch(_ => {
        console.error(_);
        callback(_, null);
        process.exit();
    });
};


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTPS = __webpack_require__(2);
const URL = __webpack_require__(3);
const AWS = __webpack_require__(4);
const uuid = __webpack_require__(5);
exports.AwsCfnWait = {
    create: ({ CustomResource, waitDelay = 60000, event, context, callback }) => {
        const init = (event) => __awaiter(this, void 0, void 0, function* () {
            const finish = (options, responseBody, callback) => (error, data) => {
                console.log('Finish');
                responseBody.PhysicalResourceId = (Object.assign({}, data).PhysicalResourceId ||
                    event.PhysicalResourceId ||
                    event.RequestId ||
                    responseBody.RequestId ||
                    uuid());
                responseBody.Data = error || data;
                responseBody.Status = error ? 'FAILED' : 'SUCCESS';
                const responseBodyStr = JSON.stringify(responseBody);
                options.headers['content-length'] = responseBodyStr.length.toString();
                console.log('HTTPS Response Request - Options', JSON.stringify(options));
                console.log('HTTPS Response Request - ResponseBody', responseBodyStr);
                const request = HTTPS.request(options, _ => _.on('data', _ => callback(null, _)));
                request.on('error', _ => callback(_, null));
                request.write(responseBodyStr);
                request.end();
                return responseBody;
            };
            const getResponseReceiver = (callback) => {
                if (!event.WaitProperties) {
                    const parsedUrl = URL.parse(event.ResponseURL);
                    const responseBody = {
                        Status: undefined,
                        Reason: `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
                        PhysicalResourceId: undefined,
                        StackId: event.StackId,
                        RequestId: event.RequestId,
                        LogicalResourceId: event.LogicalResourceId,
                        Data: undefined
                    };
                    const options = {
                        hostname: parsedUrl.hostname,
                        port: 443,
                        path: parsedUrl.path,
                        method: 'PUT',
                        headers: {
                            'content-type': '',
                            'content-length': undefined
                        }
                    };
                    return {
                        callback,
                        finish: finish(options, responseBody, callback),
                        httpsRequest: {
                            options,
                            responseBody
                        }
                    };
                }
                else {
                    const httpsRequest = event.WaitProperties.httpsRequest;
                    const options = httpsRequest.options;
                    const responseBody = httpsRequest.responseBody;
                    return {
                        callback,
                        finish: finish(options, responseBody, callback),
                        httpsRequest: {
                            options,
                            responseBody
                        }
                    };
                }
            };
            const getResultHandler = (responseReceiver, customResource) => (result) => {
                if (result) {
                    console.log('success', JSON.stringify(result));
                }
                customResource.wait(result)
                    .then(waitResult => {
                    return new Promise((resolve, reject) => {
                        console.log('Wait result:', JSON.stringify(waitResult));
                        if (waitResult.shouldWait) {
                            console.log('We are not yet done waiting, lets wait some more...');
                            console.log(`Rechecking status in ${waitDelay} milliseconds`);
                            setTimeout(() => {
                                const httpsRequest = responseReceiver.httpsRequest;
                                const currentEpoch = Math.ceil(new Date().getTime() / 1000);
                                const responseUrlExpires = parseInt(httpsRequest.options.path.match(/(?<=&Expires=)\d+(?=&)/)[0], 16);
                                const hasExpired = responseUrlExpires <= currentEpoch + 300;
                                if (!hasExpired) {
                                    const lambda = new AWS.Lambda();
                                    lambda.invoke({
                                        FunctionName: context.invokedFunctionArn,
                                        InvocationType: 'Event',
                                        Payload: JSON.stringify({
                                            RequestType: event.RequestType,
                                            ResourceProperties: event.ResourceProperties,
                                            WaitProperties: event.WaitProperties || {
                                                responseData: result,
                                                httpsRequest
                                            }
                                        })
                                    })
                                        .promise()
                                        .then(_ => resolve({ canFinish: false, result: _ }))
                                        .catch(_ => reject(_));
                                }
                                else {
                                    reject({
                                        message: 'Response URL has expired. Waiting canceled!'
                                    });
                                }
                            }, waitDelay);
                        }
                        else {
                            resolve({ canFinish: true, result: waitResult.result });
                        }
                    });
                })
                    .then(_ => {
                    if (_.canFinish) {
                        responseReceiver.finish(null, _.result);
                    }
                    else {
                        responseReceiver.callback(null, _.result);
                    }
                })
                    .catch(_ => {
                    responseReceiver.finish(_, null);
                });
                return result;
            };
            const getErrorHandler = (responseReceiver) => (_) => {
                console.error('failed', JSON.stringify(_, Object.getOwnPropertyNames(_)));
                responseReceiver.finish({ error: _ }, null);
                return _;
            };
            const responseReceiver = getResponseReceiver((error, result) => {
                if (result) {
                    console.log('success', JSON.stringify(result));
                }
                if (error) {
                    console.log('error', JSON.stringify(error));
                }
                callback(error, result);
            });
            console.log('event', JSON.stringify(event));
            console.log('context', JSON.stringify(context));
            const cr = yield CustomResource.create(event, context);
            const resultHandler = getResultHandler(responseReceiver, cr);
            const errorHandler = getErrorHandler(responseReceiver);
            if (!event.WaitProperties) {
                return cr.customResource()
                    .then(requestMethods => requestMethods[event.RequestType.toLowerCase()])
                    .then(requestMethod => requestMethod())
                    .then(resultHandler)
                    .catch(errorHandler);
            }
            else {
                resultHandler(event.WaitProperties.responseData);
                return Promise.resolve(event.WaitProperties.responseData);
            }
        });
        return init(typeof event === 'string' ? JSON.parse(event) : event);
    }
};


/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("https");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("url");

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("aws-sdk");

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

var rng = __webpack_require__(6);
var bytesToUuid = __webpack_require__(8);

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

// Unique ID creation requires a high quality random # generator.  In node.js
// this is pretty straight-forward - we use the crypto API.

var crypto = __webpack_require__(7);

module.exports = function nodeRNG() {
  return crypto.randomBytes(16);
};


/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = require("crypto");

/***/ }),
/* 8 */
/***/ (function(module, exports) {

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const AWS = __webpack_require__(4);
const VALIDATION_RECORD_TYPE = 'CNAME';
const VALIDATION_METHOD = 'DNS';
const VALIDATION_TTL = 300;
const getAcmValidationRegExp = (domain) => {
    return new RegExp(`^_(?!amazon)[^.]{32,}\.${domain.replace(/\./g, '\.')}.$`);
};
const getDnsResourceRecords = (acm, domains, certificateArn) => {
    return acm.describeCertificate({
        CertificateArn: certificateArn
    }).promise()
        .then((cert) => {
        return cert.Certificate.DomainValidationOptions.filter((_) => _.ValidationMethod === VALIDATION_METHOD && _.ResourceRecord);
    })
        .then((domainValidationOptions) => domainValidationOptions.map((_) => _.ResourceRecord))
        .then((resourceRecords) => resourceRecords.filter((resourceRecord) => domains.some((domain) => {
        return getAcmValidationRegExp(domain).test(resourceRecord.Name);
    }) && resourceRecord.Type === VALIDATION_RECORD_TYPE))
        .then((resourceRecords) => {
        if (resourceRecords.length < domains.length) {
            return getDnsResourceRecords(acm, domains, certificateArn);
        }
        else {
            return resourceRecords;
        }
    });
};
exports.AcmCertificate = {
    create: (event, context) => {
        const create = (params) => () => {
            const acm = params.acm;
            const route53 = params.route53;
            const props = params.props;
            const acmProps = props.ACM;
            const route53Props = props.Route53;
            const domains = params.domains;
            return acm.requestCertificate(acmProps).promise()
                .then(certificate => {
                const result = {
                    PhysicalResourceId: certificate.CertificateArn,
                    CertificateArn: certificate.CertificateArn
                };
                if (props.AutoValidate) {
                    return getDnsResourceRecords(acm, domains, certificate.CertificateArn)
                        .then(resourceRecords => {
                        console.log('resourceRecords', resourceRecords);
                        return Promise.all(resourceRecords.map(resourceRecord => {
                            return route53.changeResourceRecordSets({
                                HostedZoneId: route53Props.HostedZoneId,
                                ChangeBatch: {
                                    Changes: [
                                        {
                                            Action: 'UPSERT',
                                            ResourceRecordSet: {
                                                Name: resourceRecord.Name,
                                                Type: VALIDATION_RECORD_TYPE,
                                                ResourceRecords: [
                                                    { Value: resourceRecord.Value }
                                                ],
                                                TTL: VALIDATION_TTL
                                            }
                                        }
                                    ]
                                }
                            }).promise();
                        }));
                    })
                        .then(() => result);
                }
                return result;
            });
        };
        const remove = (params) => () => {
            const acm = params.acm;
            const retryDelay = 15000;
            const startTime = new Date().getTime();
            const domains = params.domains;
            const route53 = params.route53;
            const props = params.props;
            const route53Props = props.Route53;
            return new Promise((resolve, reject) => {
                return getDnsResourceRecords(acm, domains, event.PhysicalResourceId)
                    .then(resourceRecords => {
                    console.log('resourceRecords', resourceRecords);
                    return Promise.all(resourceRecords.map(resourceRecord => {
                        return route53.changeResourceRecordSets({
                            HostedZoneId: route53Props.HostedZoneId,
                            ChangeBatch: {
                                Changes: [
                                    {
                                        Action: 'DELETE',
                                        ResourceRecordSet: {
                                            Name: resourceRecord.Name,
                                            Type: VALIDATION_RECORD_TYPE,
                                            ResourceRecords: [
                                                { Value: resourceRecord.Value }
                                            ],
                                            TTL: VALIDATION_TTL
                                        }
                                    }
                                ]
                            }
                        }).promise();
                    })).catch(reject);
                })
                    .then(_ => resolve())
                    .catch(reject);
            })
                .then(_ => ({
                PhysicalResourceId: event.PhysicalResourceId,
                CertificateArn: event.PhysicalResourceId
            }));
        };
        return Promise.resolve({
            wait: (result) => {
                const acm = new AWS.ACM();
                if (event.RequestType === "Delete") {
                    console.log('WaitForCertRemoved');
                    console.log('CertificateArn:', result.CertificateArn);
                    return acm.deleteCertificate({
                        CertificateArn: result.CertificateArn
                    }).promise()
                        .then(_ => {
                        console.log('Certificate successfully removed');
                        return { shouldWait: false };
                    })
                        .catch(() => ({ shouldWait: true }));
                }
                else {
                    console.log('WaitForCertVerified');
                    console.log('CertificateArn:', result.CertificateArn);
                    return acm.describeCertificate({
                        CertificateArn: result.CertificateArn
                    })
                        .promise()
                        .then(_ => {
                        console.log('Certificate Status:', _.Certificate.Status);
                        if (_.Certificate.Status === 'PENDING_VALIDATION') {
                            return {
                                shouldWait: true,
                                status: _.Certificate.Status,
                                context: _
                            };
                        }
                        else {
                            if (_.Certificate.Status !== 'ISSUED') {
                                return {
                                    shouldWait: false,
                                    status: _.Certificate.Status,
                                    context: _,
                                    error: {
                                        code: _.Certificate.Status
                                    }
                                };
                            }
                            else {
                                return {
                                    shouldWait: false,
                                    status: _.Certificate.Status,
                                    context: _,
                                    result
                                };
                            }
                        }
                    })
                        .catch(e => {
                        return {
                            shouldWait: false,
                            error: e
                        };
                    });
                }
            },
            customResource: () => {
                const props = event.ResourceProperties;
                const oldProps = event.OldResourceProperties;
                const acm = new AWS.ACM();
                const route53 = new AWS.Route53();
                const domains = [props.ACM.DomainName].concat(props.ACM.SubjectAlternativeNames || []);
                const params = {
                    domains,
                    acm,
                    route53,
                    props,
                    oldProps
                };
                return Promise.resolve({
                    create: create(params),
                    update: create(params),
                    delete: remove(params)
                });
            }
        });
    }
};


/***/ })
/******/ ])));