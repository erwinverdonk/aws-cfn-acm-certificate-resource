!function(e,t){for(var o in t)e[o]=t[o]}(exports,function(e){var t={};function o(r){if(t[r])return t[r].exports;var s=t[r]={i:r,l:!1,exports:{}};return e[r].call(s.exports,s,s.exports,o),s.l=!0,s.exports}return o.m=e,o.c=t,o.d=function(e,t,r){o.o(e,t)||Object.defineProperty(e,t,{configurable:!1,enumerable:!0,get:r})},o.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},o.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return o.d(t,"a",t),t},o.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},o.p="",o.w={},o(o.s=5)}([function(e,t){e.exports=require("aws-sdk")},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});const r=o(0),s=(e,t,o)=>e.describeCertificate({CertificateArn:o}).promise().then(e=>e.Certificate.DomainValidationOptions.filter(e=>"DNS"===e.ValidationMethod&&e.ResourceRecord)).then(e=>e.map(e=>e.ResourceRecord)).then(e=>e.filter(e=>t.some(t=>(e=>new RegExp(`^_(?!amazon)[^.]{32,}.${e.replace(/\./g,".")}.$`))(t).test(e.Name))&&"CNAME"===e.Type)).then(r=>r.length<t.length?s(e,t,o):r);t.AcmCertificate={create:(e,t)=>{const o=e=>()=>{const t=e.acm,o=e.route53,r=e.props,i=r.ACM,n=r.Route53,c=e.domains;return t.requestCertificate(i).promise().then(e=>r.AutoValidate?s(t,c,e.CertificateArn).then(e=>(console.log("resourceRecords",e),Promise.all(e.map(e=>o.changeResourceRecordSets({HostedZoneId:n.HostedZoneId,ChangeBatch:{Changes:[{Action:"UPSERT",ResourceRecordSet:{Name:e.Name,Type:"CNAME",ResourceRecords:[{Value:e.Value}],TTL:300}}]}}).promise())))).then(()=>({PhysicalResourceId:e.CertificateArn,CertificateArn:e.CertificateArn})):{PhysicalResourceId:e.CertificateArn,CertificateArn:e.CertificateArn})};return Promise.resolve((()=>({wait:e=>(console.log("WaitForCertVerified"),console.log("CertificateArn:",e.CertificateArn),(new r.ACM).describeCertificate({CertificateArn:e.CertificateArn}).promise().then(t=>(console.log("Certificate Status:",t.Certificate.Status),"PENDING_VALIDATION"===t.Certificate.Status?{shouldWait:!0,status:t.Certificate.Status,context:t}:"ISSUED"!==t.Certificate.Status?{shouldWait:!1,status:t.Certificate.Status,context:t,error:{code:t.Certificate.Status}}:{shouldWait:!1,status:t.Certificate.Status,context:t,result:e})).catch(e=>({shouldWait:!1,error:e}))),customResource:()=>{const t=e.ResourceProperties,s=e.OldResourceProperties,i=new r.ACM,n=new r.Route53,c={domains:[t.ACM.DomainName].concat(t.ACM.SubjectAlternativeNames||[]),acm:i,route53:n,props:t,oldProps:s};return Promise.resolve({create:o(c),update:o(c),delete:(t=>()=>{const o=t.acm,r=(new Date).getTime(),s=(t=0)=>{const i=(new Date).getTime();return console.log("Trying to remove certificate, it may still be in use..."),new Promise((n,c)=>{if(i-r>24e4)c("Removing certificate timed out");else try{setTimeout(()=>{n(o.deleteCertificate({CertificateArn:e.PhysicalResourceId}).promise().then(e=>{console.log("Certificate successfully removed")}).catch(()=>s(15e3)))},t)}catch(e){c(e)}})};return s()})(c)})}}))())}}},function(e,t){e.exports=require("url")},function(e,t){e.exports=require("https")},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});const r=o(3),s=o(2),i=o(0);t.AwsCfnWait={create:({CustomResource:e,waitDelay:t=6e4,event:o,context:n,callback:c})=>{(o=>{const a=(e,t,s)=>(i,n)=>{console.log("Finish"),t.PhysicalResourceId=Object.assign({},n).PhysicalResourceId||o.PhysicalResourceId||o.RequestId,t.Data=i||n,t.Status=i?"FAILED":"SUCCESS";const c=JSON.stringify(t);e.headers["content-length"]=c.length.toString(),console.log("HTTPS Response Request - Options",JSON.stringify(e)),console.log("HTTPS Response Request - ResponseBody",c);const a=r.request(e,e=>e.on("data",e=>s(null,e)));a.on("error",e=>s(e,null)),a.write(c),a.end()},l=(e,r)=>s=>(s&&console.log("success",JSON.stringify(s)),"Delete"===o.RequestType?e.finish():r.wait(s).then(r=>new Promise((c,a)=>{console.log("Wait result:",JSON.stringify(r)),r.shouldWait?(console.log("We are not yet done waiting, lets wait some more..."),console.log(`Rechecking status in ${t} milliseconds`),setTimeout(()=>{const t=e.httpsRequest,r=Math.ceil((new Date).getTime()/1e3);parseInt(t.options.path.match(/(?<=&Expires=)\d+(?=&)/)[0],16)<=r+300?a({canFinish:!0,error:{message:"Response URL has expired. Waiting canceled!"}}):(new i.Lambda).invoke({FunctionName:n.invokedFunctionArn,InvocationType:"Event",Payload:JSON.stringify({ResourceProperties:o.ResourceProperties,WaitProperties:o.WaitProperties||{responseData:s,httpsRequest:t}})}).promise().then(e=>c({canFinish:!1,result:e})).catch(e=>a({canFinish:!0,error:e}))},t)):c({canFinish:!0,result:r.result})})).then(t=>{t.canFinish?e.finish(null,t.result):e.callback(null,t.result)}).catch(t=>{t.canFinish?e.finish(t.error,null):e.callback(t.error,null)})),u=(e=>{if(o.WaitProperties){const t=o.WaitProperties.httpsRequest,r=t.options,s=t.responseBody;return{callback:e,finish:a(r,s,e),httpsRequest:{options:r,responseBody:s}}}{const t=s.parse(o.ResponseURL),r={Status:void 0,Reason:`See the details in CloudWatch Log Stream: ${n.logStreamName}`,PhysicalResourceId:void 0,StackId:o.StackId,RequestId:o.RequestId,LogicalResourceId:o.LogicalResourceId,Data:void 0},i={hostname:t.hostname,port:443,path:t.path,method:"PUT",headers:{"content-type":"","content-length":void 0}};return{callback:e,finish:a(i,r,e),httpsRequest:{options:i,responseBody:r}}}})((e,t)=>{t&&console.log("success",JSON.stringify(t)),e&&console.log("error",JSON.stringify(e)),c(e,t)});console.log("event",JSON.stringify(o)),console.log("context",JSON.stringify(n)),e.create(o,n).then(e=>{o.WaitProperties?l(u,e)(o.WaitProperties.responseData):e.customResource().then(e=>e[o.RequestType.toLowerCase()]).then(t=>t().then(l(u,e)).catch((e=>t=>{console.error("failed",JSON.stringify(t,Object.getOwnPropertyNames(t))),e.callback({error:t},null)})(u)))})})("string"==typeof o?JSON.parse(o):o)}}},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});const r=o(4),s=o(1);t.handler=((e,t,o)=>{r.AwsCfnWait.create({CustomResource:s.AcmCertificate,event:e,context:t,callback:o})})}]));