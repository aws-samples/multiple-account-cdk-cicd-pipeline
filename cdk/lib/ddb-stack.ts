import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";

import { AttributeType, TableV2 } from "aws-cdk-lib/aws-dynamodb";

export class DDBStack extends Stack {
  public readonly table: TableV2;
  
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const table = new TableV2(this, 'Table', {
      partitionKey: { name: 'Key', type: AttributeType.STRING },
    });

    this.table = table;
  }
}
