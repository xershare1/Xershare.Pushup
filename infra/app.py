#!/usr/bin/env python3
import os

from aws_cdk import App, Environment

from stacks.dev_stack import DevStack
from stacks.prod_stack import ProdStack

app = App()

env = Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "us-east-2"),
)

DevStack(app, "PushupApiDev", env=env)
ProdStack(app, "PushupApiProd", env=env)

app.synth()
