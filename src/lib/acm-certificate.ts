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
}

const getAcmValidationRegExp = (domain: string):RegExp => {
	return new RegExp(`^_(?!amazon)[^.]{32,}\.${domain.replace(/\./g,'\.')}.$`);
};

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
	create: (event: Event, context:any) => {
		const create = (params: RequestParams) => () => {
			const acm = params.acm;
			const route53 = params.route53;
			const props = params.props;
			const acmProps = props.ACM;
			const route53Props = props.Route53;
			const domains = params.domains;

			return acm.requestCertificate(acmProps).promise()
				.then(certificate => {
					if(props.AutoValidate){
						return getDnsResourceRecords(acm, domains, certificate.CertificateArn)
							.then(resourceRecords => {
								console.log('resourceRecords',resourceRecords);
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
							.then(() => ({
								PhysicalResourceId: certificate.CertificateArn,
								CertificateArn: certificate.CertificateArn
							}));
					}

					return {
						PhysicalResourceId: certificate.CertificateArn,
						CertificateArn: certificate.CertificateArn
					};
				});
		};

		const remove = (params:RequestParams) => () => {
			const acm = params.acm;
			const retryDelay = 15000;
			const startTime = new Date().getTime();

			const tryRemove = (delay:number=0) => {
				const currentTime = new Date().getTime();

				console.log('Trying to remove certificate, it may still be in use...');
				
				return new Promise((resolve, reject) => {
					if(currentTime - startTime > retryDelay * 16){ // 4 minutes timeout
						reject('Removing certificate timed out')
						return;
					}

					try{
						setTimeout(() => {
							resolve(
								acm.deleteCertificate({
									CertificateArn: event.PhysicalResourceId
								}).promise()
								.then(_ => {
									console.log('Certificate successfully removed');
								})
								.catch(() => tryRemove(retryDelay))
							);
						},delay);
					} catch(e) {
						reject(e);
					}
				})
			}

			return tryRemove();
		};

		const getMethods = () => {
			return {
				wait: (result: {
					CertificateArn: AWS.ACM.Arn,
					PhysicalResourceId: string
				}) => {
					console.log('WaitForCertVerified');
					console.log('CertificateArn:', result.CertificateArn);

					const acm = new AWS.ACM();
					return acm.describeCertificate({
						CertificateArn: result.CertificateArn
					}).promise()
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
			};
		};

		return Promise.resolve(getMethods());
	}
};