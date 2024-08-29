import { NestedStack, NestedStackProps } from "aws-cdk-lib";
import { Construct } from "constructs";


export class BeanstalkStack extends NestedStack {
    constructor(scope: Construct, id: string, props?: NestedStackProps) {
        super(scope, id, props);
    }
}