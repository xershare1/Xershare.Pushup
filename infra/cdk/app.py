#!/usr/bin/env python3
import os

from aws_cdk import App, Environment

from stacks.acm_stack import AcmStack
from stacks.app_stack import AppStack
from stacks.dev_stack import DevStack
from stacks.marketing_stack import MarketingStack
from stacks.prod_stack import ProdStack

app = App()

account = os.environ.get("CDK_DEFAULT_ACCOUNT")
region_us_east_1 = "us-east-1"
region_us_east_2 = os.environ.get("CDK_DEFAULT_REGION", "us-east-2")
env_us_east_1 = Environment(account=account, region=region_us_east_1)
env_us_east_2 = Environment(account=account, region=region_us_east_2)

AcmStack(app, "PushupProsAcm", env=env_us_east_1)

MarketingStack(
    app,
    "PushupProsMarketingDev",
    environment="dev",
    domain="dev.pushuppros.com",
    env=env_us_east_2,
)
MarketingStack(
    app,
    "PushupProsMarketingProd",
    environment="prod",
    domain="pushuppros.com",
    env=env_us_east_2,
)

AppStack(
    app,
    "PushupProsAppDev",
    environment="dev",
    domain="app.dev.pushuppros.com",
    env=env_us_east_2,
)
AppStack(
    app,
    "PushupProsAppProd",
    environment="prod",
    domain="app.pushuppros.com",
    env=env_us_east_2,
)

DevStack(app, "PushupApiDev", env=env_us_east_2)
ProdStack(app, "PushupApiProd", env=env_us_east_2)

app.synth()
