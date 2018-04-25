import { AwsCfnWait} from '@erwinverdonk/aws-cfn-wait';
import { AcmCertificate } from './lib/acm-certificate';

type Callback = (error?:any, result?:any) => void;

export const handler = (event:any, context:any, callback: Callback) => {
	AwsCfnWait.create({ CustomResource: AcmCertificate, event, context, callback })
};
