import * as AWS from 'aws-sdk';

const VALIDATION_RECORD_TYPE = 'CNAME';
const VALIDATION_METHOD = 'DNS';
const VALIDATION_TTL = 300;

type Route53Props = {
	HostedZoneId: string
};

type ACMProps = {
	DomainName: string,
	ValidationMethod: string,
	SubjectAlternativeNames: string[]
};

type ResourceProperties = {
	AutoValidate: boolean,
	Route53: Route53Props,
	ACM: ACMProps
};

type RequestParams = {
	acm: AWS.ACM,
	route53: AWS.Route53,
	props: ResourceProperties,
	oldProps: ResourceProperties,
	domains: string[]
};

type Event = {
	ResourceProperties?: ResourceProperties,
	OldResourceProperties?: ResourceProperties,
	PhysicalResourceId?: AWS.ACM.Arn,
	RequestType: string
}

/**
 * Generates RegExp matching domain's validaton DNS records added by ACM.
 */
const getAcmValidationRegExp = (domain: string):RegExp => {
	return new RegExp(`^_(?!amazon)[^.]{32,}\.${domain.replace(/\./g,'\.')}.$`);
};

/**
 * Retrieves validation DNS records for certificate.
 */
const getDnsResourceRecords = (acm:any, domains:any, certificateArn: AWS.ACM.Arn):Promise<AWS.ACM.ResourceRecord[]> => {
	return acm.describeCertificate({
		CertificateArn: certificateArn
	}).promise()
		// Filter DomainValidationOption on validation method
		// and existence of ResourceRecord field
		.then((cert:any) => {
			return cert.Certificate.DomainValidationOptions.filter(
				(_:any) => _.ValidationMethod === VALIDATION_METHOD && _.ResourceRecord
			);
		})
		// Translate DomainValidationOption to ResourceRecords
		.then((domainValidationOptions:any) => domainValidationOptions.map(
			(_:any) => _.ResourceRecord
		))
		// Filter ResourceRecords on ACM validation records for our domains
		.then((resourceRecords:any) => resourceRecords.filter(
			(resourceRecord:any) => domains.some((domain:any) => {
				return getAcmValidationRegExp(domain).test(resourceRecord.Name);
			}) && resourceRecord.Type === VALIDATION_RECORD_TYPE
		))
		// Determine whether all ACM validation records are generated and
		// ready to be used in DNS or describe certificate again.
		.then((resourceRecords:any) => {
			if(resourceRecords.length < domains.length){
				return getDnsResourceRecords(acm, domains, certificateArn);
			} else {
				return resourceRecords;
			}
		});
};

export const AcmCertificate = {
	/**
	 * Creates new instance of ACMCertificate
	 */
	create: (event: Event, context:any) => {
		// Handler for CloudFormation Create Request.
		const create = (params: RequestParams) => () => {
			const acm = params.acm;
			const route53 = params.route53;
			const props = params.props;
			const acmProps = props.ACM;
			const route53Props = props.Route53;
			const domains = params.domains;

			// Request certificate
			return acm.requestCertificate(acmProps).promise()
				.then(certificate => {
					const result = {
						PhysicalResourceId: certificate.CertificateArn,
						CertificateArn: certificate.CertificateArn
					};

					// When auto validate is enabled we set validation DNS
					// records here.
					if(props.AutoValidate){
						return getDnsResourceRecords(acm, domains, certificate.CertificateArn)
						.then(resourceRecords => {
							console.log('resourceRecords',resourceRecords);
							
							return Promise.all(resourceRecords.map(resourceRecord => {
								// Insert or Update resource record
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

		// Handler for CloudFormation Remove Request.
		// TODO: Remove validation DNS records
		const remove = (params:RequestParams) => () => {
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
					console.log('resourceRecords',resourceRecords);
								
					return Promise.all(resourceRecords.map(resourceRecord => {
						// Insert or Update resource record
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

		// The 'wait' function and the regular custom resource function.
		// Being used by recursive Lambda functions module 'aws-cfn-await'.
		return Promise.resolve({
			/**
			 * Checks whether we should wait for response or not.
			 */
			wait: (result: {
				CertificateArn: AWS.ACM.Arn,
				PhysicalResourceId: string
			}) => {
				const acm = new AWS.ACM();

				// Request Type DELETE
				if(event.RequestType === "Delete"){
					console.log('WaitForCertRemoved');
					console.log('CertificateArn:', result.CertificateArn);

					return acm.deleteCertificate({
						CertificateArn: result.CertificateArn
					}).promise()
					.then(_ => {
						console.log('Certificate successfully removed');
						return { shouldWait: false };
					})
					.catch(() => ({ shouldWait: true }))
				} 
				// Request Type CREATE / UPDATE
				else {
					console.log('WaitForCertVerified');
					console.log('CertificateArn:', result.CertificateArn);
					
					return acm.describeCertificate({
						CertificateArn: result.CertificateArn
					})
					.promise()
					.then(_ => {
						console.log('Certificate Status:', _.Certificate.Status);

						if(_.Certificate.Status === 'PENDING_VALIDATION'){
							return {
								shouldWait: true,
								status: _.Certificate.Status,
								context: _
							};
						} else {
							// If error
							if(_.Certificate.Status !== 'ISSUED'){
								return {
									shouldWait: false,
									status: _.Certificate.Status,
									context: _,
									error: {
										code: _.Certificate.Status
									}
								};
							} else {
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

			// Regular Custom Resource logic
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